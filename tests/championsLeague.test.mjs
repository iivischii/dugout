import { test } from "node:test";
import assert from "node:assert/strict";
import { filterChampionsLeaguePlayers, latestPlayerRecords, mergeChampionsLeaguePlayers } from "../src/data/championsLeague.js";

test("the merged database keeps only Champions League clubs and combines matching season records", () => {
  const domestic = [
    { id: "league-1", name: "Player One", team: "Barcelona", season: "2018/19", position: "F", stats: { games: 30, minutes: 2400, goals: 10 } },
    { id: "league-2", name: "Player Two", team: "Non-UCL Club", season: "2024/25", position: "M", stats: { games: 20, minutes: 1000 } },
  ];
  const statsBomb = [
    { id: "ucl-1", name: "Player One", team: "FC Barcelona", season: "2018/2019", position: "F", dataStatus: "statsbomb",
      sourceUrl: "https://github.com/hudl/open-data", stats: { games: 8, minutes: 700, goals: 4, xG: 5 } },
    { id: "ucl-2", name: "New Player", team: "Paris Saint-Germain", season: "2018/2019", position: "M", dataStatus: "statsbomb", stats: { games: 4, minutes: 250 } },
    { id: "other-1", name: "Other Player", team: "Outside UCL", season: "2018/2019", position: "D", dataStatus: "statsbomb", stats: {} },
  ];
  const clubs = ["Barcelona", "Paris Saint-Germain"];
  const filtered = filterChampionsLeaguePlayers([...domestic, ...statsBomb], clubs);
  assert.equal(filtered.length, 3);
  assert.equal(filterChampionsLeaguePlayers([{ name: "Player Three", team: "Outside UCL, Barcelona", season: "2024/25" }], clubs)[0].team, "Barcelona");

  const merged = mergeChampionsLeaguePlayers(domestic, statsBomb, clubs);
  assert.equal(merged.length, 2);
  const combined = merged.find(player => player.name === "Player One");
  assert.equal(combined.dataStatus, "combined");
  assert.equal(combined.stats.games, 38);
  assert.equal(combined.stats.minutes, 3100);
  assert.equal(combined.stats.goals, 14);
  assert.equal(combined.stats.xG, 5);
  assert.equal(latestPlayerRecords([...merged, { ...combined, id: "old", season: "2016/17" }]).length, 2);
});
