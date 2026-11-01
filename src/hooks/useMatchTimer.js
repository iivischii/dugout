import { useLayoutEffect, useRef, useState } from "react";
import { tickClock } from "../match-engine/clock";

export default function useMatchTimer({ matchId, started, paused, finished = false, minute, decision, rules, onAdvance, onTimeout }) {
  const [display, setDisplay] = useState({ elapsed: 0, remaining: 20000, matchId: null });
  const current = useRef(null);
  const clock = useRef({ elapsed: 0, remaining: 20000, matchId: null });
  useLayoutEffect(() => { current.current = { matchId, started, paused, finished, minute, decision, rules, onAdvance, onTimeout }; });
  useLayoutEffect(() => {
    if (!started || !matchId) return;
    let last = performance.now();
    const resetTick = () => { last = performance.now(); };
    document.addEventListener("visibilitychange", resetTick);
    const timer = setInterval(() => {
      const now = performance.now();
      const deltaMs = Math.max(0, now - last);
      last = now;
      const live = current.current;
      if (!live.started || live.matchId !== matchId) return;
      if (clock.current.matchId !== matchId) clock.current = { elapsed: 0, remaining: live.rules.decisionSeconds * 1000, matchId };
      const stopped = live.paused || document.hidden || live.finished || (!live.rules.autoPlay && !live.decision);
      const next = tickClock(clock.current, { deltaMs, paused: stopped, minute: live.minute,
        decision: live.decision?.minute ?? null, ...live.rules, maxMinute: 120 });
      clock.current = { ...next, matchId };
      setDisplay({ elapsed: next.elapsed, remaining: next.remaining, matchId });
      if (next.expired) live.onTimeout();
      else if (next.advance && live.rules.autoPlay) live.onAdvance(1);
    }, 200);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", resetTick); };
  }, [matchId, started]);
  return display.matchId === matchId ? display : { elapsed: 0, remaining: rules.decisionSeconds * 1000 };
}
