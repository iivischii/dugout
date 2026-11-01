export function mergeCareers(cloud, local) {
  const matches = new Map();
  // Existing cloud records win if a match ID already exists.
  for (const match of [...local.matches, ...cloud.matches]) matches.set(match.id, match);
  return {
    managerName: cloud.managerName || local.managerName,
    matches: [...matches.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))),
  };
}
