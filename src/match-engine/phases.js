export const initialPhase = () => ({ phase: "first-half", firstAdded: 0, secondAdded: 0, halfTimeAt: null });

// Goal-celebration delays are simulated explicitly. The 15-minute cap is a
// game safeguard for extreme simulated scorelines, not an IFAB limit.
export function addedMinutes(events) {
  return Math.min(15, Math.ceil(events.reduce((seconds, event) => seconds + (event.stoppageSeconds || 0), 0) / 60));
}

export function phaseBoundary(state) {
  if (state.phase === "first-half") return 45;
  if (state.phase === "first-added") return 45 + state.firstAdded;
  if (state.phase === "second-half") return state.halfTimeAt + 45;
  if (state.phase === "second-added") return state.halfTimeAt + 45 + state.secondAdded;
  return Infinity;
}

export function matchMinute(minute, state) {
  if (state.phase === "halftime") return "HALF TIME";
  if (state.phase === "full-time") return "FULL TIME";
  if (state.phase === "abandoned") return "ABANDONED";
  if (state.phase.startsWith("first")) return minute > 45 ? `45+${minute - 45}'` : `${minute}'`;
  const regulation = 45 + minute - state.halfTimeAt;
  return regulation > 90 ? `90+${regulation - 90}'` : `${regulation}'`;
}

export function progressPhase(state, minute, events) {
  const next = { ...state };
  const notices = [];
  const first = state.phase.startsWith("first");
  const halfEvents = first ? events : events.filter(event => event.minute > state.halfTimeAt);
  const allowance = addedMinutes(halfEvents);
  const notice = text => notices.push({ id: crypto.randomUUID(), minute, kind: "info", text,
    clockLabel: matchMinute(minute, state) });
  if (state.phase === "first-half" && minute >= 45) {
    next.firstAdded = allowance;
    next.phase = allowance ? "first-added" : "halftime";
    notice(`The referee indicates ${allowance} minute${allowance === 1 ? "" : "s"} of first-half added time, based on recorded stoppages.`);
  } else if (state.phase === "first-added") {
    next.firstAdded = Math.max(state.firstAdded, allowance);
    if (next.firstAdded > state.firstAdded) notice("The referee extends first-half added time for further stoppages.");
    if (minute >= 45 + next.firstAdded) next.phase = "halftime";
  } else if (state.phase === "second-half" && minute >= state.halfTimeAt + 45) {
    next.secondAdded = allowance;
    next.phase = allowance ? "second-added" : "full-time";
    notice(`The referee indicates ${allowance} minute${allowance === 1 ? "" : "s"} of second-half added time, based on recorded stoppages.`);
  } else if (state.phase === "second-added") {
    next.secondAdded = Math.max(state.secondAdded, allowance);
    if (next.secondAdded > state.secondAdded) notice("The referee extends second-half added time for further stoppages.");
    if (minute >= state.halfTimeAt + 45 + next.secondAdded) next.phase = "full-time";
  }
  if (next.phase === "halftime" && state.phase !== "halftime") {
    next.halfTimeAt = minute;
    notice("Half time. Review the first half and choose your approach before the restart.");
  }
  if (next.phase === "full-time" && state.phase !== "full-time") notice("Full time!");
  return { state: next, notices };
}
