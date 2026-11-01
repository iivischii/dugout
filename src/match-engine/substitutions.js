export const SUBSTITUTION_LIMIT = 5;
const person = player => String(player.databaseId || player.name).toLowerCase();

export function eligibleSubstitutes(roster, active, substitutions) {
  const unavailable = new Set([...active, ...substitutions.map(change => change.playerOff)].map(person));
  return roster.filter(player => !unavailable.has(person(player)));
}

export function substitute(team, roster, substitutions, playerOffId, playerOnId, limit = SUBSTITUTION_LIMIT) {
  if (substitutions.length >= limit) throw new Error("Substitution limit reached.");
  const index = team.players.findIndex(player => player.id === playerOffId && !player.sentOff);
  if (index < 0) throw new Error("Choose a player currently on the pitch.");
  const playerOn = eligibleSubstitutes(roster, team.players, substitutions).find(player => player.id === playerOnId);
  if (!playerOn) throw new Error("Choose an eligible substitute. Players taken off cannot return.");
  const playerOff = team.players[index];
  const replacement = { ...playerOn, role: playerOff.role };
  return { team: { ...team, players: team.players.map((player, slot) => slot === index ? replacement : player) },
    change: { playerOff, playerOn: replacement } };
}
