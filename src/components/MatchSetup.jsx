import { useMemo } from "react";
import { X, Play } from "lucide-react";
import { buildOpponent, buildRandomTeam, datasetTeams, teamSeasons } from "../data/fantasyTeams";
import { seasonYear } from "../data/championsLeague";

function seasonsFor(players, team) {
  if (team === "RANDOM_XI") return [];
  const seasons = teamSeasons(players, team);
  if (team === "Real Madrid" && !seasons.includes("2026/27")) seasons.push("2026/27");
  return seasons.sort((left, right) => seasonYear(right) - seasonYear(left));
}

export default function MatchSetup({
  homeTeam, setHomeTeam, homeSeason, setHomeSeason, opponent, setOpponent, opponentSeason, setOpponentSeason,
  players, clubs, loading, error, started, onClose, onConfirm,
}) {
  const teams = datasetTeams(players, clubs).filter(name => name !== "Real Madrid");
  const managedTeams = [...teams, "Real Madrid"].sort((left, right) => left.localeCompare(right));
  const managedSeasons = useMemo(() => seasonsFor(players, homeTeam), [players, homeTeam]);
  const opponentSeasons = useMemo(() => seasonsFor(players, opponent), [players, opponent]);
  const managedTeam = useMemo(() => homeTeam === "RANDOM_XI" ? buildRandomTeam(players)
    : buildOpponent(players, homeTeam, homeSeason && managedSeasons.includes(homeSeason) ? homeSeason : managedSeasons[0] || ""),
  [homeTeam, homeSeason, managedSeasons, players]);
  const opponentTeam = useMemo(() => opponent === "RANDOM_XI" ? buildRandomTeam(players)
    : buildOpponent(players, opponent, opponentSeason && opponentSeasons.includes(opponentSeason) ? opponentSeason : opponentSeasons[0] || ""),
  [opponent, opponentSeason, opponentSeasons, players]);
  const canConfirm = !loading && managedTeam && opponentTeam;
  return (
    <div className="modal-overlay">
      <div className="setup-modal">
        <button className="close-modal" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <p className="eyebrow">THE DUGOUT · MATCH SETUP</p><h2>Choose Your Teams</h2>
        <p>Pick a European club or build a random team.</p>
        <label htmlFor="managed-team">Your team</label>
        <select id="managed-team" value={homeTeam} disabled={loading} onChange={event => {
          const team = event.target.value;
          setHomeTeam(team);
          const seasons = seasonsFor(players, team);
          setHomeSeason(seasons[0] || "");
        }}>
          <option value="RANDOM_XI">Random custom XI</option>
          {managedTeams.map(name => <option key={name}>{name}</option>)}
        </select>
        {managedSeasons.length > 0 && <>
          <label htmlFor="managed-season">Season</label>
          <select id="managed-season" value={homeSeason && managedSeasons.includes(homeSeason) ? homeSeason : managedSeasons[0] || ""} disabled={loading} onChange={event => setHomeSeason(event.target.value)}>
            {managedSeasons.map(season => <option key={season}>{season}</option>)}
          </select>
        </>}
        {managedTeam && <div className="opponent-preview">
          <strong>{managedTeam.name} · {managedTeam.formation}</strong>
          <p>Your XI: {managedTeam.players.map(player => player?.name || "Empty position").join(", ")}</p>
        </div>}
        <label htmlFor="opponent">Opponent</label>
        <select id="opponent" value={opponent} disabled={loading} onChange={event => {
          const team = event.target.value;
          setOpponent(team);
          const seasons = seasonsFor(players, team);
          setOpponentSeason(seasons[0] || "");
        }}>
          <option value="RANDOM_XI">Random custom XI</option>
          {teams.map(name => <option key={name}>{name}</option>)}
        </select>
        {opponentSeasons.length > 0 && <>
          <label htmlFor="opponent-season">Opponent season</label>
          <select id="opponent-season" value={opponentSeason && opponentSeasons.includes(opponentSeason) ? opponentSeason : opponentSeasons[0] || ""} disabled={loading} onChange={event => setOpponentSeason(event.target.value)}>
            {opponentSeasons.map(season => <option key={season}>{season}</option>)}
          </select>
        </>}
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
