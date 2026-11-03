import { Users, UserRound, X } from "lucide-react";

export default function GameModeModal({ signedIn, onSinglePlayer, onMultiplayer, onRequireAccount, onClose }) {
  return <div className="modal-overlay">
    <section className="setup-modal game-mode-modal" role="dialog" aria-modal="true" aria-labelledby="game-mode-title">
      <button className="close-modal" onClick={onClose} aria-label="Close game mode selection"><X size={20} /></button>
      <p className="eyebrow">THE DUGOUT · NEW MATCH</p>
      <h2 id="game-mode-title">How do you want to play?</h2>
      <p>Choose a match with the Dugout or play against another manager online.</p>
      <button className="mode-choice" type="button" onClick={onSinglePlayer}>
        <UserRound size={20} />
        <span><strong>Single player</strong><small>Pick your teams and manage the match.</small></span>
      </button>
      <button className="mode-choice" type="button" onClick={signedIn ? onMultiplayer : onRequireAccount}>
        <Users size={20} />
        <span><strong>Multiplayer</strong><small>{signedIn ? "Create or join an online room" : "Sign in required · create an account to play"}</small></span>
      </button>
    </section>
  </div>;
}
