import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tickClock, formatTime } from '../src/match-engine/clock.js';
import { sanitizeSettings } from '../src/data/settings.js';
import { careerUsage } from '../src/data/careerUsage.js';
import { opponentEditor, validLineup } from '../src/data/lineups.js';

test('3, 5 and 10 minute clocks advance at the configured rate and stop while paused', () => {
  for (const durationMinutes of [3, 5, 10]) {
    const initial = { elapsed: 0, remaining: 20000, decisionKey: null };
    const options = { deltaMs: durationMinutes * 60000 / 90 + 1, paused: false, decision: null, durationMinutes, decisionSeconds: 20, timedDecisions: true, minute: 0 };
    const next = tickClock(initial, options);
    assert.equal(next.advance, true);
    const paused = tickClock(next, { ...options, paused: true, deltaMs: 999999 });
    assert.equal(paused.elapsed, next.elapsed);
    assert.equal(paused.advance, false);
    const end = tickClock(initial, { ...options, deltaMs: durationMinutes * 60000 * 2, minute: 89 });
    assert.equal(end.elapsed, durationMinutes * 60000);
    assert.equal(end.advance, true);
  }
  assert.equal(formatTime(180000), '3:00');
  assert.equal(formatTime(-10), '0:00');
});

test('decisions pause playing time, expire on schedule, and can be paused or untimed', () => {
  const initial = { elapsed: 30000, remaining: 20000, decisionKey: null };
  const options = { deltaMs: 5000, paused: false, decision: 15, durationMinutes: 3, decisionSeconds: 5, timedDecisions: true, minute: 15 };
  const next = tickClock(initial, options);
  assert.equal(next.elapsed, 30000);
  assert.equal(next.remaining, 0);
  assert.equal(next.expired, true);
  assert.equal(next.advance, false);
  assert.equal(tickClock(initial, { ...options, paused: true }).expired, false);
  assert.equal(tickClock(initial, { ...options, timedDecisions: false }).expired, false);
  const resumed = tickClock(next, { ...options, decision: null, deltaMs: 100 });
  assert.equal(resumed.elapsed, 30100);
  assert.equal(resumed.decisionKey, null);
});

test('usage combines seasons, counts a person once per match, and tolerates older saves', () => {
  const player = { databaseId: '2097', id: 'csv-lionel-messi', name: 'Lionel Messi' };
  const usage = careerUsage([
    { opponent: 'Barcelona', startingXI: [player, player], opponentXI: [{ id: '8260', name: 'Erling Haaland' }] },
    { opponent: 'Barcelona', startingXI: [{ id: '2097', name: 'Lionel Messi' }], opponentXI: [] },
    { opponent: 'Milan' },
  ]);
  assert.equal(usage.own[0].count, 2);
  assert.equal(usage.against[0].count, 1);
  assert.deepEqual(usage.clubs[0], { name: 'Barcelona', count: 2 });
  assert.equal(usage.missingLineups, 1);
});

test('settings clamp invalid values, and incomplete opponent XIs block kickoff', () => {
  const safe = sanitizeSettings({ durationMinutes: 100, decisionSeconds: -1, autoPlay: 'false' });
  assert.equal(safe.durationMinutes, 10);
  assert.equal(safe.decisionSeconds, 5);
  assert.equal(safe.autoPlay, true);
  const empty = opponentEditor(null);
  assert.equal(validLineup(empty.lineup, empty.roster), false);
  const roster = Array.from({ length: 11 }, (_, index) => ({ id: String(index), name: String(index) }));
  assert.equal(validLineup(roster.map(player => player.id), roster), true);
  assert.equal(validLineup(Array(11).fill('0'), roster), false);
});
