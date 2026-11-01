import { normalize } from "./squad.js";

// Identity/role reference only. No season numbers or invented ratings are supplied.
export const legends = [{
  id: "legend-zinedine-zidane", name: "Zinedine Zidane", team: "Real Madrid",
  position: "CAM", season: "Legend — season data unavailable", league: "Historical profile",
  stats: {}, dataStatus: "missing", sourceUrl: "https://www.realmadrid.com/en-US/the-club/history/football-legends/zinedine-zidane",
}];

export function datasetTeams(players) {
  return [...new Set(players.filter(player => player.dataStatus !== "missing").flatMap(player => String(player.team || "").split(",").map(name => name.trim())).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function teamSeasons(players, team) {
  return [...new Set(players.filter(player => String(player.team || "").split(",").map(name => name.trim()).includes(team) && player.dataStatus !== "missing").map(player => player.season))].filter(Boolean).sort().reverse();
}

export function buildOpponent(players, team, chosenSeason) {
  const season = chosenSeason || teamSeasons(players, team)[0];
  const pool = players.filter(player => String(player.team || "").split(",").map(name => name.trim()).includes(team) && player.season === season && player.dataStatus !== "missing")
    .sort((a, b) => (b.stats.minutes || 0) - (a.stats.minutes || 0));
  if (!pool.length) return null;
  const used = new Set();
  const positions = ["GK", "D", "D", "D", "D", "M", "M", "M", "F", "F", "F"];
  const roles = ["GK", "LB", "CB", "CB", "RB", "CDM", "CM", "CM", "LW", "RW", "ST"];
  const xi = positions.map((position, index) => {
    const found = pool.find(player => player.position === position && !used.has(player.id))
      || pool.find(player => !used.has(player.id));
    if (!found) return null;
    used.add(found.id);
    return { ...found, role: roles[index] };
  });
  return { id: team, name: team, season, formation: "4-3-3", players: xi, roster: pool };
}

const aliases = { "vini jr.": "vinicius junior", "guler": "arda guler", "brahim": "brahim diaz" };
export function resolvePlayerSeason(player, players) {
  if (player.source === "database") return player;
  const name = aliases[normalize(player.name)] || normalize(player.name);
  const records = players.filter(record => normalize(record.name) === name || normalize(record.name).endsWith(` ${name}`));
  const madrid = records.filter(record => record.team === "Real Madrid");
  const latest = (madrid.length ? madrid : records).sort((a, b) => String(b.season).localeCompare(String(a.season)))[0];
  return latest ? { ...latest, databaseId: latest.id, id: player.id, name: player.name, number: player.number, role: player.role, source: "database" } : player;
}
