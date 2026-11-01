import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadPlayers } from '../src/data/loadPlayer.js';
import { searchPlayers, databaseSquadPlayer } from '../src/data/playerSearch.js';
import { squad, defaultLineup, formations } from '../src/data/squad.js';

test('actual CSV supports Haaland, combined filters, and historical season selection', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, text: () => readFile(new URL('../public/data/players.csv', import.meta.url), 'utf8') });
    const players = await loadPlayers();
    const results = searchPlayers(players, ' HAALAND ');
    assert.equal(results.length, 6);
    const season = searchPlayers(players, 'Haaland Manchester 2022/23 EPL')[0];
    assert.equal(season.name, 'Erling Haaland');
    assert.equal(season.stats.goals, 36);
    assert.equal(season.stats.minutes, 2803);
    assert.ok(searchPlayers(players, 'CB').length);
    assert.equal(searchPlayers(players, 'no-such-player-123').length, 0);
    assert.equal(searchPlayers(players, 'a').length, 0);
    const added = databaseSquadPlayer(season, squad);
    assert.equal(added.stats.goals, 36);
    assert.equal(added.season, '2022/23');
    const nextSeason = searchPlayers(players, 'Haaland 2023/24')[0];
    const updated = databaseSquadPlayer(nextSeason, [...squad, added]);
    assert.equal(updated.id, added.id);
    assert.equal(updated.number, added.number);
    assert.equal(updated.season, '2023/24');
    assert.equal(updated.stats.goals, 27);
    assert.equal(new Set(defaultLineup).size, 11);
    assert.ok(defaultLineup.every(number => squad.some(player => player.number === number)));
    assert.ok(Object.values(formations).every(slots => slots.length === 11));
    assert.ok(!squad.some(player => /Haaland|Trent/i.test(player.name)));
  } finally { globalThis.fetch = originalFetch; }
});

test('missing files, invalid headers, and empty databases show errors', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: false });
    await assert.rejects(loadPlayers(), /Could not find/);
    globalThis.fetch = async () => ({ ok: true, text: async () => '<html>Fallback page</html>' });
    await assert.rejects(loadPlayers(), /player_name column/);
    globalThis.fetch = async () => ({ ok: true, text: async () => 'player_name,id\n' });
    await assert.rejects(loadPlayers(), /no named players/);
  } finally { globalThis.fetch = originalFetch; }
});
