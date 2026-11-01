import { useState } from "react";
import { ArrowRight } from "lucide-react";
import "../styles/Welcome.css";
import dugoutLogo from "../assets/dugout.png";

export default function WelcomePage({ career, onContinue, onCreate, onAccount, accountEmail }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const hasManager = Boolean(career.managerName.trim());

  return (
    <main className="welcome-page">
      <div className="welcome-pitch" aria-hidden="true"><div /></div>
      <section className="welcome-card">
        <img className="welcome-brand" src={dugoutLogo} alt="The Dugout crest" />
        <p className="eyebrow">YOUR CLUB. YOUR DECISIONS. YOUR LEGACY.</p>
        <h1>THE<br /><span>DUGOUT</span></h1>
        <p className="welcome-description">Every career starts on the touchline. Choose your XI, make the calls, and build your story one match at a time.</p>
        <div className="ticket-divider" aria-hidden="true" />
        {creating ? (
          <form onSubmit={event => { event.preventDefault(); if (name.trim()) onCreate(name.trim()); }}>
            <h2>Create your manager</h2>
            <p className="welcome-description">Choose your name. Your record and managerial history will grow from the matches you play.</p>
            <label htmlFor="new-manager-name">Manager name</label>
            <input id="new-manager-name" className="career-input" autoFocus required maxLength={60}
              value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Your name on the touchline" />
            <p className="welcome-note">Starting club · Real Madrid</p>
            <button className="primary-button" disabled={!name.trim()} type="submit">Begin Career <ArrowRight size={16} /></button>
            <button className="secondary-button" type="button" onClick={() => setCreating(false)}>Back</button>
          </form>
        ) : (
          <>
            {hasManager && <p className="welcome-returning">Welcome back, <strong>{career.managerName}</strong><small>Real Madrid · {career.matches.length} completed matches</small></p>}
            <button className="primary-button" onClick={hasManager ? onContinue : () => setCreating(true)}>
              {hasManager ? "Continue Career" : "Create Manager"} <ArrowRight size={16} />
            </button>
            {!hasManager && career.matches.length > 0 && <p className="welcome-note">Your {career.matches.length} saved matches will stay with your manager.</p>}
          </>
        )}
        <button className="secondary-button" onClick={onAccount}>Account / Cloud saves</button>
        <p className="welcome-note">{accountEmail}</p>
        <p className="welcome-note">Career saved on this browser. Cloud saves are available in Account.</p>
      </section>
    </main>
  );
}
