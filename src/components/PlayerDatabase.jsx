import { searchPlayers } from "../data/playerSearch";

export default function PlayerDatabase({ players, query, setQuery, loading, error, onSelect }) {
  const matches = searchPlayers(players, query);
  return (
    <>
      <label className="formation-label" htmlFor="database-search">ADD FROM PLAYER DATABASE</label>
      <p className="panel-description lineup-help">Tap a pitch position first, then choose a player season to replace that starter.</p>
      <input id="database-search" className="database-search" value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Name, club, season, position or league..." aria-describedby="database-status" />
      <div id="database-status" role="status" aria-live="polite">
        {loading ? <p className="lineup-help">Loading player database...</p>
          : error ? <p className="csv-error">{error}</p>
          : query.trim().length >= 2 ? <p className="lineup-help">{matches.length ? `${matches.length} results shown. Choose a season below.` : "No matching players found."}</p>
          : <p className="lineup-help">Search with at least 2 characters.</p>}
      </div>
      {!loading && !error && matches.length > 0 && <div className="database-results" aria-label="Player search results">
        {matches.map((player, index) => <button key={`${player.id}-${player.team}-${player.season}-${index}`}
          type="button" className="database-result" onClick={() => onSelect(player)}>
          <strong>{player.name}</strong>
          <small>{player.team} · {player.season} · {player.position} · {player.league}</small>
          {player.dataStatus === "missing" && <small>Legend identity only. Historical statistics are not available; uses disclosed model defaults.</small>}
        </button>)}
      </div>}
    </>
  );
}
