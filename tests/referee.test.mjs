import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activePlayers, disciplinaryProfile, giveCard, refereeStep, refereeSummary } from '../src/match-engine/referee.js';
import { simulateStep } from '../src/match-engine/simulation.js';
import { managementSituation, shouldOfferDecision } from '../src/match-engine/management.js';
import { substitute, eligibleSubstitutes } from '../src/match-engine/substitutions.js';
import { addedMinutes, matchMinute } from '../src/match-engine/phases.js';
import { pitchFrame } from '../src/match-engine/pitchView.js';

const team = (prefix = 'p') => ({ name: prefix, formation: '4-3-3', players: Array.from({ length: 11 }, (_, index) => ({ id: `${prefix}${index}`, name: `${prefix} Player ${index}`, number: index + 1, role: index ? 'CB' : 'GK', stats: {} })) });
const sequence = values => () => values.length ? values.shift() : 0;

test('disciplinary history uses available card totals with missing-data priors', () => {
  const high = disciplinaryProfile({ stats: { minutes: 1800, yellowCards: 8, redCards: 1 } });
  const low = disciplinaryProfile({ stats: { minutes: 1800, yellowCards: 0, redCards: 0 } });
  assert.ok(high.yellow > low.yellow);
  assert.ok(high.red > low.red);
  assert.deepEqual(disciplinaryProfile({}), { yellow: .2, red: .01 });
});

test('second yellow removes a player without compressing formation slots or permitting replacement', () => {
  const original = team();
  const first = giveCard(original, 'p3', 'yellow', { side: 'home', minute: 10, reason: 'a reckless challenge' });
  assert.equal(activePlayers(first.team).length, 11);
  const second = giveCard(first.team, 'p3', 'yellow', { side: 'home', minute: 20, reason: 'another reckless challenge' });
  assert.equal(second.events[0].card, 'second-yellow');
  assert.equal(activePlayers(second.team).length, 10);
  assert.equal(second.team.players[4].id, 'p4');
  assert.equal(original.players[3].sentOff, undefined);
  assert.equal(eligibleSubstitutes(original.players, second.team.players, []).length, 0);
  assert.throws(() => substitute(second.team, [...original.players, { id: 'bench', name: 'Bench' }], [], 'p3', 'bench'), /currently on the pitch/);
  const frame = pitchFrame({ teams: { home: second.team, away: team('q') }, homeFormation: '4-3-3' });
  assert.equal(frame.players.filter(player => player.side === 'home').length, 10);
  assert.ok(!frame.players.some(player => player.key === 'home-p3'));
  assert.deepEqual(refereeSummary([...first.events, ...second.events]).home, { fouls: 0, yellows: 2, reds: 1, delayingRestarts: 0 });
});

test('foul events award a restart, carry delay, and can produce a caution', () => {
  const result = refereeStep({ home: team(), away: team('q') }, 12, { random: sequence([.99, 0, 0, .9, 0, 0]) });
  assert.equal(result.events[0].kind, 'foul');
  assert.equal(result.events[0].restart, 'free-kick');
  assert.equal(result.events[1].card, 'yellow');
  assert.ok(result.events.every(event => event.stoppageSeconds > 0));
  assert.equal(refereeSummary(result.events).home.fouls, 1);
});

test('excessive delaying can dismiss a booked keeper and all recorded delays contribute to added time', () => {
  const original = { home: team(), away: team('q') };
  const first = refereeStep(original, 80, { tactic: 'waste-time', random: sequence([0, .9, 0, 0, 0, 0]) });
  assert.ok(first.events.some(event => event.kind === 'timewasting' && event.excessive));
  assert.equal(first.teams.home.players[0].matchYellowCards, 1);
  assert.equal(addedMinutes(first.events), 1);
  const second = refereeStep(first.teams, 81, { tactic: 'waste-time', random: sequence([0, .9, 0, 0, 0, 0]) });
  assert.equal(second.teams.home.players[0].sentOff, true);
  assert.equal(activePlayers(second.teams.home).length, 10);
  assert.ok(activePlayers(second.teams.home).some(player => player.role === 'GK' && player.emergencyGoalkeeper));
});

test('straight red affects later simulation participants and fewer than seven stops play', () => {
  const result = simulateStep({ home: team(), away: team('q'), minute: 0, stepMinutes: 1, random: sequence([.99, 0, 0, 0, 0]) });
  const red = result.events.find(event => event.kind === 'card' && event.card === 'red');
  assert.ok(red);
  assert.ok(result.events.filter(event => event.side === 'home' && ['shot', 'goal'].includes(event.kind)).every(event => event.playerId !== red.playerId && event.creatorId !== red.playerId));
  let home = team();
  for (let index = 1; index <= 5; index++) home = giveCard(home, `p${index}`, 'red', { side: 'home', minute: index, reason: 'serious foul play' }).team;
  const stopped = refereeStep({ home, away: team('q') }, 6, { random: () => 0 });
  assert.equal(stopped.abandoned, 'home');
  assert.equal(stopped.events.at(-1).kind, 'abandoned');
  assert.equal(matchMinute(6, { phase: 'abandoned' }), 'ABANDONED');
});

test('cards produce management decisions and late leads offer time-wasting with explicit risk', () => {
  const booked = giveCard(team(), 'p1', 'yellow', { side: 'home', minute: 10, reason: 'a reckless challenge' });
  const situation = managementSituation({ home: booked.team, away: team('q'), events: booked.events, context: { minute: 10, homeScore: 0, awayScore: 0, canSubstitute: true } });
  assert.equal(situation.type, 'booking-risk');
  assert.ok(situation.choices.some(choice => choice.action === 'substitute' && choice.playerId === 'p1'));
  assert.ok(situation.choices.some(choice => choice.tactic === 'cautious' && choice.targetId === 'p1'));
  assert.equal(shouldOfferDecision(12, 10, booked.events.map(event => ({ ...event, minute: 11 }))), true);
  assert.equal(shouldOfferDecision(12, 10, booked.events), false);
  const late = managementSituation({ home: team(), away: team('q'), events: [], context: { minute: 80, homeScore: 1, awayScore: 0 } });
  assert.ok(late.choices.some(choice => choice.tactic === 'waste-time'));
});

test('newest active booking is prioritized and delaying cautions offer prompt restarts', () => {
  const keeper = giveCard(team(), 'p0', 'yellow', { side: 'home', minute: 70, reason: 'excessively delaying the restart' });
  const delay = managementSituation({ home: keeper.team, events: keeper.events, context: { minute: 70, homeScore: 1, awayScore: 0 } });
  assert.match(delay.choices[0].label, /restarts promptly/);
  assert.equal(delay.choices[0].tactic, 'balanced');
  const next = giveCard(keeper.team, 'p2', 'yellow', { side: 'home', minute: 72, reason: 'a reckless challenge' });
  const fresh = managementSituation({ home: next.team, events: [...keeper.events, ...next.events], context: { minute: 72, homeScore: 1, awayScore: 0 } });
  assert.match(fresh.title, /p Player 2/);
  assert.equal(fresh.choices[0].targetId, 'p2');
});
