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

export function simulateStep({ home, away, minute, tactic = "balanced", targetId = null, random = Math.random, stepMinutes = 5, endMinute = 90, recentEvents = [], score = { home: 0, away: 0 }, regulationStart = minute }) {
  const events = [];
  let teams = { home, away };
  let homeGoal = 0, awayGoal = 0;
  const attack = (team, defending, side, atMinute) => {
    const profiles = new Map(team.players.map(player => [player.id, attackProfile(player)]));
    const weight = player => player.role === "GK" ? 0 : profiles.get(player.id).shots * (side === "away" && tactic === "contain" && player.id === targetId ? .65 : 1);
    let total = team.players.reduce((sum, player) => sum + weight(player), 0);
    if (side === "home" && tactic === "allout") total *= 1.2;
    if (side === "away" && tactic === "allout") total *= 1.15;
    if (side === "home" && tactic === "contain") total *= .9;
    if (side === "away" && tactic === "cutservice") total *= .85;
    if (side === "home" && tactic === "cutservice") total *= .95;
    if (side === "home" && tactic === "protect") total *= .75;
    if (side === "away" && tactic === "protect") total *= .8;
    if (side === "home" && tactic === "patient") total *= .9;
    if (side === "away" && tactic === "patient") total *= .95;
    if (side === "home" && tactic === "playmaker") total *= 1.05;
    if (side === "away" && tactic === "playmaker") total *= 1.1;
    if (side === "home" && tactic === "cautious") total *= .9;
    if (side === "away" && tactic === "cautious") total *= 1.05;
    if (tactic === "waste-time") total *= side === "home" ? .7 : .8;
    // A missing defender creates extra exposure; this is a model modifier.
    total *= 1 + Math.max(0, 11 - defending.players.length) * .12;
    if (random() >= 1 - Math.exp(-total / 90)) return;
    const shooter = weightedPlayer(team.players, weight, random);
    const others = team.players.filter(player => player.id !== shooter.id && player.role !== "GK");
    const creator = weightedPlayer(others, player => profiles.get(player.id).creation * (side === "away" && tactic === "cutservice" && player.id === targetId ? .5 : side === "home" && tactic === "playmaker" && player.id === targetId ? 1.6 : 1), random);
    const conversion = clamp(profiles.get(shooter.id).conversion * (side === "home" && tactic === "patient" ? 1.12 : 1), 0, .6);
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
    const team = { ...teams[side], players: activePlayers(teams[side]) };
    const other = side === "home" ? "away" : "home";
    const opposition = { ...teams[other], players: activePlayers(teams[other]) };
    const outfield = team.players.filter(player => player.role !== "GK");
    const passer = weightedPlayer(outfield, player => attackProfile(player).creation * (side === "home" && tactic === "playmaker" && player.id === targetId ? 1.6 : 1), random);
    const receiver = weightedPlayer(outfield.filter(player => player.id !== passer.id), player => attackProfile(player).creation + attackProfile(player).shots, random);
    const defenders = opposition.players.filter(player => ["CB", "LB", "RB", "CDM", "LWB", "RWB"].includes(player.role));
    const defender = defenders[Math.min(defenders.length - 1, Math.floor(random() * defenders.length))] || opposition.players[1];
    const roll = random();
    const lossChance = side === "home" && tactic === "patient" ? .2 : .35;
    const outcome = roll < lossChance ? "intercepted" : roll < .65 ? "crowded-out" : "recycled";
    const commentary = buildUpCommentary({ side, passer, receiver, defender, outcome }, team, opposition, [...recentEvents, ...events], random);
    events.push({ id: crypto.randomUUID(), minute: atMinute, kind: "buildup", side, outcome, ...commentary,
      creatorId: passer.id, creatorName: passer.name, playerId: receiver.id, playerName: receiver.name,
      opponentPlayerId: defender.id, opponentPlayerName: defender.name });
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
      { label: "Stay balanced and keep a route forward", tactic: "balanced", note: "Remove the extra risk modifiers. You keep your normal attacking volume and normal defensive exposure." },
      { label: "Go for the goal that could settle it", tactic: "allout", note: "Gain 20% more shot opportunities, while allowing 15% more for the opposition." },
    ],
  };
  if (late && trail) return {
    minute: context.minute, type: "chase-game",
    title: "You are behind. How much will you risk?",
    text: `You trail ${context.homeScore}–${context.awayScore}. More attacking commitments may help you equalize, but ${chance.playerName} remains a threat at the other end.`,
    choices: [
      { label: "Commit forward for an equalizer", tactic: "allout", note: "Add 20% to your shot volume, but allow 15% more opposition shots. You may concede again." },
      { label: `Disrupt ${chance.creatorName || "their midfield"} before opening up`, tactic: "cutservice", targetId: chance.creatorId, note: "Cut their shot volume by 15% and this creator's involvement by 50%, but sacrifice 5% of yours while time is running out." },
      { label: "Keep the balance and trust the current chances", tactic: "balanced", note: "Use normal shot volumes for both teams. You avoid the extra exposure but create no urgency boost." },
    ],
  };
  const attempts = events.filter(event => event.side === "away" && ["shot", "goal"].includes(event.kind) && event.playerId === chance.playerId).length;
  return {
    minute: context.minute ?? events.at(-1).minute,
    type: attempts >= 2 ? "repeated-threat" : "new-threat",
    title: attempts >= 2 ? `${chance.playerName} keeps finding shots` : `How do you respond to ${chance.playerName}?`,
    text: `${chance.playerName} just had a shot${chance.creatorName ? ` after a pass from ${chance.creatorName}` : ""}. ${context.minute >= 75 ? "Time is running out. " : ""}${context.homeScore > context.awayScore ? "You lead: protect it or keep attacking?" : context.homeScore < context.awayScore ? "You trail: take risks or control their threat?" : "The score is level: how much risk will you take?"}`,
    choices: [
      { label: `Close down ${chance.playerName} before the shot`, tactic: "contain", targetId: chance.playerId,
        note: `Cut ${chance.playerName}'s shot weight by 35%, but lose 10% of your own shot volume.` },
      { label: `Cut the service from ${chance.creatorName || "their midfield"}`, tactic: "cutservice", targetId: chance.creatorId,
        note: "Reduce their shots by 15% and this creator's involvement by 50%, but lose 5% of your own shot volume." },
      { label: "Keep players forward and attack", tactic: "allout",
        note: "Create 20% more shot opportunities, but give the opposition 15% more too." },
    ],
  };
}
