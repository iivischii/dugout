# Fantasy matches and player fidelity

## What you can play

Match Setup lists all 197 individual clubs in the CSV, with a season selector. Separate “prime MSN” presets have been removed. Select Barcelona and 2014/15 or 2015/16 to build a historical opponent, then edit their XI yourself. No hidden prime bonus is applied.

Each club defaults to its latest available CSV season. Suggested XIs use minutes played and broad goalkeeper/defender/midfielder/forward groups, filling shortages from available players. These are not verified real-world match lineups or natural-position assignments. If fewer than 11 players exist, empty slots remain; complete them through the editor before kickoff. Transfer rows listing multiple clubs contribute to each listed club's roster, but their numerical statistics remain combined season totals, not invented club-specific splits.

Switch between Your XI and Opponent XI to customize either team's pitch positions, formation, players, and seasons. Edits are independent. Search for a player and season, select a pitch position, then choose the record. Choosing another season of an existing database entry updates it rather than creating another copy of that entry.

New matches always return to lineup selection. Your previous XI stays available for editing. **Clear XI** empties the pitch and moves everyone into the available squad; kickoff requires 11 filled, unique positions. Completed career records are kept. Confirming setup during an unfinished match discards only that unfinished match.

## Zidane and missing historical data

The CSV covers 2014/15 through 2024/25. Its Zidane matches are Enzo and Luca, not Zinedine. A separate Zinedine Zidane legend identity is now searchable and selectable, linked to [Real Madrid's official legend profile](https://www.realmadrid.com/en-US/the-club/history/football-legends/zinedine-zidane).

That entry has **no season statistics**. Its result label and player card disclose that limitation. In the model it receives the same missing-data defaults as any unmeasured midfielder. It is not an accurate statistical recreation of prime Zidane. Verified season-level data is still needed; career totals must not be substituted for a season or invented as xG/physical attributes.

The existing custom Real Madrid players are linked to the latest available matching Real Madrid CSV record, where found. The player card shows the chosen season. This creates a deliberate mixed-era team rather than replacing the user's custom roster with today's squad.

## Experimental attacking model: season-attacks-v4

Automatic mode samples both sides once per game minute, pacing the 90 regulation minutes over the chosen 3–10 minutes. Manual mode retains Continue, stopping at phase boundaries instead of jumping past them. Decisions, explicit pause, menus, hidden browser tabs, and halftime stop active play time. Optional decision deadlines count separately; expiry retains previous instructions and records the missed decision. Timer settings are frozen at kickoff and saved with the match.

The phase sequence is first half, first-half added time, halftime, second half, second-half added time, full time. Clock labels show 45+N and 90+N. Halftime waits for an explicit restart and offers tactical instructions and an actual score/shot summary. No career result is saved at halftime or simply at 90. The final score includes goals in added time, and the archive stores both allowances and the elapsed match minutes.

The real match structure and causes of added time follow [IFAB Law 7](https://www.theifab.com/laws/latest/the-duration-of-the-match/). The numerical allowance here is a simplified model: each generated goal records 20–50 seconds of celebration delay; the total is rounded up to minutes for each half. Further delays in added time can extend it. With no tracked delays, zero added time is possible. A 15-minute-per-half cap prevents runaway extreme simulated scorelines; that cap is a game safeguard, not an IFAB rule. In-play substitutions now record 30 seconds of delay; halftime changes record none. Fouls and card administration now add recorded delay; intentional restart delays can be warned or cautioned. Injuries and VAR are not yet simulated as delay sources. These approximations do not reproduce full refereeing discretion.

- Shooting volume comes from shots per 90 minutes.
- A shooter's scoring probability uses season xG divided by shots, or goals divided by shots when xG is unavailable. It is a simple season-average proxy, not the xG of a generated shot location.
- Creators are sampled using key passes per 90. The model does not claim a historical assist occurred, or record a completed pass statistic for every narrated action.
- Observed rates are blended with role defaults using minutes / (minutes + 900). The 900-minute prior and caps are explicit design assumptions, not researched player attributes.
- Missing-data defaults: attackers 2.5 shots/90 and 0.12 scoring probability; midfielders 1.2 and 0.08; defenders 0.5 and 0.06; goalkeepers 0. Creator weights default to 1, 1.2, 0.5, and 0 respectively. These are model settings, not real player statistics.
- Roles come from the selected formation slots. Formation-specific strength, positional suitability, and formation matchup effects are not yet modelled.
- Shot events, goals, final scores, shot totals, named players, selected-season XI snapshots, and recorded decisions are saved together. Scores are counted from the same shot events that appear in the feed.

Management opportunities now occur after about eight elapsed game minutes, or six when recent goals/shot activity warrant attention. Manual five-minute stepping rounds the timing to a step boundary. They are available in added time, but never interrupt halftime or full time. The Give instructions button lets the user act proactively between automatic prompts. It uses the current score, last eight game minutes of events, active players, and recent situation types. Cases include stalled attacks, passing losses, missed attempts, shot advantages, repeated threats, and late leads/deficits. Situation rotation chooses another relevant type where possible; it does not invent a problem simply to vary the prompt.

Closing down a shooter reduces their shot weight by 35% and your team's volume by 10%. Cutting service reduces the named creator's selection weight by 50%, opposition volume by 15%, and your volume by 5%. Attacking increases your volume by 20% and theirs by 15%. Protecting shape reduces your volume by 25% and theirs by 20%. Patient instructions reduce your volume by 10%, increase modeled scoring probability per shot by 12% (capped at 0.6), and reduce opposition shots by 5%. They also lower your generic buildup-interception probability from 35% to 20%. Building through a playmaker increases that active player's creator selection weight by 60%, your volume by 5%, and opposition volume by 10%. These are explicit gameplay assumptions, not calibrated historical effects or new real player attributes.

Quiet minutes no longer produce the repeated no-shot summary. Every third quiet game minute can produce a recorded buildup with actual active participants. A generic outcome draw records an interception (35%), a crowded-out continuation (30%), or a recycled exchange (35%). Patient home instructions shift the first two to 20% and 45%. Defender identity is selected from the actual defending XI; this does not measure individual interception ability. Recent commentary keys are avoided; if the applicable bank is exhausted, the least-recently-used template is selected. On quiet intervening minutes no filler is appended. Non-shot events are excluded from shot counts and do not imply a possession percentage or arbitrary passing statistics.

Management records now retain situation type, manual/automatic source, observation counts, target and timeout status, alongside the instruction chosen. This preserves the basis for later analysis without claiming a decision caused a specific goal.

Shot commentary now varies its templates and records goal/saved/wide outcomes. Non-goal save versus wide is a simple 50/50 model choice; individual goalkeeper ability is not used. The goalkeeper name comes from the actual defending XI. No synthetic speed, dribbling, or defensive attribute is presented as real data.

Still missing: individual defending/goalkeeping quality, pace, dribbling, off-ball movement, fatigue, opponent substitutions, competition-specific substitution windows, opponent tactical adaptation, learned career experience, and validated cross-era comparisons. The current CSV does not supply many of those attributes. Player-season attacks and situational choices affect probabilities, but this remains an experimental model, with some repeated situations. Saved wins/losses do not currently train an AI or confer hidden ability boosts. No live AI is used.

The shared live pitch now animates both XIs and the ball from match events. Player movement is a bounded visualization of formation, event participants, attacking side, and a small deterministic supporting drift. These visual coordinates are not input to the engine: they do not determine passes, collisions, offsides, tackles, or shots. The ball follows the event's actual creator and shooter toward the recorded outcome. This should not be confused with a physical football simulation or measured player movements.

Tests cover all dataset clubs and seasons, independent opponent editing, missing-data handling, per-90 rates, bounded small-sample behavior, active-XI events, score consistency, tactical probability changes, saved lineups, usage counting, complete timed play, decision expiry, pauses, and timer isolation on restart.

## Substitution rules

The current game allows five substitutions, with no return for a player taken off. These are explicit game rules, not a complete competition rule implementation. Incoming players take the outgoing player's pitch slot and role; their own season statistics are used in subsequent attacks. Kickoff and final XIs are archived separately with timed substitution records. Incoming substitute appearances count in career usage lists. No fitness benefit is claimed because fatigue is not yet modelled.

## Referee integration

See [REFEREE.md](REFEREE.md) for the disciplinary model. Foul/card/restart-delay events are generated before each minute's attacking events. Active-player filtering removes dismissed players from subsequent actions in the same step. Team state returned by the engine is committed to the pitch; starting XI snapshots remain separate from final active XIs. Referee events are excluded from shot counts and included in added-time calculations where they record delay. A side below seven players stops the match without saving a completed result.
