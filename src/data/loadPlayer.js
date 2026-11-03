
import Papa from "papaparse";

// Convert a CSV value into a number.
// Empty values stay null instead of becoming 0.
function toNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Load the local source; the combined database filters it to Champions League clubs.
export async function loadPlayers() {
  const response = await fetch(`${import.meta.env?.BASE_URL ?? "/"}data/players.csv`);

  if (!response.ok) {
    throw new Error("Could not find public/data/players.csv");
  }

  const csvText = await response.text();

  const result = Papa.parse(csvText, {
    header: true,         // First CSV row contains column names.
    skipEmptyLines: true, // Ignore empty rows.
  });

  if (result.errors.length > 0) {
    console.warn("CSV warnings:", result.errors.slice(0, 5));
  }

  if (!result.meta.fields?.includes("player_name")) {
    throw new Error("Player database is missing the player_name column.");
  }
  if (!result.data.some(row => row.player_name?.trim())) {
    throw new Error("Player database contains no named players.");
  }

  // Transform each CSV row into a player-season object.
  return result.data
    .filter((row) => row.player_name)
    .map((row) => ({
      id: String(row.id),
      name: row.player_name,
      team: row.team_title,
      league: row.league,
      season: row.season,
      position: row.primary_position || row.position,

      // These numbers are from the CSV, not invented ratings.
      stats: {
        games: toNumber(row.games),
        minutes: toNumber(row.time),
        goals: toNumber(row.goals),
        assists: toNumber(row.assists),
        shots: toNumber(row.shots),
        keyPasses: toNumber(row.key_passes),
        xG: toNumber(row.xG),
        xA: toNumber(row.xA),
        nonPenaltyXG: toNumber(row.npxG),
        yellowCards: toNumber(row.yellow_cards),
        redCards: toNumber(row.red_cards),
      },
    }));
}
