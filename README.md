# The Dugout

A React/Vite football manager prototype. The blue pitch, green markers, sidebar, and ticket design are preserved.

## Run and check

Run npm install, then npm run dev. Use the URL Vite prints. Verification commands: npm test, npm run lint, npm run build. On Windows, use npm.cmd if PowerShell blocks npm.ps1.

The opening screen offers Create Manager for a new career or Continue Career for an existing named manager. Choose your name once when creating a manager; existing saved matches are preserved. Manager Profile is read-only. Dashboard has been removed. Profile records grow from completed matches.

The career opens on the pitch. Use Match setup to choose teams; the former Squad spot on the sidebar is now Play, where you can choose single player or multiplayer. Single player remains available without an account. Multiplayer requires an account: create or join a room with a six-character code, choose a team, then take alternating five-minute turns. Online matches use the same pitch and right-hand match ticket as single player, with a small turn indicator and controls in the ticket. Both managers see the same score, cards, and match events. Choose Real Madrid, another Champions League club, or a random custom team. The Real Madrid preset uses its 2026/27 squad; other clubs use the newest available local squad data, which currently ends in 2024/25. Team and season data are picked automatically; there are no competition or season menus. Each squad has 11 starters and at most five substitutes. Online matches run on client simulations and are not cheat-proof or saved to manager career records yet.

Search accepts player names and club names. Only the latest available player record is shown. At 16 players, the lineup screen explains that you need to release a substitute before adding anyone else. Click a player on the pitch to see their available statistics.

## Code organization

- src/App.jsx connects lineup, match, and career state.
- src/components/Pitch.jsx handles markers, drag/drop, and pitch player details.
- src/components/LivePitch.jsx displays both match XIs and an animated ball; src/hooks/usePitchMotion.js handles animation, and src/match-engine/pitchView.js maps events to visual positions.
- src/components/PlayerDatabase.jsx handles search results and loading/empty/error states.
- src/components/Substitutes.jsx displays the centered bench.
- src/pages/CareerPage.jsx contains the existing career and sidebar panels.
- src/pages/WelcomePage.jsx provides the opening screen and initial manager creation.
- src/pages/ManagerProfile.jsx displays the accumulated, read-only manager record.
- src/styles/Welcome.css styles the opening screen and manager identity.
- src/data/loadPlayer.js loads public/data/players.csv. The app filters its records to Champions League clubs.
- src/data/statsBomb.js finds available Champions League seasons, loads club lists and the latest available match data automatically.
- src/data/championsLeague.js filters and merges local and StatsBomb records and keeps the latest player record in search results.
- src/data/playerSearch.js searches records and creates squad entries.
- src/data/squad.js holds the 2026/27 Real Madrid 16-player roster and four formations.
- src/components/GameModeModal.jsx offers single-player and online multiplayer mode choices; src/components/OnlineMatchPanel.jsx creates/joins rooms and displays the shared match.
- src/services/onlineMatches.js syncs room state and alternating turns through Firestore.
- src/data/career.js reads existing saves and provides prototype review notes.
- src/match-engine/simulation.js contains the experimental player-season attacking model and event-based tactical choices.
- src/match-engine/commentary.js selects descriptions while avoiding recently used lines; src/match-engine/management.js offers evidence-based situations and proactive instructions.
- src/data/fantasyTeams.js builds 11-player starting XIs and capped 16-player club/random squads.
- src/components/MatchSetup.jsx previews opponents and returns every new match to XI selection.
- src/hooks/useMatchTimer.js and src/match-engine/clock.js handle automatic pacing, pause, and decision deadlines.
- src/pages/SettingsPage.jsx and src/data/settings.js provide persisted timing preferences and game/account controls.
- src/pages/SquadUsage.jsx and src/data/careerUsage.js show the five most-used players, opponents, and clubs in Manager Career.

## Implemented and incomplete features

| Area | Implemented | Incomplete |
| --- | --- | --- |
| Pitch / lineup | Independent editing of both teams, four formations, click/tap replacement, swaps, drag/drop, 11 starters and up to 5 substitutes | Position suitability |
| Live pitch | Both XIs in green/coral, distinct goalkeepers, event-driven ball/player movement, change of ends, player details and reduced motion | Animation is presentation, not a physics or tracking-data simulation |
| Database | Champions League club filter, merged Dugout/StatsBomb player records, automatic latest records and simple player/club search | StatsBomb currently contributes one 2018/19 final; the local source ends in 2024/25 |
| Match | 3–10 minute regulation pacing, halftime review, event-based added time, manual mode, pause, timed decisions and recorded XIs | Individual defending, full playing styles, fatigue and opponent adaptation |
| Tactics / discipline | Varied match decisions, player-focused attacking choices, direct opponent marking, fouls, cards, time-wasting risk, numerical disadvantages and saved referee history | Model factors need calibration; set pieces, VAR and referee personalities are not complete |
| Substitutes | In-match substitution button, five-change limit, no re-entry, updated active XI and saved substitution history | Competition-specific windows, opponent substitutions and fatigue |
| Opening / profile | Manager creation, returning-career entry, read-only accumulated manager profile and result totals | Reputation and achievements |
| Calendar | Completed scores, dates, formations, both XIs, decisions, timelines and shot counts | Substitution history and wider match statistics |
| Trophy panel | Wins, draws, losses, win percentage, prototype reviews | Goal totals, streaks, trophies, data-grounded feedback |
| Manager career / settings | Wins, draws, losses, performance reviews, top-five player/opponent/club usage; duration/deadline controls, restart/setup, opening screen, account access | Usage for older matches without saved XIs cannot be reconstructed |
| Storage / accounts | Compatible local saves; Firebase sign-in and manual manager/match cloud transfers implemented | Console activation and live verification; squad cloud saves and automatic syncing |
| Online play | Account-required room codes, alternating tactical turns, shared scores/events/cards, mobile-friendly controls | Real-time presence/chat, persistent career records, server-authoritative/cheat-resistant simulation |
| Mobile | Responsive layout and touch lineup controls | PWA installation and offline support |

