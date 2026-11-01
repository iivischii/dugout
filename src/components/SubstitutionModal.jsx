import { useState } from "react";
import { X } from "lucide-react";

export default function SubstitutionModal({ active, bench, used, limit, onConfirm, onClose, initialOff = "" }) {
  const [off, setOff] = useState(active.some(player => player.id === initialOff) ? initialOff : "");
  const [on, setOn] = useState("");
  const [error, setError] = useState("");
  return <div className="modal-overlay">
    <section className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="substitution-title">
      <button className="close-modal" onClick={onClose} aria-label="Close substitutions"><X size={20} /></button>
      <p className="eyebrow">CHANGE YOUR TEAM</p>
      <h2 id="substitution-title">Make a substitution</h2>
      <p>{limit - used} substitutions remaining. Players taken off cannot return in this match.</p>
      <p>The match and decision clocks are paused while you choose.</p>
      <label htmlFor="player-off">Player off</label>
      <select id="player-off" value={off} onChange={event => setOff(event.target.value)}>
        <option value="">Choose a player on the pitch</option>
        {active.map(player => <option key={player.id} value={player.id}>#{player.number} {player.name} · {player.role}{player.matchYellowCards ? " · booked" : ""}</option>)}
      </select>
      <label htmlFor="player-on">Player on</label>
      <select id="player-on" value={on} onChange={event => setOn(event.target.value)}>
        <option value="">Choose a substitute</option>
        {bench.map(player => <option key={player.id} value={player.id}>#{player.number} {player.name} · {player.role}</option>)}
      </select>
      {error && <p className="csv-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={!off || !on || used >= limit} onClick={() => {
        try { onConfirm(off, on); } catch (failure) { setError(failure.message); }
      }}>Confirm substitution</button>
      <button className="secondary-button" onClick={onClose}>Cancel</button>
    </section>
  </div>;
}
