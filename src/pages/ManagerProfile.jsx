export default function ManagerProfile({ career }) {
  const matches = career.matches;
  const wins = matches.filter(match => match.result === "W").length;
  const draws = matches.filter(match => match.result === "D").length;
  const losses = matches.filter(match => match.result === "L").length;
  const goalsFor = matches.reduce((total, match) => total + (Number(match.goalsFor) || 0), 0);
  const goalsAgainst = matches.reduce((total, match) => total + (Number(match.goalsAgainst) || 0), 0);
  const formations = matches.reduce((counts, match) => {
    if (match.formation) counts[match.formation] = (counts[match.formation] || 0) + 1;
    return counts;
  }, {});
  const mostUsed = Object.entries(formations).sort((a, b) => b[1] - a[1])[0];
  return (
    <div className="career-section manager-profile">
      <div className="manager-identity">
        <span className="manager-initial" aria-hidden="true">{(career.managerName || "M").slice(0, 1).toUpperCase()}</span>
        <div><h3>{career.managerName || "Unnamed manager"}</h3><p>Manager · Real Madrid</p></div>
      </div>
      <p>Your record grows with every completed match.</p>
      <div className="career-stats">
        <div><b>{matches.length}</b><span>Matches</span></div>
        <div><b>{wins}</b><span>Wins</span></div>
        <div><b>{matches.length ? Math.round(100 * wins / matches.length) : 0}%</b><span>Win rate</span></div>
        <div><b>{draws}</b><span>Draws</span></div>
        <div><b>{losses}</b><span>Losses</span></div>
        <div><b>{goalsFor}–{goalsAgainst}</b><span>Goals for / against</span></div>
      </div>
      <h3>Career history</h3>
      <div className="career-detail"><strong>Real Madrid</strong><p>{matches.length} completed matches · {wins} wins · {draws} draws · {losses} losses</p></div>
      <h3>Most-used formation</h3>
      <p>{mostUsed ? `${mostUsed[0]} · ${mostUsed[1]} completed matches` : "Play your first match to start building your tactical record."}</p>
      <h3>Recent results</h3>
      {matches.length ? matches.slice(0, 5).map(match => (
        <div className="career-detail" key={match.id}>
          <strong>{match.result} · Real Madrid {match.goalsFor}–{match.goalsAgainst} {match.opponent}</strong>
          <p>{new Date(match.date).toLocaleDateString()} · {match.formation}</p>
        </div>
      )) : <p>Your story is just beginning. Completed matches will appear here.</p>}
    </div>
  );
}
