import { formations } from "../data/squad.js";

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
const mix = (from, to, progress) => ({ x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress });

// Presentation only: these coordinates never feed into match probabilities.
export function pitchFrame({ teams, homeFormation, secondHalf = false, action, progress = 0, motionTime = 0 }) {
  const players = [];
  for (const side of ["home", "away"]) {
    const team = teams[side];
    const slots = formations[side === "home" ? homeFormation : team.formation] || formations["4-3-3"];
    const reverse = (side === "away") !== secondHalf;
    for (const [index, player] of team.players.entries()) {
      if (!player || player.sentOff) continue;
      const role = player.role || slots[index]?.[2];
      const slot = role === "GK" ? slots.find(item => item[2] === "GK") : slots[index];
      if (!slot) continue;
      let x = reverse ? 100 - slot[0] : slot[0];
      let y = reverse ? 100 - slot[1] : slot[1];
      const direction = reverse ? 1 : -1;
      const keeper = role === "GK";
      const active = action?.side === side;
      const wave = Math.sin(motionTime / 2100 + index * 1.7 + (side === "away" ? 2 : 0));
      x += keeper ? wave * .35 : wave * 1.6;
      y += keeper ? 0 : Math.cos(motionTime / 2700 + index) * 1.1;
      if (action?.side && !keeper) y += direction * (active ? 5 : -2.5);
      const involved = active && (action.playerId === player.id || action.creatorId === player.id);
      if (involved && !keeper) {
        y += direction * Math.sin(Math.PI * progress) * 6;
        x += Math.sin(Math.PI * progress) * (50 - x) * .12;
      }
      players.push({ ...player, side, key: `${side}-${player.id}`, index, role,
        x: clamp(x, 6, 94), y: clamp(y, 6, 94), involved, teamName: team.name });
    }
  }
  let ball = { x: 50, y: 50 };
  const shooter = players.find(player => player.side === action?.side && player.id === action?.playerId);
  if (shooter) {
    const creator = players.find(player => player.side === action.side && player.id === action.creatorId) || shooter;
    const defender = players.find(player => player.side !== action.side && player.id === action.opponentPlayerId);
    const attackingDown = (action.side === "away") !== secondHalf;
    const goalkeeper = players.find(player => player.side !== action.side && player.role === "GK");
    const target = action.kind === "buildup" ? (action.outcome === "recycled" ? creator : defender || shooter)
      : action.kind === "goal" ? { x: 50, y: attackingDown ? 98 : 2 }
      : action.outcome === "saved" && goalkeeper ? goalkeeper
      : { x: 65, y: attackingDown ? 98 : 2 };
    ball = progress < .55 ? mix(creator, shooter, progress / .55) : mix(shooter, target, (progress - .55) / .45);
  }
  return { players, ball, possession: action?.side || null };
}
