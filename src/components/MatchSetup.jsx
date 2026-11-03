import { useMemo } from "react";
import { X, Play } from "lucide-react";
import { buildOpponent, buildRandomTeam, datasetTeams } from "../data/fantasyTeams";

export default function MatchSetup({
  homeTeam, setHomeTeam, opponent, setOpponent, players, clubs, loading, error, started, onClose, onConfirm,
}) {
  const teams = datasetTeams(players, clubs).filter(name => name !== "Real Madrid");
  const managedTeams = [...teams, "Real Madrid"].sort((left, right) => left.localeCompare(right));
  const managedTeam = useMemo(() => homeTeam === "RANDOM_XI" ? buildRandomTeam(players)
    : buildOpponent(players, homeTeam), [homeTeam, players]);
  const opponentTeam = useMemo(() => opponent === "RANDOM_XI" ? buildRandomTeam(players)
    : buildOpponent(players, opponent), [opponent, players]);
  const canConfirm = !loading && managedTeam && opponentTeam;
  return (
    <div className="modal-overlay">
      <div className="setup-modal">
        <button className="close-modal" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">THE DUGOUT · MATCH SETUP</p><h2>Choose Your Teams</h2>
        <p>Pick a European club or build a random team.</p>
        <label htmlFor="managed-team">Your team</label>
        <select id="managed-team" value={homeTeam} disabled={loading} onChange={event => setHomeTeam(event.target.value)}>
          <option value="RANDOM_XI">Random custom XI</option>
          {managedTeams.map(name => <option key={name}>{name}</option>)}
        </select>
        {managedTeam && <div className="opponent-preview">
          <strong>{managedTeam.name} · {managedTeam.formation}</strong>
          <p>Your XI: {managedTeam.players.map(player => player?.name || "Empty position").join(", ")}</p>
        </div>}
        <label htmlFor="opponent">Opponent</label>
        <select id="opponent" value={opponent} disabled={loading} onChange={event => setOpponent(event.target.value)}>
          <option value="RANDOM_XI">Random custom XI</option>
          {teams.map(name => <option key={name}>{name}</option>)}
        </select>
        {opponentTeam ? <div className="opponent-preview">
          <strong>{opponentTeam.name} · {opponentTeam.formation}</strong>
          <p>Opponent XI: {opponentTeam.players.map(player => player?.name || "Empty position").join(", ")}</p>
          <small>Each team has 11 starters and up to 5 substitutes.</small>
        </div> : <p role={error ? "alert" : "status"}>{loading ? "Loading teams..." : error || "No team is available from this database."}</p>}
        {started && <p>The current unfinished match will be discarded when you choose a new XI. Completed career records stay saved.</p>}
        <button className="primary-button" disabled={!canConfirm} onClick={onConfirm}><Play size={16} />Choose Starting XI</button>
      </div>
    </div>
  );
}
