import { normalize } from "./squad.js";

const playerAliases = {
  "courtois": "thibaut courtois",
  "lunin": "andriy lunin",
  "asencio": "raul asencio",
  "huijsen": "dean huijsen",
  "bellingham": "jude bellingham",
  "camavinga": "eduardo camavinga",
  "valverde": "federico valverde",
  "mbappe": "kylian mbappe lottin",
  "rodrygo": "rodrygo goes",
  "trent": "trent alexander arnold",
  "tchouameni": "aurelien tchouameni",
  "a. carreras": "alvaro fernandez carreras",
  "a carreras": "alvaro fernandez carreras",
  "brahim": "brahim diaz",
  "vini jr.": "vinicius junior",
};

export function normalizePlayerName(name) {
  const key = normalize(name);
  return playerAliases[key] || key;
}

// Every word must match somewhere in the player's database record.
export function searchPlayers(players, query, limit = 35) {
  const cleaned = normalize(query).trim();
  if (cleaned.length < 2) return [];
  const words = cleaned.split(/\s+/);
  return players.filter(player => {
    const record = normalize([player.name, player.team, player.season, player.position, player.league].join(" "));
    return words.every(word => record.includes(word));
  }).slice(0, limit);
}

// Keep one squad entry per person; selecting another season updates that entry.
export function databaseSquadPlayer(player, availableSquad) {
  const generatedId = `csv-${normalizePlayerName(player.name).replace(/[^a-z0-9]+/g, "-")}`;
  const existing = availableSquad.find(item => item.id === generatedId || normalizePlayerName(item.name) === normalizePlayerName(player.name));
  const id = existing?.id || generatedId;
  const used = new Set(availableSquad.map(item => item.number));
  let number = existing?.number ?? 30;
  if (!existing) while (used.has(number)) number++;
  return {
    id, number, name: player.name,
    role: String(player.position || "").split(",")[0].trim() || "Unknown",
    source: "database", databaseId: player.id, team: player.team,
    season: player.season, league: player.league, stats: { ...player.stats },
    dataStatus: player.dataStatus || "season", sourceUrl: player.sourceUrl || "",
  };
}
