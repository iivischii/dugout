# Referee events and discipline

The game now simulates fouls, free-kick awards, yellow cards, second-yellow dismissals, straight reds, delayed restarts, warnings, and excessive-delay cautions for either side. Referee actions are recorded in the feed and saved with a completed match. The archive shows foul and card totals. A small yellow badge marks booked players on the live pitch, and team counters show cards and active players.

The rule structure follows [IFAB Law 12](https://www.theifab.com/laws/latest/fouls-and-misconduct/) and [Law 3](https://theifab.com/laws/latest/the-players/): a second caution means a dismissal, sent-off players cannot be replaced, and a match cannot continue below seven players. The game stops an abandoned match without inventing a competition forfeit score or saving it as a completed win/draw/loss.

## Player consequences

- Dismissed players remain in their original internal slots as marked unavailable records. They disappear from the pitch and all subsequent shot, passing and foul selections; remaining players do not slide into the wrong formation slots.
- A team has fewer attacking players after a dismissal. The model also gives its opponent a 12% shot-volume increase per missing defender/player, an explicit gameplay assumption.
- A dismissed player cannot appear as an incoming substitute or be selected as the player coming off to restore a full XI.
- If the goalkeeper is dismissed, an active outfielder is assigned the goalkeeper role. With substitutions available, the user can bring a bench goalkeeper on for an eligible remaining player. This preserves the reduced headcount. Emergency goalkeeper ability is not measured by this model.
- Bookings persist into the second half and reset on a new match. Substituting an active booked player uses the normal five-change allowance.

## Time management and decisions

When leading from game minute 60, clock-management choices can offer slower restarts. The time-wasting approach reduces home shot volume by 30% and away shot volume by 20%. Attempted delays can trigger warnings or cautions, and all recorded delay is added back in the added-time calculation. A caution for excessive delay can be a second yellow. This is not free clock removal or a guaranteed way to protect a lead.

The opposition can also delay restarts when ahead late in the match. Newly recorded cards can trigger a management opportunity after a short cooldown. The same old card does not repeatedly retrigger that urgency. Decisions offer easing off a booked player's challenges, reviewing a substitution, or stopping intentional delays. Red cards produce situations about the changed player count.

The cautious approach cuts the selected player's foul-selection weight by 65%, reduces home shots by 10%, and increases away shots by 5%. It redistributes who commits modeled fouls rather than making the player immune to bookings.

## Explicit prototype assumptions

The CSV's yellow/red totals and minutes influence offender selection and conditional card risk using per-90 rates shrunk toward priors of 0.2 yellows and 0.01 reds per 90 with a 900-minute prior. These are model settings, not invented player attributes.

Each team has an 8% foul-event probability per game minute. Conditional straight-red probability is 0.005 + 0.1 × the blended red rate, capped at 0.08. Otherwise, a foul has a caution probability of 0.15 + 0.35 × the blended yellow rate, bounded to 0.1–0.65. Not every foul is booked. Regular fouls record 15 seconds of delay; cautions add 20 seconds, dismissals 45 seconds.

Intentional home time-wasting has a 35% attempt probability per minute. A late-leading opposition has a 15% attempt probability. Each attempt records 10–25 seconds of delay. In this model 60% of attempts are classified as excessive and cautioned; the rest receive a warning. These are generic modeled restart delays, not a full implementation of specific throw-in, goalkeeper-possession, or goal-kick countdown rules.

Free-kick awards are recorded but do not yet have a dedicated set-piece shot model. Penalties, offside, VAR reviews, injuries, suspensions across matches, and individual referee personalities remain unimplemented. No claim of a complete Laws of the Game implementation is made.

Unit tests cover cautions, second yellows, direct reds, no replacement, active-participant filtering, goalkeeper dismissal, abandonment, data-driven rates and added-time contributions. `tests/refereeBrowser.mjs` verifies those consequences in the game on desktop/mobile with controlled randomness, including saved records and new-match reset.
