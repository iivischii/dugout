import SettingsPage from "./SettingsPage";
import SquadUsage from "./SquadUsage";
import ManagerProfile from "./ManagerProfile";
import { X } from "lucide-react";
import { reviewMatch } from "../data/career";
export default function CareerPage({ infoPanel, setInfoPanel, career, selectedHistory, setSelectedHistory, wins, draws, losses, winRate, settings, setSettings, started, onRestart, onMenu, onAccount }) {
 return (
<div className="modal-overlay" onClick={() => setInfoPanel(null)}>
          <div className="setup-modal career-modal" onClick={event => event.stopPropagation()}>
            <button className="close-modal" onClick={() => setInfoPanel(null)} aria-label="Close"><X size={20}/></button>
            <p className="eyebrow">THE DUGOUT · MANAGER CAREER</p>
            <h2>{({ profile: "Manager Profile", matches: "Match Calendar", competitions: "Manager Career", settings: "Settings" })[infoPanel]}</h2>
            {infoPanel === "matches" && (
              <div className="career-section">
                {career.matches.length === 0 ? <p>No completed matches yet. Finish a 90-minute match to add it here.</p> : (
                  <>
                    <p>{career.matches.length} completed matches · newest first</p>
                    {career.matches.map(match => <button key={match.id} className="history-row" onClick={() => setSelectedHistory(selectedHistory === match.id ? null : match.id)}>
                      <span className={`result-pill result-${match.result}`}>{match.result}</span>
                      <span><strong>{match.homeTeam || "Real Madrid"} {match.goalsFor}–{match.goalsAgainst} {match.opponent}</strong><small>{new Date(match.date).toLocaleString()} · {match.formation}</small></span>
                    </button>)}
                    {career.matches.filter(m => m.id === selectedHistory).map(match => <div key={match.id} className="career-detail">
                      <h3>Match review</h3>
                      {match.startingXI && <>
                        <h3>Your starting XI</h3>
                        <p>{match.startingXI.map(player => `${player.name}${player.season ? ` (${player.season})` : ""}`).join(", ")}</p>
                        <h3>Opponent XI · {match.opponentSeason}</h3>
                        <p>{match.opponentXI?.map(player => player.name).join(", ")}</p>
                      </>}
                      {reviewMatch(match).map((note, i) => <p key={i}>{note}</p>)}
                      {match.referee && <><h3>Referee and discipline</h3>
                        <p>Your team: {match.referee.home.fouls} fouls · {match.referee.home.yellows} yellows · {match.referee.home.reds} reds</p>
                        <p>Opposition: {match.referee.away.fouls} fouls · {match.referee.away.yellows} yellows · {match.referee.away.reds} reds</p>
                      </>}
                      <h3>Substitutions</h3>
                      {match.substitutions?.length ? match.substitutions.map((change, index) => <p key={index}>
                        {change.clockLabel || `${change.minute}'`} · {change.playerOff.name} off → {change.playerOn.name} on
                      </p>) : <p>No substitutions recorded.</p>}
                      <h3>Decisions</h3>
                      {match.decisions.length ? match.decisions.map((d,i) => <p key={i}>{d.clockLabel || `${d.minute}'`} — {d.label}</p>) : <p>No decisions recorded.</p>}
                      <h3>Match timeline</h3>
                      {match.events.map((e,i) => <p key={i}>{e.clockLabel || `${e.minute}'`} — {e.title ? `${e.title}: ` : ""}{e.text}</p>)}
                    </div>)}
                  </>
                )}
              </div>
            )}
            {infoPanel === "competitions" && <div className="career-section">
              <div className="career-stats"><div><b>{wins}</b><span>Wins</span></div><div><b>{draws}</b><span>Draws</span></div><div><b>{losses}</b><span>Losses</span></div></div>
              <p><strong>{winRate}% win rate</strong> · {career.matches.length} completed matches</p>
              <div className="win-bar"><div style={{width:`${winRate}%`}} /></div>
              <h3>Performance reviews</h3>
              {career.matches.length ? career.matches.slice(0,5).map(match => <div key={match.id} className="career-detail"><strong>{match.result} · {match.opponent} · {match.goalsFor}–{match.goalsAgainst}</strong>{reviewMatch(match).map((note,i) => <p key={i}>{note}</p>)}</div>) : <p>Complete a match to see your record and improvement notes.</p>}
              <h3>Squad stats</h3>
              <SquadUsage career={career} />
            </div>}
            {infoPanel === "profile" && <ManagerProfile career={career} />}
            {infoPanel === "settings" && <SettingsPage {...{ settings, setSettings, started, onRestart, onMenu, onAccount }} />}

          </div>
        </div>
       );
}
