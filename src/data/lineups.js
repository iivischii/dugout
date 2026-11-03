import { databaseSquadPlayer } from "./playerSearch.js";
import { MAX_SQUAD_SIZE } from "./fantasyTeams.js";
export function validLineup(lineup, roster) {
  return lineup.length === 11 && new Set(lineup).size === 11 && lineup.every(id => id && roster.some(player => player.id === id));
}
export function opponentEditor(team) {
  if (!team) return { formation: "4-3-3", lineup: Array(11).fill(null), roster: [] };
  const roster = [];
  for (const player of team.roster.slice(0, MAX_SQUAD_SIZE)) {
    const entry = databaseSquadPlayer(player, roster);
    if (!roster.some(item => item.id === entry.id)) roster.push({ ...entry, number: player.number || roster.length + 1 });
  }
  return { formation: team.formation, roster, lineup: team.players.map(player => player ? roster.find(item => item.databaseId === player.id)?.id || null : null) };
}
