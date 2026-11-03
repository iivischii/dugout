import { careerUsage } from "../data/careerUsage";
export default function SquadUsage({ career }) {
  const usage = careerUsage(career.matches);
  return <div className="career-section">
    <p>Appearances in completed matches, including players brought on as substitutes, combined across seasons.</p>
    {[["Your most-used players", usage.own], ["Players most faced", usage.against], ["Clubs most faced", usage.clubs]].map(([title, rows]) => <section key={title}>
      <h3>{title}</h3>
      {rows.length ? <ol className="usage-list">{rows.slice(0, 5).map(row => <li key={row.id || row.name}><span>{row.name}</span><strong>{row.count} matches</strong></li>)}</ol> : <p>No recorded matches yet.</p>}
    </section>)}
    {usage.missingLineups > 0 && <p>{usage.missingLineups} older matches have incomplete lineup records; missing player appearances are not guessed.</p>}
  </div>;
}
