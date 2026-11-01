export const isShotEvent = event => event.kind === "goal" || event.kind === "shot";

export function chooseCommentary(category, templates, history = [], random = Math.random) {
  const recent = new Set(history.slice(-8).map(event => event.commentaryKey));
  let options = templates.map((text, index) => ({ text, commentaryKey: `${category}-${index}` }));
  const unused = options.filter(option => !recent.has(option.commentaryKey));
  if (unused.length) options = unused;
  else options = [options.reduce((oldest, option) => history.findLastIndex(event => event.commentaryKey === option.commentaryKey)
    < history.findLastIndex(event => event.commentaryKey === oldest.commentaryKey) ? option : oldest)];
  return options[Math.min(options.length - 1, Math.floor(random() * options.length))];
}

export function buildUpCommentary({ side, passer, receiver, defender, outcome }, team, opposition, history, random) {
  const templates = outcome === "recycled" ? [
    `${passer.name} finds ${receiver.name}, but the route forward stays closed. The ball goes back to ${passer.name}; ${team.name} have to build again.`,
    `${receiver.name} receives from ${passer.name} and returns it rather than force the opening. ${team.name} keep the move alive without a shot.`,
    `${team.name} work the ball through ${passer.name} and ${receiver.name}. They recycle the pass instead of turning it into an attempt.`,
    `A patient exchange: ${passer.name} into ${receiver.name}, then back again. There is still no shooting opportunity from this move.`,
    `${passer.name} looks for ${receiver.name}. The pair exchange passes, but ${team.name} reset rather than rush a shot.`,
    `${receiver.name} is involved in the buildup, combining with ${passer.name}. The move stays in circulation; the finish never comes.`,
  ] : outcome === "intercepted" ? [
    `${passer.name} tries to find ${receiver.name}, but ${defender.name} intercepts. ${team.name}'s move ends before a shot.`,
    `${defender.name} cuts out the pass from ${passer.name} toward ${receiver.name}. ${opposition.name} stop this attack at the passing stage.`,
    `The connection breaks down: ${passer.name}'s ball toward ${receiver.name} is intercepted by ${defender.name}. A reset is needed.`,
    `${receiver.name} is the intended target, but ${defender.name} gets to ${passer.name}'s pass first. This attack produces no attempt.`,
    `${team.name} try to connect ${passer.name} with ${receiver.name}. ${defender.name} reads the pass and ends the move.`,
    `${defender.name} interrupts the buildup, intercepting the ball intended for ${receiver.name}. ${passer.name}'s move has been stopped.`,
  ] : [
    `${receiver.name} takes the pass from ${passer.name}, but ${defender.name} blocks the next passing route. The move is crowded out before a shot.`,
    `${passer.name} brings ${receiver.name} into the attack. ${defender.name} closes the route onward, and the move stalls.`,
    `${team.name} reach ${receiver.name} through ${passer.name}, but the next pass meets ${defender.name}. No shooting chance follows.`,
    `${receiver.name} looks to continue the move after receiving from ${passer.name}. ${defender.name} blocks the passing route.`,
    `${defender.name} stops the next pass after ${passer.name} and ${receiver.name} combine. ${team.name} cannot turn this buildup into a shot.`,
    `A buildup for ${team.name}, with ${passer.name} finding ${receiver.name}. ${defender.name} crowds out the continuation.`,
  ];
  return chooseCommentary(`buildup-${outcome}-${side}`, templates, history, random);
}
