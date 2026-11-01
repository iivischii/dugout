// Wall-clock budget counts active play only; decisions have their own budget.
export function tickClock(state, { deltaMs, paused, decision, durationMinutes, decisionSeconds, timedDecisions, minute, maxMinute = 90 }) {
  if (paused) return { ...state, advance: false, expired: false };
  if (decision) {
    const remaining = Math.max(0, (state.decisionKey === decision ? state.remaining : decisionSeconds * 1000) - deltaMs);
    return { ...state, decisionKey: decision, remaining, advance: false, expired: timedDecisions && remaining === 0 };
  }
  const elapsed = Math.min(durationMinutes * 60000 * maxMinute / 90, state.elapsed + deltaMs);
  return { elapsed, remaining: decisionSeconds * 1000, decisionKey: null,
    advance: minute < Math.floor(elapsed / (durationMinutes * 60000) * 90), expired: false };
}
export function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
