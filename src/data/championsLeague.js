import { normalize } from "./squad.js";
import { normalizePlayerName } from "./playerSearch.js";

export const FALLBACK_UCL_CLUBS = [
  "AEK Athens", "Ajax", "Anderlecht", "Arsenal", "Atalanta", "Atlético Madrid", "Athletic Club",
  "Barcelona", "Basel", "Bayer Leverkusen", "Bayern Munich", "Benfica", "Beşiktaş",
  "Borussia Dortmund", "Borussia Mönchengladbach", "Celtic", "Chelsea", "Club Brugge",
  "CSKA Moscow", "Dinamo Zagreb", "Eintracht Frankfurt",
  "Fenerbahçe", "Galatasaray", "Genk", "Hoffenheim", "Inter", "Juventus", "Leicester City",
  "Liverpool", "Lazio", "Lens", "Lille", "Lyon", "Manchester City", "Manchester United",
  "Milan", "Monaco", "Montpellier", "Napoli", "Newcastle United", "Nice", "Olympiacos",
  "Paris Saint-Germain", "Porto", "PSV", "RB Leipzig", "Real Sociedad", "Red Star Belgrade", "Roma",
  "Rostov", "Salzburg", "Schalke 04", "Sevilla", "Shakhtar Donetsk", "Sporting CP",
  "Spartak Moscow", "Tottenham Hotspur", "Valencia", "Viktoria Plzeň", "Villarreal",
  "Wolfsburg", "Young Boys", "Zenit",
];

const clubAliases = {
  "atletico de madrid": "atletico madrid",
  "atletico madrid": "atletico madrid",
  "fc barcelona": "barcelona",
  "fc bayern munchen": "bayern munich",
  "bayern munchen": "bayern munich",
  "internazionale": "inter",
  "inter milan": "inter",
  "paris saint germain": "paris saint germain",
  "psg": "paris saint germain",
  "tottenham": "tottenham hotspur",
  "tottenham hotspur": "tottenham hotspur",
};

function clubKey(team) {
  const cleaned = normalize(team).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").replace(/^(fc|ac|as|ssc)\s+/, "").trim();
  return clubAliases[cleaned] || cleaned;
}

function clubNames(team) {
  return String(team || "").split(",").map(value => value.trim()).filter(Boolean);
}

export function canonicalClubName(team) {
  const key = clubKey(team);
  return FALLBACK_UCL_CLUBS.find(club => clubKey(club) === key) || String(team || "").trim();
}

export function clubsMatch(left, right) {
  const rightKey = clubKey(right);
  return clubNames(left).some(team => clubKey(team) === rightKey);
}

function seasonStart(season) {
  return Number(String(season || "").match(/\d{4}/)?.[0]) || 0;
}

function seasonKey(season) {
  return String(season || "").replace(/^(\d{4})\/\d{2}(\d{2})$/, "$1/$2");
}

function identityKey(player) {
  return [normalizePlayerName(player.name), clubKey(player.team), seasonKey(player.season)].join("|");
}

function addStats(left = {}, right = {}) {
  const result = { ...left };
  for (const [key, value] of Object.entries(right)) {
    if (Number.isFinite(value)) result[key] = (Number.isFinite(result[key]) ? result[key] : 0) + value;
    else if (!Number.isFinite(result[key])) result[key] = value;
  }
  return result;
}

export function filterChampionsLeaguePlayers(players, clubs) {
  const eligible = new Set(clubs.map(clubKey));
  return players.flatMap(player => {
    if (player.dataStatus === "missing") return [];
    const teams = clubNames(player.team).filter(team => eligible.has(clubKey(team)));
    return teams.length ? [{ ...player, team: teams.join(", ") }] : [];
  });
}

export function mergeChampionsLeaguePlayers(domesticPlayers, statsBombPlayers, clubs) {
  const merged = new Map();
  for (const player of filterChampionsLeaguePlayers(domesticPlayers, clubs)) {
    merged.set(identityKey(player), { ...player, stats: { ...player.stats } });
  }
  for (const player of filterChampionsLeaguePlayers(statsBombPlayers, clubs)) {
    const key = identityKey(player);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...player, league: "UEFA Champions League", stats: { ...player.stats } });
      continue;
    }
    merged.set(key, {
      ...existing,
      stats: addStats(existing.stats, player.stats),
      dataStatus: "combined",
      sourceUrl: player.sourceUrl || existing.sourceUrl || "",
    });
  }
  return [...merged.values()];
}

export function latestPlayerRecords(players) {
  const latest = new Map();
  for (const player of players) {
    const key = [normalizePlayerName(player.name), clubKey(player.team)].join("|");
    const current = latest.get(key);
    const currentYear = seasonStart(current?.season);
    const playerYear = seasonStart(player.season);
    if (!current || playerYear > currentYear
      || (playerYear === currentYear && (player.stats?.minutes || 0) > (current.stats?.minutes || 0))) {
      latest.set(key, player);
    }
  }
  return [...latest.values()];
}

export function seasonYear(season) {
  return seasonStart(season);
}
