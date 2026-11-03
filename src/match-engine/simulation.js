// A deliberately limited attacking model. Baselines are model assumptions, not player ratings.
import { buildUpCommentary, chooseCommentary } from "./commentary.js";
import { activePlayers, refereeStep } from "./referee.js";
export const MODEL_VERSION = "season-attacks-v4";
const baseline = role => role === "GK" ? { shots: 0, conversion: 0, creation: 0 }
  : /^(ST|LW|RW|F)$/.test(role) ? { shots: 2.5, conversion: .12, creation: 1 }
  : /^(CB|LB|RB|D|LWB|RWB)$/.test(role) ? { shots: .5, conversion: .06, creation: .5 }
  : { shots: 1.2, conversion: .08, creation: 1.2 };
const clamp = (value, low, high) => Math.max(low, Math.min(value, high));
export const per90 = (total, minutes) => Number.isFinite(total) && minutes > 0 ? total * 90 / minutes : null;

export function attackProfile(player) {
  const defaults = baseline(player.role || player.position);
  const stats = player.stats || {};
  const minutes = stats.minutes;
  const rate = per90(stats.shots, minutes);
  const quality = stats.shots > 0 ? (Number.isFinite(stats.xG) ? stats.xG : stats.goals) / stats.shots : null;
  // Small samples are shrunk towards role defaults, avoiding one short cameo becoming a superstar.
  const confidence = minutes > 0 ? minutes / (minutes + 900) : 0;
  const blend = (observed, assumed) => Number.isFinite(observed) ? observed * confidence + assumed * (1 - confidence) : assumed;
  return {
    shots: clamp(blend(rate, defaults.shots), 0, 8),
    conversion: clamp(blend(quality, defaults.conversion), 0, .6),
    creation: Math.max(0, blend(per90(stats.keyPasses, minutes), defaults.creation)),
    hasSeasonData: Number.isFinite(rate),
  };
}

export function weightedPlayer(players, measure, random) {
  const weights = players.map(player => Math.max(0, measure(player)));
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!total) return players[0];
  let roll = random() * total;
  return players.find((player, index) => (roll -= weights[index]) < 0) || players.at(-1);
}

