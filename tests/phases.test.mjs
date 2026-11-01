import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addedMinutes, initialPhase, matchMinute, phaseBoundary, progressPhase } from '../src/match-engine/phases.js';
import { decisionFromEvents } from '../src/match-engine/simulation.js';

test('halftime follows 45 plus recorded first-half stoppages; second half starts at 45', () => {
  const events = [{ minute: 12, kind: 'goal', stoppageSeconds: 30 }, { minute: 25, kind: 'goal', stoppageSeconds: 30 }];
  const first = progressPhase(initialPhase(), 45, events);
  assert.equal(first.state.phase, 'first-added');
  assert.equal(first.state.firstAdded, 1);
  assert.equal(phaseBoundary(first.state), 46);
  assert.equal(matchMinute(46, first.state), "45+1'");
  const half = progressPhase(first.state, 46, events);
  assert.equal(half.state.phase, 'halftime');
  assert.equal(half.state.halfTimeAt, 46);
  assert.equal(matchMinute(46, half.state), 'HALF TIME');
  const second = { ...half.state, phase: 'second-half' };
  assert.equal(matchMinute(46, second), "45'");
  assert.equal(phaseBoundary(second), 91);
});

test('second-half added time is separate and goals during it can extend play', () => {
  const state = { phase: 'second-half', firstAdded: 2, halfTimeAt: 47, secondAdded: 0 };
  const events = [{ minute: 20, stoppageSeconds: 600 }, { minute: 65, stoppageSeconds: 30 }];
  const added = progressPhase(state, 92, events);
  assert.equal(added.state.secondAdded, 1);
  assert.equal(added.state.phase, 'second-added');
  const extension = progressPhase(added.state, 93, [...events, { minute: 93, stoppageSeconds: 60 }]);
  assert.equal(extension.state.secondAdded, 2);
  assert.equal(extension.state.phase, 'second-added');
  assert.equal(matchMinute(93, extension.state), "90+1'");
  const full = progressPhase(extension.state, 94, [...events, { minute: 93, stoppageSeconds: 60 }]);
  assert.equal(full.state.phase, 'full-time');
  assert.equal(full.notices.at(-1).text, 'Full time!');
});

test('zero stoppages produce no invented added time and extreme simulations stay bounded', () => {
  assert.equal(addedMinutes([]), 0);
  assert.equal(progressPhase(initialPhase(), 45, []).state.phase, 'halftime');
  assert.equal(addedMinutes([{ stoppageSeconds: 100000 }]), 15);
});

test('late leads, late deficits, and repeated threats yield different tactical situations', () => {
  const shot = { minute: 75, kind: 'shot', side: 'away', playerId: '2097', playerName: 'Messi', creatorId: '2099', creatorName: 'Neymar' };
  const lead = decisionFromEvents([shot], { minute: 75, homeScore: 2, awayScore: 1 });
  const trail = decisionFromEvents([shot], { minute: 75, homeScore: 1, awayScore: 2 });
  const repeated = decisionFromEvents([shot, shot], { minute: 30, homeScore: 0, awayScore: 0 });
  assert.equal(lead.type, 'protect-lead');
  assert.ok(lead.choices.some(choice => choice.tactic === 'protect'));
  assert.equal(trail.type, 'chase-game');
  assert.equal(trail.choices[0].tactic, 'allout');
  assert.equal(repeated.type, 'repeated-threat');
  assert.notEqual(lead.title, trail.title);
  assert.notEqual(trail.title, repeated.title);
});
