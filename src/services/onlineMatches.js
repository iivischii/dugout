import { doc, getDoc, runTransaction, setDoc } from "firebase/firestore/lite";
import { db } from "./firebase";
import { simulateStep } from "../match-engine/simulation";
import { matchMinute, phaseBoundary, progressPhase } from "../match-engine/phases";

const roomRef = code => doc(db, "onlineMatches", code);
const roomCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return [...bytes].map(value => value.toString(16).padStart(2, "0")).join("").slice(0, 6).toUpperCase();
};

function assertParticipant(room, uid) {
  if (room.hostUid !== uid && room.guestUid !== uid) throw new Error("This room belongs to another account.");
}

function assertTurn(room, uid) {
  assertParticipant(room, uid);
  if (room.status !== "active" || room.turnUid !== uid) throw new Error("It is not your turn yet.");
}

export async function createOnlineRoom({ uid, name, home }) {
  if (!uid || !name?.trim() || !home?.players?.length) throw new Error("Sign in and choose a team before creating a room.");
  const code = roomCode();
  const room = {
    code, hostUid: uid, guestUid: "", hostName: name.trim().slice(0, 60), guestName: "",
    home: JSON.parse(JSON.stringify(home)), away: null, status: "waiting", turnUid: uid,
    minute: 0, phase: { phase: "first-half", firstAdded: 0, secondAdded: 0, halfTimeAt: null },
    scoreHome: 0, scoreAway: 0, homeTactic: "balanced", awayTactic: "balanced",
    events: [{ id: `kickoff-${code}`, minute: 0, kind: "info", text: "Room created. Waiting for the other manager." }],
    revision: 0, createdAt: Date.now(), updatedAt: Date.now(),
  };
  await setDoc(roomRef(code), room);
  return room;
}

export async function joinOnlineRoom({ uid, name, code, away }) {
  if (!uid || !name?.trim() || !away?.players?.length) throw new Error("Sign in and choose a team before joining a room.");
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(normalizedCode)) throw new Error("Enter the six-character room code.");
  const ref = roomRef(normalizedCode);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("No room was found. Check the code and try again.");
    const room = snapshot.data();
    if (room.status !== "waiting" || room.guestUid) throw new Error("That room already has two managers.");
    if (room.hostUid === uid) throw new Error("Use a different account to join your own room.");
    transaction.update(ref, {
      guestUid: uid, guestName: name.trim().slice(0, 60),
      away: JSON.parse(JSON.stringify(away)), status: "active",
      turnUid: room.hostUid, updatedAt: Date.now(), revision: room.revision + 1,
      events: [...room.events, { id: `joined-${normalizedCode}`, minute: 0, kind: "info", text: `${name.trim().slice(0, 60)} joined the match.` }],
    });
  });
  return normalizedCode;
}

export async function readOnlineRoom(code, uid) {
  if (!uid) throw new Error("Sign in to open an online match.");
  const snapshot = await getDoc(roomRef(code));
  if (!snapshot.exists()) throw new Error("This match room no longer exists.");
  const room = { ...snapshot.data(), code: snapshot.id };
  assertParticipant(room, uid);
  return room;
}

export async function advanceOnlineRoom({ room, uid, tactic }) {
  assertTurn(room, uid);
  if (!["balanced", "patient", "allout"].includes(tactic)) throw new Error("Choose one of the available team instructions.");
  if (room.phase.phase === "halftime") throw new Error("Start the second half before continuing.");
  const boundary = phaseBoundary(room.phase);
  const step = Math.min(5, boundary - room.minute);
  const side = room.hostUid === uid ? "home" : "away";
  const homeTactic = side === "home" ? tactic : room.homeTactic;
  const awayTactic = side === "away" ? tactic : room.awayTactic;
  const result = simulateStep({
    home: room.home, away: room.away, minute: room.minute,
    tactic: "balanced", homeTactic, awayTactic, stepMinutes: step, endMinute: boundary,
    recentEvents: room.events.slice(-20),
    score: { home: room.scoreHome, away: room.scoreAway },
    regulationStart: room.phase.halfTimeAt === null ? Math.min(45, room.minute) : Math.min(90, 45 + room.minute - room.phase.halfTimeAt),
  });
  const nextMinute = result.playedUntil;
  const scoreHome = room.scoreHome + result.homeGoal;
  const scoreAway = room.scoreAway + result.awayGoal;
  const playedEvents = result.events.map(event => ({ ...event, clockLabel: matchMinute(event.minute, room.phase) }));
  const progressed = result.abandoned ? null : progressPhase(room.phase, nextMinute, [...room.events, ...playedEvents]);
  const nextPhase = result.abandoned ? { ...room.phase, phase: "abandoned" } : progressed.state;
  const notices = progressed?.notices || [];
  const finalPhase = result.abandoned ? "abandoned" : nextPhase.phase;
  const finished = ["full-time", "abandoned"].includes(finalPhase);
  const otherUid = uid === room.hostUid ? room.guestUid : room.hostUid;
  const events = [...room.events, ...playedEvents, ...notices].slice(-150);
  const savedEvents = JSON.parse(JSON.stringify(events));
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(roomRef(room.code));
    if (!snapshot.exists()) throw new Error("This match room no longer exists.");
    const current = snapshot.data();
    assertTurn(current, uid);
    if (current.revision !== room.revision) throw new Error("The room changed while your turn was processing. Refresh and retry.");
    transaction.update(roomRef(room.code), {
      home: JSON.parse(JSON.stringify(result.teams.home)),
      away: JSON.parse(JSON.stringify(result.teams.away)),
      minute: nextMinute, phase: { ...nextPhase, phase: finalPhase },
      scoreHome, scoreAway, homeTactic, awayTactic, events: savedEvents,
      status: finalPhase === "abandoned" ? "abandoned" : finished ? "finished" : "active",
      turnUid: finished ? "" : otherUid,
      revision: current.revision + 1, updatedAt: Date.now(),
    });
  });
}

export async function startOnlineSecondHalf({ room, uid }) {
  assertTurn(room, uid);
  if (room.phase.phase !== "halftime") throw new Error("The match is not at half time.");
  const otherUid = uid === room.hostUid ? room.guestUid : room.hostUid;
  await runTransaction(db, async transaction => {
    const ref = roomRef(room.code);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("This match room no longer exists.");
    const current = snapshot.data();
    assertTurn(current, uid);
    if (current.revision !== room.revision) throw new Error("The room changed. Refresh and retry.");
    transaction.update(ref, {
      phase: { ...current.phase, phase: "second-half" }, turnUid: otherUid,
      events: [...current.events, { id: `second-half-${current.revision}`, minute: current.minute, clockLabel: "45'", kind: "info", text: "Second half kickoff." }].slice(-150),
      revision: current.revision + 1, updatedAt: Date.now(),
    });
  });
}