export function simulateStep({ home, away, minute, tactic = "balanced", homeTactic = tactic, awayTactic = tactic, targetId = null, homeTargetId = targetId, awayTargetId = null, marking = null, homeMarking = marking, awayMarking = null, random = Math.random, stepMinutes = 5, endMinute = 90, recentEvents = [], score = { home: 0, away: 0 }, regulationStart = minute }) {
  const events = [];
  let teams = { home, away };
  const activeMarking = side => {
    const instruction = side === "home" ? awayMarking : homeMarking;
    const defending = side === "home" ? "away" : "home";
    return instruction && activePlayers(teams[defending]).some(player => player.id === instruction.markerId)
      && activePlayers(teams[side]).some(player => player.id === instruction.targetId) ? instruction : null;
  };
  let homeGoal = 0, awayGoal = 0;
  const attack = (team, defending, side, atMinute) => {
    const sideTactic = side === "home" ? homeTactic : awayTactic;
    const sideTargetId = side === "home" ? homeTargetId : awayTargetId;
    const oppositionTactic = side === "home" ? awayTactic : homeTactic;
    const oppositionTargetId = side === "home" ? awayTargetId : homeTargetId;
    const markingInstruction = activeMarking(side);
    const profiles = new Map(team.players.map(player => [player.id, attackProfile(player)]));
    const weight = player => player.role === "GK" ? 0 : profiles.get(player.id).shots
      * (oppositionTactic === "contain" && player.id === oppositionTargetId ? .65 : 1)
      * (markingInstruction && player.id === markingInstruction.targetId ? .4 : 1);
    let total = team.players.reduce((sum, player) => sum + weight(player), 0);
    if (sideTactic === "allout") total *= side === "home" ? 1.2 : 1.15;
    if (sideTactic === "contain") total *= .9;
    if (sideTactic === "cutservice") total *= side === "home" ? .95 : .85;
    if (sideTactic === "protect") total *= side === "home" ? .75 : .8;
    if (sideTactic === "patient") total *= side === "home" ? .9 : .95;
    if (sideTactic === "playmaker") total *= side === "home" ? 1.05 : 1.1;
    if (sideTactic === "cautious") total *= side === "home" ? .9 : 1.05;
    if (sideTactic === "waste-time") total *= side === "home" ? .7 : .8;
    // A missing defender creates extra exposure; this is a model modifier.
    total *= 1 + Math.max(0, 11 - defending.players.length) * .12;
    if (random() >= 1 - Math.exp(-total / 90)) return;
    const shooter = weightedPlayer(team.players, weight, random);
    const others = team.players.filter(player => player.id !== shooter.id && player.role !== "GK");
    const creator = weightedPlayer(others, player => profiles.get(player.id).creation
      * (oppositionTactic === "cutservice" && player.id === oppositionTargetId ? .5 : sideTactic === "playmaker" && player.id === sideTargetId ? 1.6 : 1), random);
    const conversion = clamp(profiles.get(shooter.id).conversion * (sideTactic === "patient" ? 1.12 : 1), 0, .6);
    const goal = random() < conversion;
    const outcome = goal ? "goal" : random() < .5 ? "saved" : "wide";
    const keeper = defending.players.find(player => player.role === "GK")?.name || `${defending.name}'s goalkeeper`;
    const templates = goal ? [
      `GOAL! ${creator?.name || team.name} finds ${shooter.name}, who finishes for ${team.name}.`,
      `${shooter.name} scores! The move began with ${creator?.name || team.name}, and ${team.name} convert the chance.`,
      `A goal for ${team.name}! ${shooter.name} gets the finish after service from ${creator?.name || "a teammate"}.`,
      `${creator?.name || team.name} supplies the opening — and ${shooter.name} converts it. ${defending.name} concede.`,
      `The passing move has a finish this time: ${shooter.name} scores from ${creator?.name || "a teammate"}'s delivery.`,
      `Goal! ${shooter.name} beats ${keeper} after combining with ${creator?.name || "a teammate"}. A breakthrough for ${team.name}.`,
    ] : outcome === "saved" ? [
      `${creator?.name || team.name} supplies ${shooter.name}. ${keeper} saves the shot.`,
      `${shooter.name} tests ${keeper} after a pass from ${creator?.name || "a teammate"}. The goalkeeper keeps it out.`,
      `A chance reaches ${shooter.name} through ${creator?.name || "a teammate"}. The shot comes in, but ${keeper} makes the save.`,
      `${team.name} turn the buildup into a shot: ${shooter.name} is the finisher, ${keeper} the obstacle. No goal.`,
      `${creator?.name || team.name} picks out ${shooter.name}. ${keeper} stops the resulting attempt and the score stays unchanged.`,
      `The move ends with ${shooter.name} shooting at goal. ${keeper} saves; ${creator?.name || "the creator"}'s contribution does not become a goal.`,
    ] : [
      `${shooter.name} shoots wide after a pass from ${creator?.name || "a teammate"}. ${defending.name} escape without conceding.`,
      `${creator?.name || team.name} creates the opening, but ${shooter.name}'s effort misses the target.`,
      `The passing connection works, the finish does not: ${shooter.name} shoots off target after service from ${creator?.name || "a teammate"}.`,
      `${team.name} get an attempt through ${shooter.name}, but it goes wide. ${keeper} is not required to make a save.`,
      `${creator?.name || team.name} finds the shooter. ${shooter.name} takes the chance on, but cannot put it on target.`,
      `An attack reaches its final action — ${shooter.name}'s shot — and ends wide. ${defending.name} avoid conceding from the move.`,
    ];
    const commentary = chooseCommentary(`${side}-${outcome}`, templates, [...recentEvents, ...events], random);
    events.push({ id: crypto.randomUUID(), minute: atMinute, kind: goal ? "goal" : "shot", ...commentary, side,
      playerId: shooter.id, playerName: shooter.name, creatorId: creator?.id || null, creatorName: creator?.name || null,
      scoringProbability: conversion, usedSeasonData: profiles.get(shooter.id).hasSeasonData,
      outcome, stoppageSeconds: goal ? 20 + Math.floor(random() * 31) : 0 });
    if (goal) { if (side === "home") homeGoal++; else awayGoal++; }
  };
  const buildup = atMinute => {
    const side = random() < .5 ? "home" : "away";
    const sideTactic = side === "home" ? homeTactic : awayTactic;
    const team = { ...teams[side], players: activePlayers(teams[side]) };
    const other = side === "home" ? "away" : "home";
    const opposition = { ...teams[other], players: activePlayers(teams[other]) };
    const outfield = team.players.filter(player => player.role !== "GK");
    const sideTargetId = side === "home" ? homeTargetId : awayTargetId;
    const passer = weightedPlayer(outfield, player => attackProfile(player).creation * (sideTactic === "playmaker" && player.id === sideTargetId ? 1.6 : 1), random);
    const receiver = weightedPlayer(outfield.filter(player => player.id !== passer.id), player => attackProfile(player).creation + attackProfile(player).shots, random);
    const defenders = opposition.players.filter(player => ["CB", "LB", "RB", "CDM", "LWB", "RWB"].includes(player.role));
    const defender = defenders[Math.min(defenders.length - 1, Math.floor(random() * defenders.length))] || opposition.players[1];
    const roll = random();
    const markingInstruction = activeMarking(side);
    const watched = markingInstruction && [passer.id, receiver.id].includes(markingInstruction.targetId);
    const lossChance = Math.min(.9, (sideTactic === "patient" ? .2 : .35) + (watched ? .18 : 0));
    const outcome = roll < lossChance ? "intercepted" : roll < .65 ? "crowded-out" : "recycled";
    const commentary = buildUpCommentary({ side, passer, receiver, defender, outcome }, team, opposition, [...recentEvents, ...events], random);
    events.push({ id: crypto.randomUUID(), minute: atMinute, kind: "buildup", side, outcome, ...commentary,
      creatorId: passer.id, creatorName: passer.name, playerId: receiver.id, playerName: receiver.name,
      opponentPlayerId: defender.id, opponentPlayerName: defender.name,
      ...(watched ? { markingPlayerId: markingInstruction.markerId, markedPlayerId: markingInstruction.targetId } : {}) });
  };
  for (let atMinute = minute + 1; atMinute <= Math.min(minute + stepMinutes, endMinute); atMinute++) {
    const refereeing = refereeStep(teams, atMinute, { tactic, targetId, random, score: { home: score.home + homeGoal, away: score.away + awayGoal }, regulationMinute: Math.min(90, regulationStart + atMinute - minute) });
    teams = refereeing.teams;
    events.push(...refereeing.events);
    if (refereeing.abandoned) return { homeGoal, awayGoal, events, teams, abandoned: refereeing.abandoned, playedUntil: atMinute };
    const before = events.length;
    const activeHome = { ...teams.home, players: activePlayers(teams.home) };
    const activeAway = { ...teams.away, players: activePlayers(teams.away) };
    attack(activeHome, activeAway, "home", atMinute);
    attack(activeAway, activeHome, "away", atMinute);
    if (events.length === before && atMinute % 3 === 0) buildup(atMinute);
  }
  return { homeGoal, awayGoal, events, teams, abandoned: null, playedUntil: Math.min(minute + stepMinutes, endMinute) };
}

