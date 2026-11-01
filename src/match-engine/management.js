import { attackProfile, decisionFromEvents } from "./simulation.js";
import { isShotEvent } from "./commentary.js";
import { activePlayers } from "./referee.js";

export function shouldOfferDecision(minute, lastOffered, events) {
  const gap = minute - lastOffered;
  return (gap >= 2 && events.some(event => event.kind === "card" && event.minute > lastOffered && event.minute <= minute)) || gap >= 8 || (gap >= 6 && (events.some(event => event.kind === "goal") || events.filter(isShotEvent).length >= 3));
}

export function managementSituation({ home, away, events, context = {}, recentTypes = [] }) {
  const shots = events.filter(isShotEvent);
  const homeShots = shots.filter(event => event.side === "home");
  const awayShots = shots.filter(event => event.side === "away");
  const creator = activePlayers(home).filter(player => player.role !== "GK")
    .sort((a, b) => attackProfile(b).creation - attackProfile(a).creation)[0];
  const candidates = [];
  const threat = decisionFromEvents(shots, context);
  if (threat) candidates.push(threat);
  const patient = { label: "Slow the attack and work a better opening", tactic: "patient",
    note: "10% fewer shots, but 12% higher scoring probability per shot. Opponent shots drop 5%; your modeled passing losses also become less frequent." };
  const risk = { label: "Increase attacking commitments", tactic: "allout", note: "20% more shot opportunities for you, but 15% more for the opposition." };
  const balance = { label: "Keep the current balance", tactic: "balanced", note: "Use normal shot volumes and conversion probabilities. No extra risk or quality modifier." };
  const waste = { label: "Slow the restarts and run down the clock", tactic: "waste-time", note: "Reduce your shot volume by 30% and theirs by 20%. Delays are added back; excessive delays can earn a yellow or second-yellow dismissal." };
  const focus = { label: `Build through ${creator?.name || "your midfield"}`, tactic: "playmaker", targetId: creator?.id || null,
    note: "Make this player's creator selection weight 60% higher and your shot volume 5% higher, while allowing 10% more opposition shots." };
  const bookedPlayers = activePlayers(home).filter(player => player.matchYellowCards > 0);
  const latestCaution = events.findLast(event => event.kind === "card" && event.side === "home" && bookedPlayers.some(player => player.id === event.playerId));
  const booked = bookedPlayers.find(player => player.id === latestCaution?.playerId) || bookedPlayers[0];
  const delayingCaution = latestCaution?.reason === "excessively delaying the restart";
  if (booked) candidates.unshift({ type: "booking-risk", title: `${booked.name} is on a yellow`,
    text: `${booked.name} has already been cautioned. Another caution means a dismissal, and a sent-off player cannot be replaced.`,
    choices: [
      delayingCaution ? { label: `Tell ${booked.name} to take restarts promptly`, tactic: "balanced", note: "Stop the intentional time-wasting instructions and return to normal shot volumes. The existing yellow card remains." }
        : { label: `Tell ${booked.name} to ease off challenges`, tactic: "cautious", targetId: booked.id, note: "Cut this player's modeled foul-selection weight by 65%. Your shots drop 10%, while opposition shots rise 5%. This cannot guarantee avoiding another card." },
      ...(context.canSubstitute ? [{ label: `Review a substitution for ${booked.name}`, action: "substitute", playerId: booked.id, note: "Open the substitution panel. A change only happens when you confirm it and counts toward the five-player limit." }] : []),
      delayingCaution ? { ...waste, label: "Keep slowing restarts despite the booking" } : balance,
    ] });
  if (home.players.some(player => player.sentOff)) candidates.unshift({ type: "man-down", title: `Down to ${activePlayers(home).length} players — reshape the approach`,
    text: "The dismissed player cannot be replaced. Fewer players reduce your attacking resources and add defensive exposure in this model.",
    choices: [{ label: "Compact the team and protect the shape", tactic: "protect", note: "Reduce opposition shot volume by 20%, but lose 25% of your own, on top of the numerical disadvantage." }, focus, risk] });
  if (away?.players.some(player => player.sentOff)) candidates.push({ type: "man-up", title: "The opposition are a player short",
    text: `They have ${activePlayers(away).length} active players. More attacking commitment can exploit the opening, but still adds exposure at your end.`, choices: [risk, patient, balance] });
  if (context.minute >= 60 && context.homeScore > context.awayScore) {
    const leading = candidates.find(candidate => candidate.type === "protect-lead");
    if (leading) leading.choices.push(waste);
    else candidates.push({ type: "clock-management", title: "You lead — manage the remaining time",
      text: "You can reduce the tempo, keep playing normally, or attempt slower restarts. The referee records delays and may caution excessive time-wasting.", choices: [waste, patient, balance] });
  }
  const losses = events.filter(event => event.kind === "buildup" && event.side === "home" && event.outcome === "intercepted");
  if (losses.length >= 2) candidates.unshift({ type: "passing-losses", title: "Your passing moves keep breaking down",
    text: `${losses.length} recent passing moves were intercepted. ${losses.at(-1).creatorName}'s latest attempt was stopped. Slow down, use a focal creator, or accept the risk?`,
    choices: [patient, focus, risk] });
  const misses = homeShots.filter(event => event.outcome === "wide");
  if (misses.length >= 2) candidates.push({ type: "missed-chances", title: "Shots are coming, but the target is being missed",
    text: `${misses.length} recent shots went wide, including an attempt by ${misses.at(-1).playerName}. More volume is one answer; a more patient approach trades volume for modeled shot quality.`, choices: [patient, risk, balance] });
  if (homeShots.length > awayShots.length + 1) candidates.push({ type: "capitalize", title: "Turn your shot advantage into something more",
    text: `Recent shots: ${homeShots.length} for you, ${awayShots.length} for the opposition. Keep the volume, change the creator, or commit more players?`, choices: [focus, risk, patient] });
  if (!homeShots.length) candidates.push({ type: "stalled-attack", title: "Your attack needs a new approach",
    text: `Your team has not produced a shot in the recent spell. ${creator?.name || "Your midfield"} could be the focal point, or you could trade patience for more attacking commitments.`, choices: [focus, risk, patient] });
  candidates.push({ type: "tempo-choice", title: "Set the tempo for the next spell",
    text: `The score is ${context.homeScore ?? 0}–${context.awayScore ?? 0}. Recent shots are ${homeShots.length}–${awayShots.length}. Choose where to put your attacking effort.`, choices: [focus, patient, balance] });
  // Late score pressure takes priority. Otherwise avoid the last two situation types.
  const recentRed = events.some(event => event.kind === "card" && ["red", "second-yellow"].includes(event.card));
  const emergency = recentRed ? candidates.find(candidate => candidate.type === "man-down") || candidates.find(candidate => candidate.type === "man-up") : null;
  const freshBooking = events.some(event => event.kind === "card" && event.side === "home" && event.playerId === booked?.id);
  const booking = freshBooking && !recentTypes.slice(-2).includes("booking-risk") ? candidates.find(candidate => candidate.type === "booking-risk") : null;
  const late = candidates.find(candidate => ["protect-lead", "chase-game"].includes(candidate.type));
  const clock = !recentTypes.slice(-2).includes("clock-management") ? candidates.find(candidate => candidate.type === "clock-management") : null;
  const selected = emergency || booking || late || clock || candidates.find(candidate => !recentTypes.slice(-2).includes(candidate.type)) || candidates[0];
  return { ...selected, minute: context.minute, basis: { homeShots: homeShots.length, awayShots: awayShots.length, passingLosses: losses.length } };
}
