import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { CheckCircle2, X } from "lucide-react";
import { auth } from "../services/firebase";
import { loadCloudCareer, saveCloudCareer } from "../services/cloudCareer";
import { mergeCareers } from "../data/careerTransfer";

function explainError(error) {
  const messages = {
    "auth/operation-not-allowed": "Enable Email/Password in Firebase Console → Authentication → Sign-in method.",
    "auth/configuration-not-found": "Set up Firebase Authentication and enable Email/Password in the Firebase Console.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/email-already-in-use": "That email already has an account. Choose Sign in.",
    "auth/weak-password": "Choose a password with at least 6 characters.",
    "auth/network-request-failed": "Could not connect. Check your internet connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please wait before trying again.",
    "permission-denied": "Cloud access was denied. Check that the Firestore database and project rules are set up.",
    "unavailable": "The cloud database is unavailable. Your browser save is still available.",
  };
  return messages[error.code] || error.message || "Something went wrong. Please try again.";
}

export default function AccountPanel({ career, canLoad, onLoad, onClose }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => onAuthStateChanged(auth, account => {
    setUser(account);
    setChecking(false);
    if (account) setPassword("");
  }, failure => { setChecking(false); setError(explainError(failure)); }), []);

  async function perform(action) {
    setBusy(true);
    setError("");
    setMessage("");
    setSaved(false);
    try { await action(); }
    catch (failure) { setError(explainError(failure)); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay">
      <section className="setup-modal account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <button className="close-modal" onClick={onClose} aria-label="Close account" disabled={busy}><X size={20} /></button>
        <p className="eyebrow">THE DUGOUT · ACCOUNT</p>
        <h2 id="account-title">{user ? "Your account" : creating ? "Create account" : "Sign in"}</h2>
        {saved && <div className="save-confirmation" role="status" aria-live="polite">
          <CheckCircle2 size={24} aria-hidden="true" />
          <div><strong>Career saved successfully</strong><p>Your manager and {career.matches.length} completed match{career.matches.length === 1 ? "" : "es"} have been saved to Firebase.</p></div>
          <button type="button" className="secondary-button" onClick={onClose}>Done · return to game</button>
        </div>}
        {checking ? <p role="status">Checking sign-in...</p> : user ? <>
          <p className="account-email">Signed in as {user.email}</p>
          <p>Cloud saves are manual. Save before switching devices, then load your career on the other device.</p>
          <button className="primary-button" disabled={busy || !career.managerName.trim()} onClick={() => perform(async () => {
            await saveCloudCareer(user.uid, career);
            setSaved(true);
          })}>{saved ? "Saved to Firebase" : busy ? "Saving / connecting..." : "Save browser career to cloud"}</button>
          <button className="secondary-button" disabled={busy || !canLoad} onClick={() => perform(async () => {
            const cloud = await loadCloudCareer(user.uid);
            if (!cloud) { setMessage("No cloud career yet. Create your manager, then save this browser's career."); return; }
            const sameManager = !career.managerName || career.managerName === cloud.managerName;
            onLoad(sameManager ? mergeCareers(cloud, career) : cloud);
            setMessage("Cloud career loaded. A backup of your previous browser career was kept.");
          })}>Load cloud career</button>
          {!canLoad && <p>Finish your current match before loading another career.</p>}
          <button className="secondary-button" disabled={busy} onClick={() => perform(async () => {
            await signOut(auth);
            setMessage("Signed out. Your local career remains on this browser.");
          })}>Sign out</button>
        </> : <form onSubmit={event => {
          event.preventDefault();
          perform(async () => {
            const authenticate = creating ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
            await authenticate(auth, email.trim(), password);
            setPassword("");
            setMessage("Signed in. Choose whether to save this browser's career or load your cloud career.");
          });
        }}>
          <label htmlFor="account-email">Email</label>
          <input className="career-input" id="account-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
          <label htmlFor="account-password">Password</label>
          <input className="career-input" id="account-password" type="password" autoComplete={creating ? "new-password" : "current-password"} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
          <button className="primary-button" type="submit" disabled={busy}>{creating ? "Create account" : "Sign in"}</button>
          <button className="secondary-button" type="button" disabled={busy} onClick={() => { setCreating(!creating); setError(""); }}>{creating ? "Already have an account? Sign in" : "New here? Create account"}</button>
        </form>}
        {busy && <p role="status">Connecting to Firebase...</p>}
        {error && <p className="csv-error" role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <p className="welcome-note">Your account and your manager are separate. Signing in does not change your manager profile. Cloud saves currently include your manager and completed matches; squad selections stay in this session.</p>
      </section>
    </div>
  );
}
