export const activePlayers = team => team.players.filter(player => !player.sentOff);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Disciplinary totals are real where present. Missing values use model priors.
export function disciplinaryProfile(player) {
  const stats = player.stats || {};
  const minutes = Number(stats.minutes) || 0;
  const rate = (total, prior) => Number.isFinite(total) && minutes > 0 ? (total * 90 + prior * 900) / (minutes + 900) : prior;
  return { yellow: rate(stats.yellowCards, .2), red: rate(stats.redCards, .01) };
}

function choose(players, weight, random) {
  const total = players.reduce((sum, player) => sum + weight(player), 0);
  let roll = random() * total;
  return players.find(player => (roll -= weight(player)) < 0) || players.at(-1);
}

export function giveCard(team, playerId, card, { side, minute, reason }) {
  const player = team.players.find(item => item.id === playerId && !item.sentOff);
  if (!player) throw new Error("Cards can only be given to an active player.");
  const yellows = (player.matchYellowCards || 0) + (card === "yellow" ? 1 : 0);
  const sentOff = card === "red" || yellows >= 2;
  const actualCard = card === "red" ? "red" : sentOff ? "second-yellow" : "yellow";
  const updated = { ...player, matchYellowCards: yellows, sentOff, dismissalReason: sentOff ? actualCard : null };
  let players = team.players.map(item => item.id === player.id ? updated : item);
  const events = [{ id: crypto.randomUUID(), minute, kind: "card", side, card: actualCard, playerId, playerName: player.name, reason,
    stoppageSeconds: sentOff ? 45 : 20,
    text: actualCard === "second-yellow" ? `Second yellow — ${player.name} is sent off for ${reason}. ${team.name} must play with one fewer player.`
      : actualCard === "red" ? `Straight red! ${player.name} is sent off for ${reason}. They cannot be replaced.`
      : `Yellow card for ${player.name}: ${reason}. Another caution will mean a dismissal.` }];
  const active = players.filter(item => !item.sentOff);
  if (sentOff && active.length >= 7 && !active.some(item => item.role === "GK")) {
    const standIn = active[0];
    players = players.map(item => item.id === standIn.id ? { ...item, role: "GK", emergencyGoalkeeper: true } : item);
    events.push({ id: crypto.randomUUID(), minute, kind: "info", text: `${standIn.name} takes over in goal. You can bring on a goalkeeper for an eligible remaining player if substitutions are available.` });
  }
  return { team: { ...team, players }, events };
}

export function refereeStep(teams, minute, { tactic = "balanced", targetId = null, score = { home: 0, away: 0 }, regulationMinute = minute, random = Math.random } = {}) {
  let next = { home: { ...teams.home }, away: { ...teams.away } };
  const events = [];
  const apply = (side, player, card, reason) => {
    const result = giveCard(next[side], player.id, card, { side, minute, reason });
    next = { ...next, [side]: result.team };
    events.push(...result.events);
  };
  for (const side of ["home", "away"]) {
    const other = side === "home" ? "away" : "home";
    const outfield = activePlayers(next[side]).filter(player => player.role !== "GK");
    // 8% per team per game minute is an explicit prototype foul-rate assumption.
    if (outfield.length && random() > .92) {
      const offender = choose(outfield, player => (.5 + disciplinaryProfile(player).yellow) * (side === "home" && tactic === "cautious" && player.id === targetId ? .35 : 1), random);
      const opponents = activePlayers(next[other]).filter(player => player.role !== "GK");
      const victim = opponents[Math.min(opponents.length - 1, Math.floor(random() * opponents.length))];
      events.push({ id: crypto.randomUUID(), minute, kind: "foul", side, playerId: offender.id, playerName: offender.name,
        opponentPlayerId: victim?.id || null, opponentPlayerName: victim?.name || null, restart: "free-kick", stoppageSeconds: 15,
        text: `${offender.name} fouls ${victim?.name || "an opponent"}. The referee stops play and awards ${next[other].name} a free kick.` });
      const history = disciplinaryProfile(offender);
      if (random() < clamp(.005 + history.red * .1, .005, .08)) apply(side, offender, "red", "serious foul play");
      else if (random() < clamp(.15 + history.yellow * .35, .1, .65)) apply(side, offender, "yellow", "a reckless challenge");
    }
    if (activePlayers(next[side]).length < 7) {
      events.push({ id: crypto.randomUUID(), minute, kind: "abandoned", side, text: `The referee abandons the match: ${next[side].name} have fewer than seven players. No completed career result is recorded.` });
      return { teams: next, events, abandoned: side };
    }
    const delaying = side === "home" ? tactic === "waste-time" : regulationMinute >= 75 && score.away > score.home;
    if (delaying && random() > (side === "home" ? .65 : .85)) {
      const eligible = activePlayers(next[side]);
      const player = eligible[Math.min(eligible.length - 1, Math.floor(random() * eligible.length))];
      const excessive = random() < .6;
      const delay = 10 + Math.floor(random() * 16);
      events.push({ id: crypto.randomUUID(), minute, kind: "timewasting", side, playerId: player.id, playerName: player.name, excessive,
        stoppageSeconds: delay, text: excessive ? `${player.name} excessively delays a restart. The referee records the lost time and reaches for a yellow card.`
          : `${player.name} delays the restart. The referee warns them to get on with it and records ${delay} seconds to add back.` });
      if (excessive) apply(side, player, "yellow", "excessively delaying the restart");
      if (activePlayers(next[side]).length < 7) {
        events.push({ id: crypto.randomUUID(), minute, kind: "abandoned", side, text: `The referee abandons the match: ${next[side].name} have fewer than seven players. No completed career result is recorded.` });
        return { teams: next, events, abandoned: side };
      }
    }
  }
  return { teams: next, events, abandoned: null };
}

export function refereeSummary(events) {
  const count = (side, predicate) => events.filter(event => event.side === side && predicate(event)).length;
  return Object.fromEntries(["home", "away"].map(side => [side, {
    fouls: count(side, event => event.kind === "foul"),
    yellows: count(side, event => event.kind === "card" && ["yellow", "second-yellow"].includes(event.card)),
    reds: count(side, event => event.kind === "card" && ["red", "second-yellow"].includes(event.card)),
    delayingRestarts: count(side, event => event.kind === "timewasting"),
  }]));
}
