import { X, Play } from "lucide-react";
import { buildOpponent, datasetTeams, teamSeasons } from "../data/fantasyTeams";

export default function MatchSetup({ opponent, setOpponent, season, setSeason, players, loading, started, onClose, onConfirm }) {
  const team = buildOpponent(players, opponent, season);
  const teams = datasetTeams(players);
  const seasons = teamSeasons(players, opponent);
  return (
    <div className="modal-overlay">
      <div className="setup-modal">
        <button className="close-modal" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">THE DUGOUT · FANTASY MATCH</p><h2>Set Up Your Match</h2>
        <p>Mix player eras in your XI and choose the side you want to face.</p>
        <label htmlFor="opponent">Opponent</label>
        <select id="opponent" value={opponent} onChange={event => { setOpponent(event.target.value); setSeason(""); }}>
          {!teams.length && <option value={opponent}>{opponent}</option>}
          {teams.map(name => <option key={name}>{name}</option>)}
        </select>
        <label htmlFor="opponent-season">Opponent season</label>
        <select id="opponent-season" value={season || seasons[0] || ""} onChange={event => setSeason(event.target.value)}>
          {seasons.map(value => <option key={value}>{value}</option>)}
        </select>
        {team ? <div className="opponent-preview">
          <strong>{team.season} · {team.formation}</strong>
          <p>Opponent XI: {team.players.map(player => player?.name || "Empty position").join(", ")}</p>
          <small>Suggested XI from the selected season. Edit either team on the pitch next; squad numbers are assigned for this game. Transfer records can contain season totals combined across clubs.</small>
        </div> : <p role="status">{loading ? "Loading opponent seasons..." : "Opponent XI unavailable. Check the player database before kickoff."}</p>}
        {started && <p>The current unfinished match will be discarded when you choose a new XI. Completed career records stay saved.</p>}
        <button className="primary-button" onClick={onConfirm}><Play size={16} />Choose Starting XI</button>
      </div>
    </div>
  );
}
