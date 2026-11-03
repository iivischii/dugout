import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateStatsBombMatches, loadStatsBombCompetitions, loadStatsBombSeason, loadStatsBombUclIndex } from "../src/data/statsBomb.js";

const competition = {
  competition_id: 9981,
  season_id: 9982,
  competition_name: "Test Cup",
  season_name: "2024",
};

function sampleMatch() {
  return {
    match_id: 9983,
    lineups: [{
      team_id: 7,
      team_name: "Blue FC",
      lineup: [
        { player_id: 1, player_name: "Striker", positions: [{ position: "Center Forward", from: "00:00", to: null }] },
        { player_id: 2, player_name: "Creator", positions: [{ position: "Center Midfield", from: "00:00", to: null }] },
        { player_id: 3, player_name: "Unused player", positions: [] },
      ],
    }],
    events: [
      { id: "pass-1", minute: 20, type: { name: "Pass" }, player: { id: 2 }, pass: { assisted_shot_id: "shot-1" } },
      { id: "shot-1", minute: 21, type: { name: "Shot" }, player: { id: 1 }, shot: { statsbomb_xg: 0.4, outcome: { name: "Goal" } } },
      { minute: 40, type: { name: "Foul Committed" }, player: { id: 2 }, foul_committed: { card: { name: "Yellow Card" } } },
    ],
  };
}

test("StatsBomb events aggregate only recorded appearances and keep their source label", () => {
  const [striker, creator] = aggregateStatsBombMatches([sampleMatch()], competition);
  assert.equal(striker.name, "Striker");
  assert.equal(striker.team, "Blue FC");
  assert.equal(striker.position, "F");
  assert.equal(striker.dataStatus, "statsbomb");
  assert.match(striker.sourceUrl, /hudl\/open-data/);
  assert.equal(striker.stats.games, 1);
  assert.equal(striker.stats.minutes, 90);
  assert.equal(striker.stats.shots, 1);
  assert.equal(striker.stats.goals, 1);
  assert.equal(striker.stats.xG, 0.4);
  assert.equal(creator.position, "M");
  assert.equal(creator.stats.assists, 1);
  assert.equal(creator.stats.keyPasses, 1);
  assert.equal(creator.stats.xA, 0.4);
  assert.equal(creator.stats.yellowCards, 1);
  assert.equal(aggregateStatsBombMatches([sampleMatch()], competition).length, 2);
});

test("StatsBomb source loads a competition season with bounded requests and exposes progress", async () => {
  const paths = [];
  const fetchImpl = async url => {
    paths.push(url);
    if (url.endsWith("/competitions.json")) return { ok: true, json: async () => [competition] };
    if (url.endsWith("/matches/9981/9982.json")) return { ok: true, json: async () => [{ match_id: 9983 }] };
    if (url.endsWith("/lineups/9983.json")) return { ok: true, json: async () => sampleMatch().lineups };
    if (url.endsWith("/events/9983.json")) return { ok: true, json: async () => sampleMatch().events };
    return { ok: false, status: 404 };
  };
  const available = await loadStatsBombCompetitions({ fetchImpl });
  assert.equal(available[0].competition_name, "Test Cup");
  const progress = [];
  const players = await loadStatsBombSeason(competition, { fetchImpl, onProgress: (done, total) => progress.push([done, total]) });
  assert.equal(players.length, 2);
  assert.deepEqual(progress, [[1, 1]]);
  assert.equal(paths.filter(url => url.includes("/events/")).length, 1);
});

test("the combined database loads Champions League clubs and defaults to the newest available season", async () => {
  const paths = [];
  const fetchImpl = async url => {
    paths.push(url);
    if (url.endsWith("/competitions.json")) return { ok: true, json: async () => [
      { competition_id: 16, season_id: 4, competition_name: "UEFA Champions League", season_name: "2018/2019", competition_gender: "male" },
      { competition_id: 16, season_id: 1, competition_name: "UEFA Champions League", season_name: "2017/2018", competition_gender: "male" },
      { competition_id: 2, season_id: 4, competition_name: "Premier League", season_name: "2018/2019", competition_gender: "male" },
    ] };
    if (url.endsWith("/matches/16/4.json")) return { ok: true, json: async () => [
      { match_id: 1, home_team: { home_team_name: "Blue FC" }, away_team: { away_team_name: "Red FC" } },
    ] };
    if (url.endsWith("/matches/16/1.json")) return { ok: true, json: async () => [
      { match_id: 2, home_team: { home_team_name: "Green FC" }, away_team: { away_team_name: "Red FC" } },
    ] };
    return { ok: false, status: 404 };
  };
  const progress = [];
  const index = await loadStatsBombUclIndex({ fetchImpl, onProgress: (done, total) => progress.push([done, total]) });
  assert.equal(index.latestCompetition.season_name, "2018/2019");
  assert.deepEqual(index.clubs.sort(), ["Blue FC", "Green FC", "Red FC"]);
  assert.deepEqual(index.latestMatches.map(match => match.match_id), [1]);
  assert.deepEqual(progress, [[1, 2], [2, 2]]);
  assert.equal(paths.filter(url => url.includes("/matches/")).length, 2);
});
