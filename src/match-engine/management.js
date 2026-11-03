import { attackProfile, decisionFromEvents } from "./simulation.js";
import { isShotEvent } from "./commentary.js";
import { activePlayers } from "./referee.js";

export function shouldOfferDecision(minute, lastOffered, events, random = () => .5) {
  const gap = minute - lastOffered;
  const cadence = 6 + Math.floor(random() * 4);
  return (gap >= 2 && events.some(event => event.kind === "card" && event.minute > lastOffered && event.minute <= minute)) || gap >= cadence || (gap >= 6 && (events.some(event => event.kind === "goal") || events.filter(isShotEvent).length >= 3));
}

export function managementSituation({ home, away, events, context = {}, recentTypes = [], random = () => 0 }) {
  const shots = events.filter(isShotEvent);
  const homeShots = shots.filter(event => event.side === "home");
  const awayShots = shots.filter(event => event.side === "away");
  const creator = activePlayers(home).filter(player => player.role !== "GK")
    .sort((a, b) => attackProfile(b).creation - attackProfile(a).creation)[0];
  const candidates = [];
  const threat = decisionFromEvents(shots, context);
  if (threat) candidates.push(threat);
  const patient = { label: "Slow the attack and work a better opening", tactic: "patient",
    note: "Take an extra pass and wait for a clearer opening. You may get fewer chances, but they should be better ones." };
  const risk = { label: "Send more players forward", tactic: "allout", note: "You could create more chances, but leave more room for their counterattacks." };
  const balance = { label: "Keep the current approach", tactic: "balanced", note: "No big change. Keep playing as you are." };
  const waste = { label: "Take your time over restarts", tactic: "waste-time", note: "Run down the clock, but the referee may book a player for delaying too much." };
  const focus = { label: `Build through ${creator?.name || "your midfield"}`, tactic: "playmaker", targetId: creator?.id || null,
    note: `Get ${creator?.name || "your midfield"} more involved in the next attack.` };
  const creators = activePlayers(home).filter(player => player.role !== "GK")
    .sort((a, b) => attackProfile(b).creation - attackProfile(a).creation).slice(0, 3);
  if (creators.length > 1) candidates.push({ type: "choose-creator", title: "Who should lead the next attack?",
    text: "Pick a player to bring into the build-up. Their chances of creating the next opening will rise.",
    choices: creators.map(player => ({ label: `Build through ${player.name}`, tactic: "playmaker", targetId: player.id,
      note: `Look to ${player.name} more as you build the next attack.` })) });
  const bookedPlayers = activePlayers(home).filter(player => player.matchYellowCards > 0);
  const latestCaution = events.findLast(event => event.kind === "card" && event.side === "home" && bookedPlayers.some(player => player.id === event.playerId));
  const booked = bookedPlayers.find(player => player.id === latestCaution?.playerId) || bookedPlayers[0];
  const delayingCaution = latestCaution?.reason === "excessively delaying the restart";
  if (booked) candidates.unshift({ type: "booking-risk", title: `${booked.name} is on a yellow`,
    text: `${booked.name} has already been cautioned. Another caution means a dismissal, and a sent-off player cannot be replaced.`,
    choices: [
      delayingCaution ? { label: `Tell ${booked.name} to take restarts promptly`, tactic: "balanced", note: "Stop holding up play. The yellow card still stands." }
        : { label: `Tell ${booked.name} to ease off challenges`, tactic: "cautious", targetId: booked.id, note: "Ask them to avoid risky tackles. Another booking would mean a red card." },
      ...(context.canSubstitute ? [{ label: `Review a substitution for ${booked.name}`, action: "substitute", playerId: booked.id, note: "Open the substitution panel. A change only happens when you confirm it and counts toward the five-player limit." }] : []),
      delayingCaution ? { ...waste, label: "Keep slowing restarts despite the booking" } : balance,
    ] });
  if (home.players.some(player => player.sentOff)) candidates.unshift({ type: "man-down", title: `Down to ${activePlayers(home).length} players — reshape the approach`,
    text: "You cannot replace a player who has been sent off. You are a player down, so choose how much to commit going forward.",
    choices: [{ label: "Drop deeper and protect the lead", tactic: "protect", note: "Keep a tighter shape, though it may leave you with fewer attacks." }, focus, risk] });
  if (away?.players.some(player => player.sentOff)) candidates.push({ type: "man-up", title: "The opposition are a player short",
    text: `They have ${activePlayers(away).length} active players. More attacking commitment can exploit the opening, but still adds exposure at your end.`, choices: [risk, patient, balance] });
  if (context.minute >= 60 && context.homeScore > context.awayScore) {
    const leading = candidates.find(candidate => candidate.type === "protect-lead");
    if (leading) leading.choices.push(waste);
    else candidates.push({ type: "clock-management", title: "You lead — manage the remaining time",
      text: "You can keep the ball, carry on as usual, or take your time over restarts. Be careful: the referee may book you for delaying.", choices: [waste, patient, balance] });
  }
  const losses = events.filter(event => event.kind === "buildup" && event.side === "home" && event.outcome === "intercepted");
  if (losses.length >= 2) candidates.unshift({ type: "passing-losses", title: "Your passing moves keep breaking down",
    text: `${losses.length} recent passing moves were intercepted. ${losses.at(-1).creatorName}'s latest attempt was stopped. Slow down, use a focal creator, or accept the risk?`,
    choices: [patient, focus, risk] });
  const misses = homeShots.filter(event => event.outcome === "wide");
  if (misses.length >= 2) candidates.push({ type: "missed-chances", title: "Shots are coming, but the target is being missed",
    text: `${misses.length} recent shots went wide, including one from ${misses.at(-1).playerName}. Change the approach or keep asking for chances?`, choices: [patient, risk, balance] });
  if (homeShots.length > awayShots.length + 1) candidates.push({ type: "capitalize", title: "Turn your shot advantage into something more",
    text: `Recent shots: ${homeShots.length} for you, ${awayShots.length} for the opposition. Keep the volume, change the creator, or commit more players?`, choices: [focus, risk, patient] });
  if (!homeShots.length) candidates.push({ type: "stalled-attack", title: "Your attack needs a new approach",
    text: `Your team has not produced a shot in the recent spell. ${creator?.name || "Your midfield"} could be the focal point, or you could trade patience for more attacking commitments.`, choices: [focus, risk, patient] });
  const protect = { label: "Regroup and tighten the shape", tactic: "protect", note: "Stay compact and make it harder for them to get through, but expect fewer chances of your own." };
  const lastGoal = events.findLast(event => event.kind === "goal");
  if (lastGoal) candidates.unshift(lastGoal.side === "home"
    ? { type: "after-scoring", title: "You scored. What is the next move?", text: "The restart is a chance to reset your approach. Chase another goal, settle into possession, or give the opposition fewer openings?", choices: [risk, patient, protect] }
    : { type: "after-conceding", title: "A setback. Your players look to the touchline", text: "Push for an immediate response or restore control before committing forward. Your next instruction changes the balance of the next spell.", choices: [risk, focus, protect] });
  if (context.minute >= 55 && context.canSubstitute) {
    const replacement = activePlayers(home).filter(player => player.role !== "GK").sort((a, b) => attackProfile(a).creation - attackProfile(b).creation)[0];
    if (replacement) candidates.push({ type: "bench-impact", title: "Could the bench change this game?", text: `There are substitutions available. Review a replacement for ${replacement.name}, or keep the XI and change the way you build attacks.`, choices: [
      { label: `Review a change for ${replacement.name}`, action: "substitute", playerId: replacement.id, note: "Compare available players. No substitution is made until you confirm your choice." }, focus, patient,
    ] });
  }
  if (context.minute >= 70 && context.homeScore === context.awayScore) candidates.push({ type: "late-level", title: "Level late on. Settle or go for the winner?", text: "The game is still there to be won. Commit more players, seek a better opening, or reduce the chances at both ends.", choices: [risk, patient, protect] });
  candidates.push({ type: "control-or-risk", title: "Choose how open this game should be", text: "You can tighten the shape, commit more players forward, or use your main creator. Each route changes the opportunities at both ends.", choices: [protect, risk, focus] });
  candidates.push({ type: "tempo-choice", title: "Set the tempo for the next spell",
    text: `The score is ${context.homeScore ?? 0}–${context.awayScore ?? 0}. Recent shots are ${homeShots.length}–${awayShots.length}. Choose where to put your attacking effort.`, choices: [focus, patient, balance] });
  // Late score pressure takes priority. Otherwise avoid the last two situation types.
  const recentRed = events.some(event => event.kind === "card" && ["red", "second-yellow"].includes(event.card));
  const emergency = recentRed ? candidates.find(candidate => candidate.type === "man-down") || candidates.find(candidate => candidate.type === "man-up") : null;
  const freshBooking = events.some(event => event.kind === "card" && event.side === "home" && event.playerId === booked?.id);
  const booking = freshBooking && !recentTypes.slice(-2).includes("booking-risk") ? candidates.find(candidate => candidate.type === "booking-risk") : null;
  const late = candidates.find(candidate => ["protect-lead", "chase-game"].includes(candidate.type) && !recentTypes.slice(-2).includes(candidate.type));
  const clock = !recentTypes.slice(-2).includes("clock-management") ? candidates.find(candidate => candidate.type === "clock-management") : null;
  const goal = candidates.find(candidate => ["after-scoring", "after-conceding"].includes(candidate.type));
  const threatCandidate = candidates.find(candidate => ["new-threat", "repeated-threat"].includes(candidate.type));
  const specific = candidates.find(candidate => ["passing-losses", "missed-chances", "capitalize"].includes(candidate.type)
    && !recentTypes.slice(-2).includes(candidate.type));
  const bench = !recentTypes.slice(-2).includes("bench-impact") ? candidates.find(candidate => candidate.type === "bench-impact") : null;
  const lateLevel = !recentTypes.slice(-2).includes("late-level") ? candidates.find(candidate => candidate.type === "late-level") : null;
  const stalled = !recentTypes.slice(-2).includes("stalled-attack") ? candidates.find(candidate => candidate.type === "stalled-attack") : null;
  const varied = candidates.filter(candidate => !recentTypes.slice(-2).includes(candidate.type));
  const selected = emergency || booking || late || goal || threatCandidate || clock || specific || bench || lateLevel || stalled
    || varied[Math.min(varied.length - 1, Math.floor(random() * varied.length))]
    || candidates[0];
  return { ...selected, minute: context.minute, basis: { homeShots: homeShots.length, awayShots: awayShots.length, passingLosses: losses.length } };
}
