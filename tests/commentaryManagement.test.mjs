import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateStep } from '../src/match-engine/simulation.js';
import { isShotEvent } from '../src/match-engine/commentary.js';
import { managementSituation, shouldOfferDecision } from '../src/match-engine/management.js';
import { pitchFrame } from '../src/match-engine/pitchView.js';

const home = { name: 'Home', formation: '4-3-3', players: Array.from({ length: 11 }, (_, index) => ({ id: `home-${index}`, name: `Home Player ${index}`, role: index ? 'CM' : 'GK', stats: {} })) };
const away = { name: 'Away', formation: '4-3-3', players: home.players.map((player, index) => ({ ...player, id: `away-${index}`, name: `Away Player ${index}` })) };

test('decisions react to goals and rotate into bench and late level situations', () => {
  for (const side of ['home', 'away']) {
    const situation = managementSituation({ home, away, events: [{ kind: 'goal', side, playerName: 'Scorer' }], context: { minute: 30, homeScore: 1, awayScore: 1 } });
    assert.equal(situation.type, side === 'home' ? 'after-scoring' : 'after-conceding');
  }
  const context = { minute: 72, homeScore: 1, awayScore: 1, canSubstitute: true };
  const bench = managementSituation({ home, away, events: [], context, recentTypes: ['stalled-attack'] });
  assert.equal(bench.type, 'bench-impact');
  assert.ok(bench.choices.some(choice => choice.action === 'substitute' && home.players.some(player => player.id === choice.playerId)));
  const late = managementSituation({ home, away, events: [], context, recentTypes: ['stalled-attack', 'bench-impact'] });
  assert.equal(late.type, 'late-level');
  const noBench = managementSituation({ home, away, events: [], context: { ...context, canSubstitute: false }, recentTypes: ['stalled-attack'] });
  assert.ok(noBench.choices.every(choice => choice.action !== 'substitute'));
});

test('quiet play produces named, recorded buildups rather than repeated no-shot filler', () => {
  const history = [];
  for (let minute = 0; minute < 30; minute++) {
    const result = simulateStep({ home, away, minute, stepMinutes: 1, recentEvents: history, random: () => .8 });
    assert.equal(result.homeGoal + result.awayGoal, 0);
    history.push(...result.events);
  }
  assert.equal(history.length, 10);
  assert.ok(history.every(event => event.kind === 'buildup' && !isShotEvent(event)));
  assert.ok(history.every(event => !event.text.includes('Neither Home nor Away')));
  assert.equal(new Set(history.slice(0, 6).map(event => event.commentaryKey)).size, 6);
  assert.ok(history.every((event, index) => !index || event.text !== history[index - 1].text));
  for (const event of history) {
    const team = event.side === 'home' ? home : away;
    const opposition = event.side === 'home' ? away : home;
    assert.ok(team.players.some(player => player.id === event.playerId && event.text.includes(player.name)));
    assert.ok(team.players.some(player => player.id === event.creatorId));
    assert.ok(opposition.players.some(player => player.id === event.opponentPlayerId));
  }
});

test('management prompts happen without opposition shots and respond to misses and passing losses', () => {
  const context = { minute: 8, homeScore: 0, awayScore: 0 };
  const quiet = managementSituation({ home, events: [], context });
  assert.equal(quiet.type, 'stalled-attack');
  assert.ok(quiet.choices.some(choice => choice.tactic === 'playmaker'));
  const misses = [0, 1].map(index => ({ kind: 'shot', side: 'home', outcome: 'wide', playerName: `Home Player ${index}` }));
  const missed = managementSituation({ home, events: misses, context });
  assert.equal(missed.type, 'missed-chances');
  const rotated = managementSituation({ home, events: misses, context, recentTypes: ['missed-chances'] });
  assert.notEqual(rotated.type, 'missed-chances');
  const losses = misses.map(event => ({ ...event, kind: 'buildup', outcome: 'intercepted', creatorName: 'Home Player 2' }));
  assert.equal(managementSituation({ home, events: losses, context }).type, 'passing-losses');
  assert.equal(shouldOfferDecision(8, 0, []), true);
  assert.equal(shouldOfferDecision(6, 0, [{ kind: 'goal' }]), true);
  assert.equal(shouldOfferDecision(4, 0, [{ kind: 'goal' }]), false);
});

test('patient instructions affect actual buildup outcomes and conversion probability', () => {
  const normal = simulateStep({ home, away, minute: 2, stepMinutes: 1, random: () => .25 });
  const patient = simulateStep({ home, away, minute: 2, stepMinutes: 1, random: () => .25, tactic: 'patient' });
  assert.equal(normal.events[0].outcome, 'intercepted');
  assert.equal(patient.events[0].outcome, 'crowded-out');
  const normalShot = simulateStep({ home, away, minute: 0, stepMinutes: 1, random: () => 0 }).events.find(event => event.side === 'home');
  const patientShot = simulateStep({ home, away, minute: 0, stepMinutes: 1, random: () => 0, tactic: 'patient' }).events.find(event => event.side === 'home');
  assert.ok(patientShot.scoringProbability > normalShot.scoringProbability);
});

test('buildup animation ends at the involved defender, not the goal', () => {
  const action = { kind: 'buildup', side: 'home', creatorId: 'home-5', playerId: 'home-8', opponentPlayerId: 'away-3', outcome: 'intercepted' };
  const frame = pitchFrame({ teams: { home, away }, homeFormation: '4-3-3', action, progress: 1 });
  const defender = frame.players.find(player => player.id === 'away-3');
  assert.ok(Math.abs(frame.ball.x - defender.x) < 1e-8);
  assert.ok(Math.abs(frame.ball.y - defender.y) < 1e-8);
});
