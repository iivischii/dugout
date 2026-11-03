const DATA_ROOT = "https://raw.githubusercontent.com/hudl/open-data/master/data";
export const STATSBOMB_SOURCE_URL = "https://github.com/hudl/open-data";
const seasonCache = new Map();
let uclIndexCache;

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`StatsBomb data request failed (${response.status}): ${url}`);
  return response.json();
}

export async function loadStatsBombCompetitions({ fetchImpl = fetch } = {}) {
  const competitions = await fetchJson(`${DATA_ROOT}/competitions.json`, fetchImpl);
  if (!Array.isArray(competitions)) throw new Error("StatsBomb competition data has an unexpected format.");
  return competitions.filter(item => item.competition_id && item.season_id && item.competition_name && item.season_name)
    .sort((a, b) => a.competition_name.localeCompare(b.competition_name) || b.season_name.localeCompare(a.season_name));
}

export async function loadStatsBombUclIndex({ fetchImpl = fetch, onProgress = () => {} } = {}) {
  if (uclIndexCache) return uclIndexCache;
  const task = (async () => {
    const competitions = (await loadStatsBombCompetitions({ fetchImpl }))
      .filter(item => item.competition_name.includes("Champions League") && item.competition_gender !== "female")
      .sort((a, b) => seasonStart(b.season_name) - seasonStart(a.season_name));
    if (!competitions.length) throw new Error("StatsBomb has no UEFA Champions League seasons available.");

    const matchLists = new Array(competitions.length);
    let cursor = 0;
    let completed = 0;
    const worker = async () => {
      while (cursor < competitions.length) {
        const index = cursor++;
        const competition = competitions[index];
        const matches = await fetchJson(`${DATA_ROOT}/matches/${competition.competition_id}/${competition.season_id}.json`, fetchImpl);
        if (!Array.isArray(matches)) throw new Error("StatsBomb Champions League match data has an unexpected format.");
        matchLists[index] = matches;
        onProgress(++completed, competitions.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, competitions.length) }, worker));
    const clubs = new Map();
    for (const matches of matchLists) {
      for (const match of matches) {
        const home = match.home_team?.home_team_name || match.home_team?.name || match.home_team_name;
        const away = match.away_team?.away_team_name || match.away_team?.name || match.away_team_name;
        if (home) clubs.set(home, home);
        if (away) clubs.set(away, away);
      }
    }
    if (!clubs.size) throw new Error("No Champions League clubs were found in StatsBomb's match index.");
    return { clubs: [...clubs.values()], latestCompetition: competitions[0], latestMatches: matchLists[0] };
  })();
  uclIndexCache = task;
  try {
    return await task;
  } catch (error) {
    uclIndexCache = null;
    throw error;
  }
}

function seasonStart(season) {
  return Number(String(season || "").match(/\d{4}/)?.[0]) || 0;
}

