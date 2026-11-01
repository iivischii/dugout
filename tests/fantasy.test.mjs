import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Papa from 'papaparse';
import { buildOpponent, legends, datasetTeams } from '../src/data/fantasyTeams.js';
import { attackProfile, per90, simulateStep, decisionFromEvents } from '../src/match-engine/simulation.js';

const csv = Papa.parse(await readFile(new URL('../public/data/players.csv', import.meta.url), 'utf8'), { header: true, skipEmptyLines: true }).data;
const players = csv.map(row => ({ id: row.id, name: row.player_name, team: row.team_title, season: row.season, position: row.primary_position,
  stats: { minutes: Number(row.time), shots: Number(row.shots), goals: Number(row.goals), xG: Number(row.xG), keyPasses: Number(row.key_passes) } }));

test('all dataset clubs are selectable and historical seasons retain their records', () => {
  for (const club of datasetTeams(players)) {
    const team = buildOpponent(players, club);
    assert.ok(team, club);
    assert.equal(team.players.length, 11);
    assert.equal(new Set(team.players.filter(Boolean).map(player => player.id)).size, team.players.filter(Boolean).length);
    assert.ok(team.players.filter(Boolean).every(player => player.season === team.season));
  }
  const msn = buildOpponent(players, 'Barcelona', '2014/15');
  assert.deepEqual(msn.players.slice(-3).map(player => player.name).sort(), ['Neymar', 'Lionel Messi', 'Luis Suárez'].sort());
  assert.equal(msn.players.find(player => player.name === 'Lionel Messi').stats.goals, 43);
  assert.equal(msn.players.find(player => player.name === 'Luis Suárez').stats.minutes, 2182);
  assert.equal(buildOpponent([], 'Barcelona', '2014/15'), null);
  assert.equal(legends[0].name, 'Zinedine Zidane');
  assert.deepEqual(legends[0].stats, {});
  assert.equal(attackProfile(legends[0]).hasSeasonData, false);
});

test('model normalizes minutes, treats missing data honestly, and limits small-sample extremes', () => {
  assert.equal(per90(20, 1800), 1);
  assert.equal(per90(null, 1800), null);
  assert.equal(per90(10, 0), null);
  const a = attackProfile({ role: 'ST', stats: { shots: 100, minutes: 1800, xG: 15 } });
  const b = attackProfile({ role: 'ST', stats: { shots: 10, minutes: 1800, xG: 1 } });
  assert.ok(a.shots > b.shots);
  assert.ok(a.conversion > b.conversion);
  assert.ok(attackProfile({ role: 'ST', stats: { shots: 2, minutes: 1, xG: 1 } }).shots < 3);
});

test('scores, shot events, and specific decision targets refer only to the active XIs', () => {
  const away = buildOpponent(players, 'Barcelona', '2014/15');
  const home = buildOpponent(players, 'Manchester City');
  const result = simulateStep({ home, away, minute: 10, random: () => 0 });
  assert.equal(result.homeGoal, result.events.filter(event => event.side === 'home' && event.kind === 'goal').length);
  assert.equal(result.awayGoal, result.events.filter(event => event.side === 'away' && event.kind === 'goal').length);
  for (const event of result.events) {
    const team = event.side === 'home' ? home : away;
    assert.ok(team.players.some(player => player.id === event.playerId));
    assert.ok(event.minute > 10 && event.minute <= 15);
  }
  const choice = decisionFromEvents(result.events);
  assert.ok(away.players.some(player => player.id === choice.choices[0].targetId));
  assert.ok(away.players.some(player => player.id === choice.choices[1].targetId));
  assert.equal(decisionFromEvents([]), null);
});

test('attacking risk increases both teams shot volume over seeded simulations', () => {
  const home = buildOpponent(players, 'Manchester City');
  const away = buildOpponent(players, 'Barcelona', '2014/15');
  function totals(tactic) {
    let seed = 12345;
    const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
    const counts = { home: 0, away: 0 };
    for (let i = 0; i < 2000; i++) {
      for (const event of simulateStep({ home, away, minute: 0, tactic, random }).events) if (event.side && ['shot', 'goal'].includes(event.kind)) counts[event.side]++;
    }
    return counts;
  }
  const balanced = totals('balanced'), attacking = totals('allout');
  assert.ok(attacking.home > balanced.home);
  assert.ok(attacking.away > balanced.away);
});
