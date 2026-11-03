import { squad, defaultLineup, formations, withId } from "./squad.js";
import { normalizePlayerName } from "./playerSearch.js";
import { canonicalClubName, clubsMatch, seasonYear } from "./championsLeague.js";

export const MAX_SQUAD_SIZE = 16;

// Identity/role reference only. No season numbers or invented ratings are supplied.
export const legends = [{
  id: "legend-zinedine-zidane", name: "Zinedine Zidane", team: "Real Madrid",
  position: "CAM", season: "Legend — season data unavailable", league: "Historical profile",
  stats: {}, dataStatus: "missing", sourceUrl: "https://www.realmadrid.com/en-US/the-club/history/football-legends/zinedine-zidane",
}];

export function datasetTeams(players, eligibleClubs) {
  const allowed = eligibleClubs ? new Set(eligibleClubs.map(canonicalClubName)) : null;
  const teams = new Map();
  for (const player of players.filter(item => item.dataStatus !== "missing")) {
    for (const name of String(player.team || "").split(",").map(value => value.trim()).filter(Boolean)) {
      const club = canonicalClubName(name);
      if (allowed && !allowed.has(club)) continue;
      teams.set(club.toLowerCase(), club);
    }
  }
  return [...new Set(teams.values())].sort((a, b) => a.localeCompare(b));
}

export function teamSeasons(players, team) {
  return [...new Set(players.filter(player => clubsMatch(player.team, team) && player.dataStatus !== "missing").map(player => player.season))].filter(Boolean).sort((a, b) => seasonYear(b) - seasonYear(a));
}

export function buildOpponent(players, team, chosenSeason) {
  if (clubsMatch(team, "Real Madrid")) return buildCurrentRealMadrid(players);
  const season = chosenSeason || teamSeasons(players, team)[0];
  const pool = players.filter(player => clubsMatch(player.team, team) && player.season === season && player.dataStatus !== "missing")
    .sort((a, b) => (b.stats.minutes || 0) - (a.stats.minutes || 0));
  if (!pool.length) return null;
  const uniquePool = [...new Map(pool.map(player => [normalizePlayerName(player.name), player])).values()];
  const used = new Set();
  const positions = ["GK", "D", "D", "D", "D", "M", "M", "M", "F", "F", "F"];
  const roles = ["GK", "LB", "CB", "CB", "RB", "CDM", "CM", "CM", "LW", "RW", "ST"];
  const xi = positions.map((position, index) => {
    const found = uniquePool.find(player => player.position === position && !used.has(player.id))
      || uniquePool.find(player => !used.has(player.id));
    if (!found) return null;
    used.add(found.id);
    return { ...found, role: roles[index] };
  });
  const roster = [...xi.filter(Boolean), ...uniquePool.filter(player => !used.has(player.id))].slice(0, MAX_SQUAD_SIZE);
  return { id: team, name: team, season, formation: "4-3-3", players: xi, roster };
}

function positionGroup(position) {
  const value = String(position || "").toUpperCase();
  if (value.includes("GK")) return "GK";
  if (/^(D|LB|CB|RB|LWB|RWB)/.test(value) || /BACK|DEFEN/.test(value)) return "D";
  if (/^(M|CDM|CM|CAM|LM|RM)/.test(value) || /MIDFIELD/.test(value)) return "M";
  return "F";
}

export function buildRandomTeam(players, random = Math.random) {
  const identities = new Map();
  for (const player of players.filter(item => item.dataStatus !== "missing" && item.name?.trim())) {
    const key = normalizePlayerName(player.name);
    if (!identities.has(key)) identities.set(key, []);
    identities.get(key).push(player);
  }
  const available = [...identities.values()].map(records => records[Math.floor(random() * records.length)]);
  for (let index = available.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [available[index], available[target]] = [available[target], available[index]];
  }
  if (available.length < 11) return null;

  const roles = ["GK", "D", "D", "D", "D", "M", "M", "M", "F", "F", "F"];
  const starting = roles.map(role => {
    const index = available.findIndex(player => positionGroup(player.position) === role);
    const player = available.splice(index < 0 ? 0 : index, 1)[0];
    return { ...player, role };
  });
  return {
    id: "random-custom-xi",
    name: "Random XI",
    season: "Mixed seasons",
    formation: "4-3-3",
    players: starting,
    roster: [...starting, ...available.slice(0, MAX_SQUAD_SIZE - starting.length)],
  };
}

export function resolvePlayerSeason(player, players) {
  if (player.source === "database") return player;
  const name = normalizePlayerName(player.name);
  const records = players.filter(record => normalizePlayerName(record.name) === name);
  const madrid = records.filter(record => record.team === "Real Madrid");
  const latest = (madrid.length ? madrid : records).sort((a, b) => seasonYear(b.season) - seasonYear(a.season))[0];
  return latest ? { ...latest, databaseId: latest.id, id: player.id, name: player.name, number: player.number, role: player.role, source: "database" } : player;
}

function buildCurrentRealMadrid(players) {
  const roster = squad.map(withId).map(player => resolvePlayerSeason(player, players));
  const playersById = new Map(roster.map(player => [player.id, player]));
  const starting = defaultLineup.map((id, index) => ({
    ...playersById.get(`rm-${id}`),
    role: formations["4-3-3"][index][2],
  }));
  return { id: "real-madrid-2026-27", name: "Real Madrid", season: "2026/27", formation: "4-3-3", players: starting, roster };
}