function parseMinute(value) {
  if (Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parts = value.split(":").map(Number);
  if (parts.some(part => !Number.isFinite(part))) return null;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  return null;
}

function broadPosition(position) {
  const value = String(position || "").toLowerCase();
  if (value.includes("goalkeeper")) return "GK";
  if (/back|defen|sweeper/.test(value)) return "D";
  if (/wing|forward|striker|attack/.test(value)) return "F";
  if (/midfield/.test(value)) return "M";
  return "F";
}

function getCardName(event) {
  return event.foul_committed?.card?.name || event.bad_behaviour?.card?.name || event.card?.name || "";
}

export function aggregateStatsBombMatches(matches, competition) {
  const records = new Map();
  const playerRecords = new Map();
  for (const match of matches) {
    const events = match.events || [];
    const lastEventMinute = events.reduce((max, event) => {
      const minute = Number(event.minute) + (Number(event.second) || 0) / 60;
      return Number.isFinite(minute) ? Math.max(max, minute) : max;
    }, 90);
    const assistedShots = new Map();
    for (const event of events) {
      if (event.pass?.assisted_shot_id && event.player?.id) {
        assistedShots.set(event.pass.assisted_shot_id, event.player.id);
      }
    }

    for (const team of match.lineups || []) {
      for (const player of team.lineup || []) {
        const segments = (player.positions || []).filter(segment => segment.position);
        const minutesByPosition = new Map();
        let minutes = 0;
        for (const segment of segments) {
          const start = parseMinute(segment.from) ?? 0;
          const end = parseMinute(segment.to) ?? lastEventMinute;
          const duration = Math.max(0, end - start);
          minutes += duration;
          const group = broadPosition(segment.position);
          minutesByPosition.set(group, (minutesByPosition.get(group) || 0) + duration);
        }
        if (!segments.length || minutes <= 0) continue;

        const key = `${competition.competition_id}-${competition.season_id}-${team.team_id}-${player.player_id}`;
        if (!records.has(key)) records.set(key, {
          id: `statsbomb-${key}`,
          name: player.player_name,
          team: team.team_name,
          league: `${competition.competition_name} · StatsBomb Open Data`,
          season: competition.season_name,
          position: [...minutesByPosition].sort((a, b) => b[1] - a[1])[0][0],
          dataStatus: "statsbomb",
          sourceUrl: STATSBOMB_SOURCE_URL,
          _minutesByPosition: new Map(),
          _matchIds: new Set(),
          _xGAvailable: false,
          stats: { games: 0, minutes: 0, goals: 0, assists: 0, shots: 0, keyPasses: 0, xG: null, xA: null, yellowCards: 0, redCards: 0 },
        });
        const record = records.get(key);
        playerRecords.set(player.player_id, record);
        if (!record._matchIds.has(match.match_id)) {
          record._matchIds.add(match.match_id);
          record.stats.games++;
          record.stats.minutes += minutes;
        }
        for (const [position, duration] of minutesByPosition) {
          record._minutesByPosition.set(position, (record._minutesByPosition.get(position) || 0) + duration);
        }
      }
    }

    for (const event of events) {
      const playerId = event.player?.id;
      if (!playerId) continue;
      const record = playerRecords.get(playerId);
      if (!record) continue;
      const card = getCardName(event).toLowerCase();
      if (card.includes("yellow")) record.stats.yellowCards++;
      if (card.includes("red")) record.stats.redCards++;
      if (event.type?.name !== "Shot") continue;
      record.stats.shots++;
      const xG = event.shot?.statsbomb_xg;
      if (Number.isFinite(xG)) {
        record._xGAvailable = true;
        record.stats.xG = (record.stats.xG || 0) + xG;
      }
      const scored = event.shot?.outcome?.name === "Goal";
      if (scored) record.stats.goals++;
      const assisterId = assistedShots.get(event.id);
      if (assisterId) {
        const assister = playerRecords.get(assisterId);
        if (assister) {
          assister.stats.keyPasses++;
          if (Number.isFinite(xG)) assister.stats.xA = (assister.stats.xA || 0) + xG;
          if (scored) assister.stats.assists++;
        }
      }
    }
  }

  return [...records.values()].map(record => {
    record.position = [...record._minutesByPosition].sort((a, b) => b[1] - a[1])[0]?.[0] || record.position;
    if (!record._xGAvailable) record.stats.xG = null;
    delete record._minutesByPosition;
    delete record._matchIds;
    delete record._xGAvailable;
    return record;
  });
}

export async function loadStatsBombSeason(competition, { fetchImpl = fetch, onProgress = () => {}, matchList } = {}) {
  if (!competition?.competition_id || !competition?.season_id) throw new Error("Choose a StatsBomb competition and season.");
  const key = `${competition.competition_id}-${competition.season_id}`;
  if (seasonCache.has(key)) return seasonCache.get(key);

  const task = (async () => {
    const matches = matchList || await fetchJson(`${DATA_ROOT}/matches/${competition.competition_id}/${competition.season_id}.json`, fetchImpl);
    if (!Array.isArray(matches)) throw new Error("StatsBomb match data has an unexpected format.");
    let completed = 0;
    const results = new Array(matches.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < matches.length) {
        const index = cursor++;
        const match = matches[index];
        const [lineups, events] = await Promise.all([
          fetchJson(`${DATA_ROOT}/lineups/${match.match_id}.json`, fetchImpl),
          fetchJson(`${DATA_ROOT}/events/${match.match_id}.json`, fetchImpl),
        ]);
        results[index] = { ...match, lineups, events };
        onProgress(++completed, matches.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, matches.length) }, worker));
    return aggregateStatsBombMatches(results, competition);
  })();
  seasonCache.set(key, task);
  try {
    return await task;
  } catch (error) {
    seasonCache.delete(key);
    throw error;
  }
}
