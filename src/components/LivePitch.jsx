import { pitchFrame } from "../match-engine/pitchView";
import usePitchMotion from "../hooks/usePitchMotion";

export default function LivePitch({ teams, formation, action, running, secondHalf, selectedPlayer, onSelect }) {
  const motion = usePitchMotion(action?.id, running);
  const frame = pitchFrame({ teams, homeFormation: formation, action, secondHalf, ...motion });
  return <>
    <div className="pitch-team-key" aria-label="Pitch team colors">
      <span><i className="home-key" />Your XI</span><span><i className="away-key" />{teams.away.name}</span>
    </div>
    {frame.players.map(player => <button type="button" key={player.key}
      className={`player-marker live-player ${player.side}-player ${player.role === "GK" ? "goalkeeper" : ""} ${player.involved ? "involved" : ""} ${selectedPlayer?.id === player.id && (selectedPlayer.side || "home") === player.side ? "selected" : ""}`}
      style={{ left: `${player.x}%`, top: `${player.y}%` }}
      aria-label={`${player.teamName}: ${player.name} · ${player.role}`}
      title={`${player.teamName}: ${player.name} · ${player.role}${player.season ? ` · ${player.season}` : ""}`}
      onClick={() => onSelect({ ...player, number: player.number ?? player.index + 1 })}>
      {player.number ?? player.index + 1}
      {player.matchYellowCards > 0 && <span className="pitch-yellow-card" aria-label="Booked" />}
      <span className="player-name live-player-name">{player.name}</span>
    </button>)}
    <span className="match-ball" aria-hidden="true" style={{ left: `${frame.ball.x}%`, top: `${frame.ball.y}%` }} />
    <span className="pitch-view-note">Match-event animation</span>
  </>;
}
