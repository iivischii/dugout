import { isShotEvent } from "../match-engine/commentary";
export default function HalfTimePanel({ homeScore, awayScore, feed, tactic, onTactic, onResume }) {
  const homeShots = feed.filter(event => event.side === "home" && isShotEvent(event)).length;
  const awayShots = feed.filter(event => event.side === "away" && isShotEvent(event)).length;
  return <section className="halftime-panel" aria-label="Half-time review">
    <p className="eyebrow">HALF-TIME BREAK</p>
    <h3>{homeScore}–{awayScore} · Shots {homeShots}–{awayShots}</h3>
    <p>The clock is stopped. Review the half and choose your second-half approach.</p>
    <label htmlFor="halftime-tactic">Second-half instructions</label>
    <select id="halftime-tactic" value={["balanced", "protect", "allout"].includes(tactic) ? tactic : "keep"} onChange={event => { if (event.target.value !== "keep") onTactic(event.target.value); }}>
      <option value="keep">Keep current instructions</option>
      <option value="balanced">Balanced · no extra risk modifier</option>
      <option value="protect">Protect shape · fewer shots for both teams</option>
      <option value="allout">Attack · more chances and more exposure</option>
    </select>
    <p className="lineup-help">Protect shape cuts their shot volume by 20% and yours by 25%. Attacking adds 20% to yours and 15% to theirs. These are model tradeoffs, not guaranteed outcomes.</p>
    <button className="primary-button" onClick={onResume}>Start second half</button>
  </section>;
}
