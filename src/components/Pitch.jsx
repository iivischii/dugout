import { X } from "lucide-react";
import { formations } from "../data/squad";
import LivePitch from "./LivePitch";
export default function Pitch({ formation, byId, lineup, started, setDraggedNumber, draggedNumber, placePlayer, selectedPlayer: selectedSnapshot, pickedNumber, handlePitchClick, setSelectedPlayer, matchTeams, matchId, action, running, secondHalf }) {
 const selectedPlayer = started && selectedSnapshot && matchTeams
   ? { ...selectedSnapshot, ...matchTeams[selectedSnapshot.side || "home"].players.find(player => player.id === selectedSnapshot.id) }
   : selectedSnapshot;
 return (
          <div className="pitch">
            <div className="pitch-outline" /><div className="halfway-line" /><div className="center-circle" />
            <div className="top-box" /><div className="top-small-box" /><div className="bottom-box" /><div className="bottom-small-box" />
            {started && matchTeams ? <LivePitch key={matchId} teams={matchTeams} {...{ formation, action, running, secondHalf, selectedPlayer }} onSelect={setSelectedPlayer} /> : formations[formation].map(([x, y, role], index) => {
              const player = byId(lineup[index]);
              return (
                <button
                  key={`${formation}-${index}`}
                  type="button"
                  draggable={!started && Boolean(player)}
                  onDragStart={(event) => { if (player) { event.dataTransfer.setData("text/plain", player.id); setDraggedNumber(player.id); } }}
                  onDragEnd={() => setDraggedNumber(null)}
                  onDragOver={(event) => { if (!started) event.preventDefault(); }}
                  onDrop={(event) => { event.preventDefault(); placePlayer(event.dataTransfer.getData("text/plain") || draggedNumber, index); }}
                  className={`player-marker ${!player ? "empty-slot" : ""} ${player && selectedPlayer?.id === player.id ? "selected" : ""} ${player && pickedNumber === player.id ? "picked" : ""} ${role === "GK" ? "goalkeeper" : ""}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  aria-label={player ? `${player.name} · ${role}` : `Empty ${role} position`}
                  title={player ? `${player.name} · ${role}` : `Empty ${role} position`}
                  onClick={() => handlePitchClick(index)}
                >
                  {player?.number ?? "+"}
                  {started && <span className="player-name">{player?.name ?? role}</span>}
                </button>
              );
            })}
            {selectedPlayer && (
              <div className="pitch-player-card">
                <button className="player-card-close" onClick={() => setSelectedPlayer(null)} aria-label="Close player details"><X size={14}/></button>
                <strong>{selectedPlayer.name}</strong><small>{selectedPlayer.teamName && `${selectedPlayer.teamName} · `}#{selectedPlayer.number} · {selectedPlayer.role}</small>
                {selectedPlayer.matchYellowCards > 0 && <small>Yellow cards this match: {selectedPlayer.matchYellowCards}</small>}
                {selectedPlayer.sentOff && <small>Sent off · cannot return or be replaced.</small>}
                {selectedPlayer.emergencyGoalkeeper && <small>Standing in as goalkeeper after a dismissal.</small>}
                {selectedPlayer.source === "database" && <>
                  <small>{selectedPlayer.team} · {selectedPlayer.season}</small>
                  {selectedPlayer.dataStatus === "missing" && <small>Season statistics unavailable. No verified legend abilities are modelled.</small>}
                  <small>{selectedPlayer.stats?.games ?? "—"} games · {selectedPlayer.stats?.goals ?? "—"} goals · {selectedPlayer.stats?.assists ?? "—"} assists</small>
                  <small>xG {selectedPlayer.stats?.xG ?? "—"} · xA {selectedPlayer.stats?.xA ?? "—"}</small>
                </>}
              </div>
            )}
          </div>
 );
}
