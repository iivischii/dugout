import { useState } from "react";
import { X } from "lucide-react";

export default function PlayerInstructionModal({ home, away, current, onClose, onConfirm }) {
  const defenders = home.players.filter(player => !player.sentOff && player.role !== "GK");
  const opponents = away.players.filter(player => !player.sentOff && player.role !== "GK");
  const [markerId, setMarkerId] = useState(current?.markerId || defenders[0]?.id || "");
  const [targetId, setTargetId] = useState(current?.targetId || opponents[0]?.id || "");
  const marker = defenders.find(player => player.id === markerId);
  const target = opponents.find(player => player.id === targetId);

  return <div className="modal-overlay">
    <section className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="player-instruction-title">
      <button className="close-modal" onClick={onClose} aria-label="Close player instruction"><X size={20} /></button>
      <p className="eyebrow">THE DUGOUT · PLAYER INSTRUCTION</p>
      <h2 id="player-instruction-title">Stay close to an opponent</h2>
      <p>Choose one of your players to track one opponent. It can disrupt their chances, but it won’t stop every attack.</p>
      <label htmlFor="marking-player">Your player</label>
      <select id="marking-player" value={markerId} onChange={event => setMarkerId(event.target.value)}>
        {defenders.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
      </select>
      <label htmlFor="marked-player">Opponent to track</label>
      <select id="marked-player" value={targetId} onChange={event => setTargetId(event.target.value)}>
        {opponents.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
      </select>
      <button className="primary-button" disabled={!marker || !target} onClick={() => onConfirm({
        markerId, targetId, markerName: marker.name, targetName: target.name,
      })}>Give instruction</button>
      {current && <button className="secondary-button" onClick={() => onConfirm(null)}>Remove current instruction</button>}
    </section>
  </div>;
}