The IS manager tile opens Firebase email/password sign-in, manual cloud career save/load, and sign-out. Firebase Console service activation and rule publishing are still required; see FIREBASE_SETUP.md. The match prototype is not a realistic statistical simulation. Missing defensive and physical data must not be invented.

## Fixes and tests

The CSV contains six Erling Haaland season records. Name matching already worked; the long ticket and shrinking/off-screen results made searches difficult to see. Ticket content now retains its height, and typing brings search results into the visible ticket area. Bench players wrap into centered rows. A large custom bench can scroll vertically without horizontal overflow.

The setup dialog leads into lineup selection instead of skipping directly to kickoff. Players are automatically matched with the latest available statistics; the season is not a player choice. The mode chooser is on the Play sidebar button rather than appearing automatically. Squad usage has moved into Manager Career, and each usage list is capped at five entries.

npm test checks the real CSV, Haaland and combined searches, automatic latest-record selection, duplicate-player updates, formations, default squad integrity, and invalid/empty database errors.

StatsBomb records are fetched from the [official open-data repository](https://github.com/hudl/open-data) and automatically combined with matching local player-season records. Its Champions League data contains selected matches only, not a complete season; network access is required for those added records. The Real Madrid roster is based on the club's [official first-team page](https://www.realmadrid.com/en-US/football/first-team/players). Player statistics remain limited to the data seasons that are actually available.

tests/browser.mjs is an optional browser regression script using Playwright and installed Chrome. Neither is added to the game's dependencies. With Vite running, run node tests/browser.mjs when Playwright is available, or pass an absolute Playwright index.mjs path as the next argument. Set DUGOUT_TEST_URL for another local port. Isolated browser profiles protect your own saved career.

Browser checks cover desktop selection, swaps, drag/drop, formations, the 16-player squad cap, visible search results, mobile taps, bench overflow, sidebar panels, full-time saving, matching final scores, and no duplicate records on reload.

Next: add match phases, substitutions and fatigue, then improve the experimental statistical model and source missing player attributes. User roles need separately agreed requirements.

See [MATCH_MODEL.md](MATCH_MODEL.md) for model assumptions and fidelity limits. Choose Barcelona as an opponent to use its latest available squad data, then customize the XI. Search Zinedine Zidane to select the legend identity, clearly marked as lacking season statistics.

## Timing and settings

Settings defaults to 5 minutes for the 90 regulation game minutes, automatic progression, and 20 seconds per tactical decision. Sliders allow 3–10 minutes and 5–45 seconds. Automatic progression and decision deadlines can each be disabled. Changes apply at the next kickoff, and preferences are saved locally.

Pause, open menus/account/setup, and hidden browser tabs stop both timers. Decisions and added time extend regulation playing time. Halftime is a review break after 45 plus first-half added time and waits for Start second half; it does not force a real-time 15- or 45-minute wait. You can choose a balanced, protective, or attacking second-half approach. Separate second-half added time follows 90. Further goal celebrations can extend added time. If a decision deadline expires, existing instructions remain and the missed decision is saved. Choices now distinguish late leads, late deficits, and repeated shot threats. Their probabilities are experimental model assumptions. Settings can open account login/logout/cloud saves, restart/setup, or return to the opening screen. Restart discards the unfinished match; completed career history stays saved.

The Squad panel counts appearances, including players brought on as substitutes, combining seasons by player identity. It separately lists most-used home players, players most faced, and clubs most faced. Only completed matches count; older records without XI snapshots are identified without inventing appearances.

`tests/timedBrowser.mjs` uses the same optional Playwright setup as `tests/browser.mjs`. It verifies the complete club dropdown, independent opponent editing, saved custom XIs, usage lists, live clock pacing at 3/5/10 minutes, decision expiry, menu/pause behavior, restart isolation, and mobile opponent editing. It uses an isolated profile and simulated browser time.

## Commentary and management opportunities

The repeated no-shot fallback has been removed. On quiet game minutes divisible by three, the engine can record a named buildup: a recycled exchange, an intercepted passing move, or a passing continuation crowded out by an opponent. Quiet minutes between those events add no filler row. The wording follows the recorded participants/outcome, with recent-template avoidance and least-recently-used fallback. Goal/save/wide descriptions also rotate. Buildups are never counted as shots, goals, or saves, and their ball animation does not travel to the goal.

**Give instructions** is available during active play, including quiet spells. It opens a timed situation using the current score, recent shots/misses/interceptions and active players. Automatic opportunities occur after about eight game minutes, or six when goals or several recent shots warrant attention. Manual five-minute stepping rounds those opportunities to step boundaries. This replaces the old 15-minute-only checkpoints. Halftime restarts the prompt cooldown, and current decisions cannot be interrupted by another request.

New situations include stalled attacks, repeated passing losses, missed chances, and a shot advantage worth exploiting. Repeated situation types are avoided where another relevant situation exists. Late score pressure retains priority. Instructions remain active until changed and are saved with their source, type and observed counts. The new patient and playmaker approaches have explicit model tradeoffs, described in MATCH_MODEL.md. More decisions and their timeouts can extend total wall-clock match length beyond the regulation duration setting.

`tests/managementBrowser.mjs` checks desktop/mobile proactive instructions, automatic prompts without opposition shots, recorded buildup variety, saved management actions, and a complete quiet match with accurate zero-shot counts.

## Animated shared pitch

Lineup editing remains still and shows the selected side. After kickoff, all 22 players share the pitch: your outfield players are green, the opponent's are coral, and goalkeepers use distinct colors. The ball follows the actual recorded creator, shooter, and goal/save/wide outcome. Small supporting movements illustrate the flow around that event. Hover or focus a player for a name, or click/tap either side for details. Shirt numbers for database opponents are game-assigned.

Pause, menus, decisions, halftime, full time, and hidden tabs stop animation. Teams change ends when the second half starts, with the ball reset to the center. System reduced-motion preferences disable continuous movement. The visual layer never changes probabilities, scores, or event history, and the moving coordinates are not simulated physical player tracking.

`tests/pitchBrowser.mjs` checks movement, all 22 scoped player identities, colors, ball movement, pause/resume, halftime/full-time freezing, change of ends, reduced motion, opponent inspection, and mobile overflow. Run with the same optional Playwright module argument as the other browser scripts.

## In-match substitutions

The button above the match bench opens player-off and player-on selectors. The current game rule is five changes per match with no re-entry, including at halftime. A counter shows usage; reaching 5/5 makes the button grey and disabled. It is also disabled after full time or if no eligible substitutes remain. Opening the panel pauses both clocks; cancel makes no change.

Confirming a change updates the active pitch XI and the players used by the match engine. The original starting XI is preserved separately, and both the final XI and substitution history are archived. Normal in-play substitutions record 30 simulated seconds of stoppage; halftime changes do not add stoppage time. This is a model assumption. Competition-specific substitution windows and fatigue are not implemented yet.

`src/match-engine/substitutions.js` validates changes; `src/components/SubstitutionModal.jsx` provides selection. `tests/substitutionsBrowser.mjs` verifies cancellation, paused deadlines, five-change enforcement and grey styling, actual player replacement, preserved starting XI, saved changes, usage statistics, allowance reset, and mobile selection.

## Firebase connection

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for the console steps and save behavior. Account tools are loaded only when opened; the app still works locally. Analytics is not enabled. No real test accounts were created, and no rules were deployed remotely. Live cloud save/load still needs verification after setup.

Successful cloud saves now show a prominent green confirmation with the completed-match count and a Done button to close Account. Pending or failed saves never show success. The UI was checked with mocked Firebase boundaries in `tests/saveFeedbackBrowser.mjs`; this does not create real accounts or cloud data.

Career records and reviews accumulate, but the game does not currently train an AI, learn an opponent model from your losses, or model manager experience as a gameplay attribute. Some commentary and situations still repeat. See MATCH_MODEL.md for what the model can and cannot support.

The Firebase SDK installation exposed an outdated transitive Node gRPC dependency; package.json pins its patched 1.14.5 release. npm audit still reports six moderate findings in the existing ESLint/minimatch development-tool chain. No forced tooling downgrade was applied.

## Referee and cards

See [REFEREE.md](REFEREE.md) for rules, player consequences, probabilities and limits. Fouls and card administration add recorded delay. Booked players have yellow pitch badges, and both sides show card/player counts. Dismissals remove players from simulation and the pitch without permitting replacement. Below seven active players, the match stops as abandoned without a fabricated career result.

Late-leading teams can attempt slower restarts. Excessive delays can earn cautions and second-yellow dismissals; delays are added back. New decisions cover easing off booked players, reviewing substitutions, stopping delays, and responding to reds. Match archives retain referee totals and actual events. Tests include controlled desktop/mobile card and time-wasting flows.
