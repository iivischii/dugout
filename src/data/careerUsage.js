import { normalize } from "./squad.js";

export function careerUsage(matches) {
  const own = new Map(), against = new Map(), clubs = new Map();
  const knownIds = new Map();
  for (const match of matches) for (const player of [...(match.startingXI || []), ...(match.opponentXI || []), ...(match.substitutions || []).map(change => change.playerOn)]) {
    const id = player.databaseId || (/^\d+$/.test(String(player.id)) ? String(player.id) : null);
    if (id) knownIds.set(normalize(player.name), String(id));
  }
  let missingLineups = 0;
  function countPlayers(list, map) {
    const counted = new Set();
    for (const player of list || []) {
      const id = String(player.databaseId || knownIds.get(normalize(player.name)) || normalize(player.name));
      if (!id || counted.has(id)) continue;
      counted.add(id);
      const row = map.get(id) || { id, name: player.name, count: 0 };
      map.set(id, { ...row, count: row.count + 1 });
    }
  }
  for (const match of matches) {
    countPlayers([...(match.startingXI || []), ...(match.substitutions || []).map(change => change.playerOn)], own);
    countPlayers(match.opponentXI, against);
    if (!match.startingXI || !match.opponentXI) missingLineups++;
    const club = match.opponentClub || match.opponent;
    if (club) clubs.set(club, (clubs.get(club) || 0) + 1);
  }
  const order = map => [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { own: order(own), against: order(against), clubs: [...clubs].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)), missingLineups };
}
