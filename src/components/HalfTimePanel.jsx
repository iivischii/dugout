import { isShotEvent } from "../match-engine/commentary";
export default function HalfTimePanel({ homeScore, awayScore, feed, tactic, onTactic, onResume }) {
  const homeShots = feed.filter(event => event.side === "home" && isShotEvent(event)).length;
  const awayShots = feed.filter(event => event.side === "away" && isShotEvent(event)).length;
  return <section className="halftime-panel" aria-label="Half-time review">
    <p className="eyebrow">HALF-TIME BREAK</p>
    <h3>{homeScore}–{awayScore} · Shots {homeShots}–{awayShots}</h3>
    <p>The clock is stopped. Choose how you want to start the second half.</p>
    <label htmlFor="halftime-tactic">Second-half approach</label>
    <select id="halftime-tactic" value={["balanced", "protect", "allout"].includes(tactic) ? tactic : "keep"} onChange={event => { if (event.target.value !== "keep") onTactic(event.target.value); }}>
      <option value="keep">Keep current instructions</option>
      <option value="balanced">Balanced</option>
      <option value="protect">Hold the shape</option>
      <option value="allout">Go for it</option>
    </select>
    <p className="lineup-help">Holding shape can quieten their attack. Going for it may open up the match at both ends.</p>
    <button className="primary-button" onClick={onResume}>Start second half</button>
  </section>;
}
