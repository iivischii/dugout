import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pitchFrame } from '../src/match-engine/pitchView.js';

const players = Array.from({ length: 11 }, (_, index) => ({ id: `player-${index}`, number: index + 1, name: `Player ${index}` }));
const teams = { home: { name: 'Home', players }, away: { name: 'Away', formation: '4-3-3', players } };

test('shared pitch contains both XIs, scoped identities, and bounded moving positions', () => {
  const first = pitchFrame({ teams, homeFormation: '4-2-3-1' });
  const next = pitchFrame({ teams, homeFormation: '4-2-3-1', motionTime: 1000 });
  assert.equal(first.players.length, 22);
  assert.equal(new Set(first.players.map(player => player.key)).size, 22);
  assert.ok(first.players.every(player => player.x >= 6 && player.x <= 94 && player.y >= 6 && player.y <= 94));
  assert.notEqual(first.players[1].x, next.players[1].x);
  assert.ok(first.players.find(player => player.key === 'home-player-0').y > 80);
  assert.ok(first.players.find(player => player.key === 'away-player-0').y < 20);
});

test('teams change ends after halftime and goal animation follows the scoring team', () => {
  const action = { side: 'home', creatorId: 'player-7', playerId: 'player-10', kind: 'goal' };
  const before = pitchFrame({ teams, homeFormation: '4-2-3-1', action, progress: 1 });
  const after = pitchFrame({ teams, homeFormation: '4-2-3-1', action, progress: 1, secondHalf: true });
  assert.ok(Math.abs(before.ball.y - 2) < 1e-8);
  assert.ok(Math.abs(after.ball.y - 98) < 1e-8);
  assert.ok(after.players.find(player => player.key === 'home-player-0').y < 20);
  assert.ok(after.players.find(player => player.key === 'away-player-0').y > 80);
});

test('ball uses the actual creator, shooter and defending keeper without mutating team data', () => {
  const original = JSON.stringify(teams);
  const action = { side: 'away', creatorId: 'player-6', playerId: 'player-10', kind: 'shot', outcome: 'saved' };
  const pass = pitchFrame({ teams, homeFormation: '4-2-3-1', action, progress: 0 });
  const creator = pass.players.find(player => player.side === 'away' && player.id === action.creatorId);
  assert.equal(pass.ball.x, creator.x);
  assert.equal(pass.ball.y, creator.y);
  const save = pitchFrame({ teams, homeFormation: '4-2-3-1', action, progress: 1 });
  const keeper = save.players.find(player => player.side === 'home' && player.role === 'GK');
  assert.equal(save.ball.x, keeper.x);
  assert.equal(save.ball.y, keeper.y);
  assert.equal(JSON.stringify(teams), original);
});
