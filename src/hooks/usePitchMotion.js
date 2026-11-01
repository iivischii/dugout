import { useEffect, useState } from "react";

export default function usePitchMotion(actionId, running) {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [motion, setMotion] = useState({ actionId: null, elapsed: 0, time: 0 });
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = event => setReduced(event.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!running || reduced) return;
    let frame, previous = null;
    const reset = () => { previous = null; };
    const animate = now => {
      if (previous === null) previous = now;
      if (document.hidden) previous = now;
      else if (now - previous >= 50) {
        const delta = Math.min(now - previous, 100);
        previous = now;
        setMotion(old => ({ actionId, time: old.time + delta,
          elapsed: old.actionId === actionId ? old.elapsed + delta : 0 }));
      }
      frame = requestAnimationFrame(animate);
    };
    document.addEventListener("visibilitychange", reset);
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", reset); };
  }, [actionId, running, reduced]);
  return { progress: reduced || (!running && motion.actionId !== actionId) ? 1 : motion.actionId === actionId ? Math.min(1, motion.elapsed / 1600) : 0,
    motionTime: reduced ? 0 : motion.time, reduced };
}
