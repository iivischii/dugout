import { useMemo, useState } from "react";
import { latestPlayerRecords, seasonYear } from "../data/championsLeague";
import { searchPlayers } from "../data/playerSearch";

export default function PlayerDatabase({
  players, query, setQuery, loading, error, onSelect,
  statsBombLoading = false, statsBombProgress, statsBombError = "",
}) {
  const [selectedSeason, setSelectedSeason] = useState("");
  const seasons = useMemo(() => [...new Set(players
    .filter(player => player.dataStatus !== "missing" && player.season)
    .map(player => player.season))]
    .sort((left, right) => seasonYear(right) - seasonYear(left)), [players]);
  const seasonPlayers = selectedSeason ? players.filter(player => player.season === selectedSeason) : players;
  const matches = searchPlayers(latestPlayerRecords(seasonPlayers), query, 20);
  return <>
    <label className="formation-label" htmlFor="database-search">PLAYER SEARCH</label>
    <p className="panel-description lineup-help">Search for a player.</p>
    <label className="formation-label" htmlFor="player-season">PLAYER SEASON</label>
    <select id="player-season" className="formation-select" value={selectedSeason} onChange={event => setSelectedSeason(event.target.value)}>
      <option value="">Latest available</option>
      {seasons.map(season => <option key={season}>{season}</option>)}
    </select>
    <input id="database-search" className="database-search" value={query}
      onChange={event => setQuery(event.target.value)}
      placeholder="Search a player or club..." aria-describedby="database-status" />
    <div id="database-status" role="status" aria-live="polite">
      {loading ? <p className="lineup-help">Loading teams...</p>
        : error ? <p className="csv-error">{error}</p>
          : query.trim().length >= 2 ? <p className="lineup-help">{matches.length ? `${matches.length} players found.` : "No matching players found."}</p>
            : <p className="lineup-help">Search by player or club.</p>}
      {statsBombLoading && <p className="lineup-help">Adding Champions League match data{statsBombProgress?.total ? ` · ${statsBombProgress.completed}/${statsBombProgress.total}` : "..."}</p>}
      {statsBombError && <p className="csv-error" role="alert">{statsBombError}</p>}
    </div>
    {!loading && !error && matches.length > 0 && <div className="database-results" aria-label="Player search results">
      {matches.map(player => <button key={`${player.id}-${player.team}`} type="button" className="database-result" onClick={() => onSelect(player)}>
        <strong>{player.name}</strong>
        <small>{player.team} · {player.position}</small>
        {player.dataStatus === "missing" && <small>Historical statistics are not available.</small>}
      </button>)}
    </div>}
  </>;
}
