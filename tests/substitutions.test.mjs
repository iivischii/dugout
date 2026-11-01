import { test } from 'node:test';
import assert from 'node:assert/strict';
import { substitute, eligibleSubstitutes } from '../src/match-engine/substitutions.js';
import { careerUsage } from '../src/data/careerUsage.js';

test('substitutions update the active XI and preserve kickoff players, role and real incoming statistics', () => {
  const starters = Array.from({ length: 11 }, (_, index) => ({ id: `starter-${index}`, name: `Starter ${index}`, role: index ? 'CM' : 'GK' }));
  const reserve = { id: 'reserve', name: 'Reserve', role: 'ST', stats: { goals: 12 } };
  const team = { players: starters };
  const result = substitute(team, [...starters, reserve], [], 'starter-5', 'reserve');
  assert.equal(result.team.players.length, 11);
  assert.equal(result.team.players[5].id, 'reserve');
  assert.equal(result.team.players[5].role, 'CM');
  assert.equal(result.team.players[5].stats.goals, 12);
  assert.equal(starters[5].id, 'starter-5');
  assert.ok(!eligibleSubstitutes([...starters, reserve], result.team.players, [result.change]).some(player => player.id === 'starter-5'));
  assert.throws(() => substitute(result.team, [...starters, reserve], [result.change], 'reserve', 'starter-5'), /eligible/);
});

test('five changes reach the limit, and active or already-used players cannot be brought on', () => {
  let team = { players: Array.from({ length: 11 }, (_, index) => ({ id: `start-${index}`, name: `Start ${index}`, role: 'CM' })) };
  const roster = [...team.players, ...Array.from({ length: 7 }, (_, index) => ({ id: `bench-${index}`, name: `Bench ${index}`, role: 'CM' }))];
  const history = [];
  assert.throws(() => substitute(team, roster, history, 'start-0', 'start-1'), /eligible/);
  for (let index = 0; index < 5; index++) {
    const next = substitute(team, roster, history, `start-${index}`, `bench-${index}`);
    team = next.team;
    history.push(next.change);
  }
  assert.equal(history.length, 5);
  assert.throws(() => substitute(team, roster, history, 'start-5', 'bench-5'), /limit/);
  assert.equal(new Set(team.players.map(player => player.id)).size, 11);
});

test('a substitute appearance counts once in career usage and duplicate person IDs cannot re-enter', () => {
  const off = { id: 'first', databaseId: '1', name: 'Original', role: 'CM' };
  const on = { id: 'next', databaseId: '2', name: 'Replacement', role: 'CM' };
  const alternative = { id: 'another-season', databaseId: '1', name: 'Original' };
  const result = substitute({ players: [off] }, [off, on, alternative], [], 'first', 'next');
  assert.equal(eligibleSubstitutes([off, on, alternative], result.team.players, [result.change]).length, 0);
  const usage = careerUsage([{ startingXI: [off], opponentXI: [], substitutions: [result.change] }]);
  assert.ok(usage.own.some(player => player.name === 'Replacement' && player.count === 1));
});
