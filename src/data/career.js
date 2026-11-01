export const STORAGE_KEY = "dugout-career-v1";
export function readCareer() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { managerName: typeof value.managerName === "string" ? value.managerName : "", matches: Array.isArray(value.matches) ? value.matches : [] };
  } catch { return { managerName: "", matches: [] }; }
}

export function reviewMatch(match) {
  if (match.modelVersion) {
    const missed = (match.decisions || []).filter(decision => decision.timedOut).length;
    return [
      `Recorded shots: your team ${match.matchStats?.homeShots ?? "unknown"}, opposition ${match.matchStats?.awayShots ?? "unknown"}. These counts come from the saved shot events.`,
      `Missed decision deadlines: ${missed}. Previous instructions stayed in effect on timeout; this does not establish that a missed decision caused the result.`,
      ...(match.addedTime ? [`Added time played: first half ${match.addedTime.firstHalf} minutes, second half ${match.addedTime.secondHalf} minutes.`] : []),
      "This experimental model uses available player-season shot rates and scoring probabilities, with disclosed defaults for missing data. It does not yet model individual defending, fitness, dribbling, or full playing styles.",
      "Tactical choices alter model probabilities. This match alone cannot establish whether a decision caused the result.",
    ];
  }
  const decisions = match.decisions || [];
  const notes = [];
  if (decisions.some(d => d.tactic === "allout") && match.goalsAgainst > 0) notes.push("You committed players forward and conceded. Review whether you left enough cover; this alone doesn't prove the tactic caused the goal.");
  if (decisions.some(d => d.tactic === "press")) notes.push("You used high pressing. Once fatigue and possession data are tracked, we can assess whether it paid off.");
  if (decisions.some(d => d.tactic === "counter")) notes.push("You chose counterattacking at least once. We'll need chance-creation data to judge its effectiveness.");
  if (!decisions.length) notes.push("No tactical decisions were recorded in this match.");
  notes.push("This is a prototype review, not a real tactical diagnosis: the current match engine still uses random outcomes.");
  return notes;
}

