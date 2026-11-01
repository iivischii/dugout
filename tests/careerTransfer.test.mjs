import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeCareers } from '../src/data/careerTransfer.js';

test('cloud transfer preserves both archives, deduplicates IDs, and keeps established manager identity', () => {
  const shared = { id: 'shared', date: '2026-10-10', goalsFor: 2 };
  const local = { managerName: 'Local', matches: [{ id: 'new', date: '2026-11-01' }, { ...shared, goalsFor: 5 }] };
  const cloud = { managerName: 'Cloud', matches: [shared, { id: 'old', date: '2026-09-01' }] };
  const merged = mergeCareers(cloud, local);
  assert.equal(merged.managerName, 'Cloud');
  assert.deepEqual(merged.matches.map(match => match.id), ['new', 'shared', 'old']);
  assert.equal(merged.matches[1].goalsFor, 2);
  assert.equal(local.matches[1].goalsFor, 5);
  assert.equal(cloud.matches.length, 2);
  assert.deepEqual(mergeCareers({ managerName: '', matches: [] }, local), local);
});
