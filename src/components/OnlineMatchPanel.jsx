import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { buildOpponent, datasetTeams } from "../data/fantasyTeams";
import { createOnlineRoom, joinOnlineRoom, readOnlineRoom } from "../services/onlineMatches";

export default function OnlineMatchPanel({ open, onClose, onRoomReady, uid, managerName, players, clubs }) {
  const [typedCode, setTypedCode] = useState("");
  const [teamName, setTeamName] = useState("Real Madrid");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const teams = useMemo(() => datasetTeams(players, clubs)
    .filter(team => buildOpponent(players, team)?.players.filter(Boolean).length === 11), [players, clubs]);

  async function run(action) {
    setBusy(true);
    setError("");
    try { await action(); }
    catch (failure) { setError(failure.message || "The online match could not be updated."); }
    finally { setBusy(false); }
  }

  function selectedTeam() {
    const selected = buildOpponent(players, teamName);
    if (!selected || selected.players.filter(Boolean).length !== 11) throw new Error("That club does not have a complete XI in the available database. Choose another team.");
    return selected;
  }

  if (!open) return null;
  return <div className="modal-overlay">
    <section className="setup-modal online-match-modal" role="dialog" aria-modal="true" aria-labelledby="online-title">
      <button className="close-modal" onClick={onClose} aria-label="Close online match"><X size={20} /></button>
      <p className="eyebrow">THE DUGOUT · ONLINE MATCH</p>
      <h2 id="online-title">Play another manager</h2>
      {!uid ? <div>
        <p>Sign in or create an account to create a room and play online. Single-player matches remain available without an account.</p>
        <button className="primary-button" onClick={onClose}>Close</button>
      </div> : <div className="career-section">
        <p>Create a room and share its six-character code, or join a room from the other manager.</p>
        <label htmlFor="online-team">Your team</label>
        <select id="online-team" value={teamName} onChange={event => setTeamName(event.target.value)} disabled={busy || !players.length}>
          {teams.map(team => <option key={team}>{team}</option>)}
        </select>
        <button className="primary-button" type="button" disabled={busy || !players.length} onClick={() => run(async () => {
          const created = await createOnlineRoom({ uid, name: managerName, home: selectedTeam() });
          onRoomReady(created);
        })}>{busy ? "Creating room..." : "Create room"}</button>
        <label htmlFor="online-room-code">Join with a room code</label>
        <input id="online-room-code" className="career-input" maxLength={6} autoCapitalize="characters" value={typedCode}
          onChange={event => setTypedCode(event.target.value.toUpperCase())} placeholder="6-character code" disabled={busy} />
        <button className="secondary-button" type="button" disabled={busy || typedCode.trim().length !== 6 || !players.length} onClick={() => run(async () => {
          const selected = selectedTeam();
          const joined = await joinOnlineRoom({ uid, name: managerName, code: typedCode, away: selected });
          onRoomReady(await readOnlineRoom(joined, uid));
        })}>{busy ? "Joining..." : "Join room"}</button>
      </div>}
      {error && <p className="csv-error" role="alert">{error}</p>}
      {busy && <p role="status">Connecting to the online match...</p>}
      {!players.length && uid && <p role="status">Loading teams...</p>}
    </section>
  </div>;
}