export function decisionFromEvents(events, context = {}) {
  const chance = events.findLast(event => event.side === "away" && ["goal", "shot"].includes(event.kind));
  if (!chance) return null;
  const late = context.minute >= 75;
  const lead = context.homeScore > context.awayScore;
  const trail = context.homeScore < context.awayScore;
  if (late && lead) return {
    minute: context.minute, type: "protect-lead",
    title: "Protect the lead or chase another goal?",
    text: `You lead ${context.homeScore}–${context.awayScore} late in the match. ${chance.playerName} has had a recent chance. Going compact reduces their opportunities but also limits your route to another goal.`,
    choices: [
      { label: "Protect the shape and reduce attacking commitments", tactic: "protect", note: "Reduce opposition shots by 20%, but reduce your own by 25%. A lower chance volume does not guarantee a clean sheet." },
      { label: "Keep the current approach", tactic: "balanced", note: "Keep a route forward without taking extra risks." },
      { label: "Go for the goal that could settle it", tactic: "allout", note: "Send more players on. You may find another goal, but could leave space at the back." },
    ],
  };
  if (late && trail) return {
    minute: context.minute, type: "chase-game",
    title: "You are behind. How much will you risk?",
    text: `You trail ${context.homeScore}–${context.awayScore}. More attacking commitments may help you equalize, but ${chance.playerName} remains a threat at the other end.`,
    choices: [
      { label: "Send players forward for an equalizer", tactic: "allout", note: "You may create more chances, but they could hit you on the counter." },
      { label: `Stop ${chance.creatorName || "their midfield"} getting the ball`, tactic: "cutservice", targetId: chance.creatorId, note: "Make it harder for their main creator to find the ball, though it may slow your attacks too." },
      { label: "Keep the current approach", tactic: "balanced", note: "Stay patient and avoid opening up the match." },
    ],
  };
  const attempts = events.filter(event => event.side === "away" && ["shot", "goal"].includes(event.kind) && event.playerId === chance.playerId).length;
  return {
    minute: context.minute ?? events.at(-1).minute,
    type: attempts >= 2 ? "repeated-threat" : "new-threat",
    title: attempts >= 2 ? `${chance.playerName} keeps finding shots` : `How do you respond to ${chance.playerName}?`,
    text: `${chance.playerName} just had a shot${chance.creatorName ? ` after a pass from ${chance.creatorName}` : ""}. ${context.minute >= 75 ? "Time is running out. " : ""}${context.homeScore > context.awayScore ? "You lead: protect it or keep attacking?" : context.homeScore < context.awayScore ? "You trail: take risks or control their threat?" : "The score is level: how much risk will you take?"}`,
    choices: [
      { label: `Stay close to ${chance.playerName}`, tactic: "contain", targetId: chance.playerId,
        note: `Ask your players to give ${chance.playerName} less time and space.` },
      { label: `Stop ${chance.creatorName || "their midfield"} finding them`, tactic: "cutservice", targetId: chance.creatorId,
        note: "Try to cut off the supply before another chance can develop." },
      { label: "Keep players forward and attack", tactic: "allout",
        note: "Look for a goal, but be ready to defend a counterattack." },
    ],
  };
}
