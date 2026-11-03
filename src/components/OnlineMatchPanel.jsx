import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { buildOpponent, datasetTeams } from "../data/fantasyTeams";
import { advanceOnlineRoom, createOnlineRoom, joinOnlineRoom, readOnlineRoom, startOnlineSecondHalf } from "../services/onlineMatches";

export default function OnlineMatchPanel({ open, onClose, uid, managerName, players, clubs }) {
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState("");
  const [typedCode, setTypedCode] = useState("");
  const [teamName, setTeamName] = useState("Real Madrid");
  const [tactic, setTactic] = useState("balanced");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const teams = useMemo(() => datasetTeams(players, clubs)
    .filter(team => buildOpponent(players, team)?.players.filter(Boolean).length === 11), [players, clubs]);

  useEffect(() => {
    if (!open || !uid || !code) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const latest = await readOnlineRoom(code, uid);
        if (active) { setRoom(latest); setError(""); }
      } catch (failure) {
        if (active) setError(failure.message || "Could not refresh this match room.");
      }
    };
    void refresh();
    const interval = setInterval(refresh, 1800);
    return () => { active = false; clearInterval(interval); };
  }, [open, uid, code]);

  async function run(action) {
    setBusy(true);
    setError("");
    try { await action(); }
    catch (failure) { setError(failure.message || "The online match could not be updated."); }
    finally { setBusy(false); }
  }

  function selectedTeam() {
    const selected = buildOpponent(players, teamName);
    if (!selected || selected.players.filter(Boolean).length !== 11) throw new Error("That club does not have a complete XI in the available database. Choose another team.");
    return selected;
  }

  const side = room && room.hostUid === uid ? "home" : "away";
  const myTeam = room?.[side];
  const turnName = room?.turnUid === room?.hostUid ? room?.hostName : room?.guestName;
  const canAct = room?.status === "active" && room.turnUid === uid && !busy;

  if (!open) return null;
  return <div className="modal-overlay">
    <section className="setup-modal online-match-modal" role="dialog" aria-modal="true" aria-labelledby="online-title">
      <button className="close-modal" onClick={onClose} aria-label="Close online match"><X size={20} /></button>
      <p className="eyebrow">THE DUGOUT · ONLINE MATCH</p>
      <h2 id="online-title">{room ? `Room ${room.code}` : "Play another manager"}</h2>
      {!uid ? <div>
        <p>Sign in or create an account to create a room and play online. Single-player matches remain available without an account.</p>
        <button className="primary-button" onClick={onClose}>Close</button>
      </div> : !room ? <div className="career-section">
        <p>Create a room and share its six-character code, or join a room from the other manager.</p>
        <label htmlFor="online-team">Your team</label>
        <select id="online-team" value={teamName} onChange={event => setTeamName(event.target.value)} disabled={busy || !players.length}>
          {teams.map(team => <option key={team}>{team}</option>)}
        </select>
        <button className="primary-button" type="button" disabled={busy || !players.length} onClick={() => run(async () => {
          const created = await createOnlineRoom({ uid, name: managerName, home: selectedTeam() });
          setRoom(created);
          setCode(created.code);
        })}>{busy ? "Creating room..." : "Create room"}</button>
        <label htmlFor="online-room-code">Join with a room code</label>
        <input id="online-room-code" className="career-input" maxLength={6} autoCapitalize="characters" value={typedCode}
          onChange={event => setTypedCode(event.target.value.toUpperCase())} placeholder="6-character code" disabled={busy} />
        <button className="secondary-button" type="button" disabled={busy || typedCode.trim().length !== 6 || !players.length} onClick={() => run(async () => {
          const selected = selectedTeam();
          const joined = await joinOnlineRoom({ uid, name: managerName, code: typedCode, away: selected });
          setCode(joined);
          setRoom(await readOnlineRoom(joined, uid));
        })}>{busy ? "Joining..." : "Join room"}</button>
      </div> : <>
        <p className="online-room-status" role="status">{room.status === "waiting"
          ? "Waiting for another manager to join. Share the room code above."
          : room.status === "finished" ? "Full time."
            : room.status === "abandoned" ? "The match was abandoned."
              : room.turnUid === uid ? "Your turn — choose how your team should play for the next five minutes."
                : `${turnName || "The other manager"} is making a decision...`}</p>
        {room.status !== "waiting" && <div className="online-score">
          <strong>{room.home?.name}</strong><b>{room.scoreHome} - {room.scoreAway}</b><strong>{room.away?.name}</strong>
          <small>{room.phase?.phase === "halftime" ? "HALF TIME" : room.phase?.phase === "full-time" ? "FULL TIME" : `${room.minute}'`}</small>
        </div>}
        {room.status !== "waiting" && <p className="online-your-team">You manage {myTeam?.name} · {myTeam?.players?.length || 0} players</p>}
        {room.phase?.phase === "halftime" && canAct && <button className="primary-button" onClick={() => run(() => startOnlineSecondHalf({ room, uid }))}>Start second half</button>}
        {canAct && room.phase?.phase !== "halftime" && <>
          <label htmlFor="online-tactic">Your team's approach</label>
          <select id="online-tactic" value={tactic} onChange={event => setTactic(event.target.value)}>
            <option value="balanced">Keep a balanced shape</option>
            <option value="patient">Slow down and find openings</option>
            <option value="allout">Send more players forward</option>
          </select>
          <button className="primary-button" onClick={() => run(() => advanceOnlineRoom({ room, uid, tactic }))}>Play next five minutes</button>
        </>}
        {room.status !== "waiting" && <div className="online-events" aria-label="Match events">
          {[...room.events].reverse().slice(0, 12).map(event => <p key={event.id}>{event.clockLabel || `${event.minute}'`} · {event.text || event.title}</p>)}
        </div>}
      </>}
      {error && <p className="csv-error" role="alert">{error}</p>}
      {busy && <p role="status">Connecting to the online match...</p>}
      {!players.length && uid && <p role="status">Loading teams...</p>}
    </section>
  </div>;
}
