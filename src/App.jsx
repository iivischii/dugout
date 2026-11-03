import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, UserRound, Users, Trophy, Settings, Play, SlidersHorizontal } from "lucide-react";
import { loadPlayers } from "./data/loadPlayer";
import "./App.css";
import dugoutLogo from "./assets/dugout.png";
import PlayerDatabase from "./components/PlayerDatabase";
import MatchFeed from "./components/MatchFeed";
import MatchDialog from "./components/MatchDialog";
import Substitutes from "./components/Substitutes";
import { databaseSquadPlayer } from "./data/playerSearch";
import { opponentEditor, validLineup } from "./data/lineups";
import { readSettings, SETTINGS_KEY } from "./data/settings";
import useMatchTimer from "./hooks/useMatchTimer";
import { formatTime } from "./match-engine/clock";
import MatchSetup from "./components/MatchSetup";
import GameModeModal from "./components/GameModeModal";
import OnlineMatchPanel from "./components/OnlineMatchPanel";
import { legends, buildOpponent, buildRandomTeam, resolvePlayerSeason, MAX_SQUAD_SIZE } from "./data/fantasyTeams";
import { FALLBACK_UCL_CLUBS, filterChampionsLeaguePlayers, mergeChampionsLeaguePlayers } from "./data/championsLeague";
import Pitch from "./components/Pitch";
import WelcomePage from "./pages/WelcomePage";
import CareerPage from "./pages/CareerPage";
import { squad, formations, defaultLineup, withId } from "./data/squad";
import { STORAGE_KEY, readCareer } from "./data/career";
import { MODEL_VERSION, simulateStep } from "./match-engine/simulation";
import { isShotEvent } from "./match-engine/commentary";
import { managementSituation, shouldOfferDecision } from "./match-engine/management";
import { activePlayers, refereeSummary } from "./match-engine/referee";
import { initialPhase, matchMinute, phaseBoundary, progressPhase } from "./match-engine/phases";
import HalfTimePanel from "./components/HalfTimePanel";
import SubstitutionModal from "./components/SubstitutionModal";
import { eligibleSubstitutes, substitute, SUBSTITUTION_LIMIT } from "./match-engine/substitutions";
import { loadStatsBombUclIndex, loadStatsBombSeason } from "./data/statsBomb";
import PlayerInstructionModal from "./components/PlayerInstructionModal";

const AccountPanel = lazy(() => import("./components/AccountPanel"));

const menuItems = [
  { id: "profile", icon: UserRound, label: "Manager Profile" },
  { id: "matches", icon: CalendarDays, label: "Matches" },
  { id: "play", icon: Users, label: "Play" },
  { id: "competitions", icon: Trophy, label: "Manager Career" },
];

export default function App() {
  const [cloudSave, setCloudSave] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [sidebarSigningOut, setSidebarSigningOut] = useState(false);
  const [sidebarAccountError, setSidebarAccountError] = useState("");
  const [resultDismissed, setResultDismissed] = useState(false);
  const [accountEmail, setAccountEmail] = useState("Checking account...");
  const [localSaved, setLocalSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [career, setCareer] = useState(readCareer);
  const [matchId, setMatchId] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [showAccount, setShowAccount] = useState(false);
  const [screen, setScreen] = useState("welcome");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [homeFormation, setHomeFormation] = useState("4-3-3");
  const [homeLineup, setHomeLineup] = useState(defaultLineup.map(number => `rm-${number}`));
  const [homeCustomSquad, setHomeCustomSquad] = useState(() => squad.map(withId));
  const [databasePlayers, setDatabasePlayers] = useState([]);
  const [uclClubs, setUclClubs] = useState(FALLBACK_UCL_CLUBS);
  const [statsBombPlayers, setStatsBombPlayers] = useState([]);
  const [statsBombLoading, setStatsBombLoading] = useState(false);
  const [statsBombProgress, setStatsBombProgress] = useState({ completed: 0, total: 0 });
  const [statsBombError, setStatsBombError] = useState("");
  const [playerQuery, setPlayerQuery] = useState("");
  const [replaceSlot, setReplaceSlot] = useState(null);
  const [csvError, setCsvError] = useState("");
  const [databaseLoading, setDatabaseLoading] = useState(true);
  const [pickedNumber, setPickedNumber] = useState(null);
  const [draggedNumber, setDraggedNumber] = useState(null);
  const [infoPanel, setInfoPanel] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showGameMode, setShowGameMode] = useState(false);
  const [showOnlineMatch, setShowOnlineMatch] = useState(false);
  const [started, setStarted] = useState(false);
  const [homeClub, setHomeClub] = useState("Real Madrid");
  const [draftHomeClub, setDraftHomeClub] = useState("Real Madrid");
  const [homeSeason, setHomeSeason] = useState("");
  const [opponent, setOpponent] = useState("Barcelona");
  const [draftOpponent, setDraftOpponent] = useState("Barcelona");
  const [matchTeams, setMatchTeams] = useState(null);
  const [kickoffXI, setKickoffXI] = useState([]);
  const [kickoffOpponentXI, setKickoffOpponentXI] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [showSubstitution, setShowSubstitution] = useState(false);
  const [substitutionOff, setSubstitutionOff] = useState("");
  const [opponentSeason, setOpponentSeason] = useState("");
  const [awayEditor, setAwayEditor] = useState(() => opponentEditor(null));
  const [editingSide, setEditingSide] = useState("home");
  const [rosterError, setRosterError] = useState("");
  const [settings, setSettings] = useState(readSettings);
  const [matchRules, setMatchRules] = useState(readSettings);
  const [paused, setPaused] = useState(false);
  const [minute, setMinute] = useState(0);
  const [timeline, setTimeline] = useState(initialPhase);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [tactic, setTactic] = useState("balanced");
  const [targetId, setTargetId] = useState(null);
  const [playerMarking, setPlayerMarking] = useState(null);
  const [showPlayerInstruction, setShowPlayerInstruction] = useState(false);
  const [feed, setFeed] = useState([]);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [lastManagementMinute, setLastManagementMinute] = useState(0);
  const prematchRef = useRef(null);
  const finished = ["full-time", "abandoned"].includes(timeline.phase);
  const halftime = timeline.phase === "halftime";
  const homeTeamName = homeClub === "RANDOM_XI" ? "Random XI" : homeClub;

  useEffect(() => {
    let unsubscribe;
    let disposed = false;
    Promise.all([import("firebase/auth"), import("./services/firebase")]).then(([{ onAuthStateChanged }, { auth }]) => {
      if (!disposed) unsubscribe = onAuthStateChanged(auth, user => { setAccountEmail(user?.email || "Guest · not signed in"); setAccountId(user?.uid || null); }, () => setAccountEmail("Account unavailable"));
    }).catch(() => setAccountEmail("Account unavailable"));
    return () => { disposed = true; unsubscribe?.(); };
  }, []);

  async function signOutFromSidebar() {
    if (!accountId || sidebarSigningOut) return;
    setSidebarSigningOut(true);
    setSidebarAccountError("");
    try {
      const [{ signOut }, { auth }] = await Promise.all([import("firebase/auth"), import("./services/firebase")]);
      await signOut(auth);
    } catch (error) {
      console.error("SIDEBAR SIGN-OUT ERROR:", error);
      setSidebarAccountError("Could not sign out. Open your account and try again.");
    } finally {
      setSidebarSigningOut(false);
    }
  }

  const editingAway = editingSide === "away" && !started;
  const formation = editingAway ? awayEditor.formation : homeFormation;
  const lineup = editingAway ? awayEditor.lineup : started && matchTeams ? activePlayers(matchTeams.home).map(player => player.id) : homeLineup;
  function setAwayField(key, value) {
    setAwayEditor(old => ({ ...old, [key]: typeof value === "function" ? value(old[key]) : value }));
  }
  const setFormation = editingAway ? value => setAwayField("formation", value) : setHomeFormation;
  const setLineup = editingAway ? value => setAwayField("lineup", value) : setHomeLineup;
  const setCustomSquad = editingAway ? value => setAwayField("roster", value) : setHomeCustomSquad;
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(career)); setLocalSaved(true); }
    catch { setLocalSaved(false); }
  }, [career]);

  useEffect(() => {
    let disposed = false;
    async function loadUclDatabase() {
      try {
        const allPlayers = await loadPlayers();
        let index = null;
        try {
          index = await loadStatsBombUclIndex({
            onProgress: (completed, total) => setStatsBombProgress({ completed, total }),
          });
        } catch (error) {
          console.error("CHAMPIONS LEAGUE INDEX ERROR:", error);
          setStatsBombError("Could not load extra Champions League player data. The local player list is still available.");
        }
        if (disposed) return;
        const clubs = [...new Set([...FALLBACK_UCL_CLUBS, ...(index?.clubs || []), "Real Madrid"])];
        setUclClubs(clubs);
        const filteredPlayers = filterChampionsLeaguePlayers(allPlayers, clubs);
        setDatabasePlayers(filteredPlayers);
        const seed = buildOpponent(filteredPlayers, "Barcelona");
        setAwayEditor(old => old.roster.length ? old : opponentEditor(seed));
        setOpponentSeason(old => old || seed?.season || "");
        setCsvError("");
        setDatabaseLoading(false);

        if (!index) return;
        setStatsBombLoading(true);
        setStatsBombProgress({ completed: 0, total: index.latestMatches.length });
        try {
          const stats = await loadStatsBombSeason(index.latestCompetition, {
            matchList: index.latestMatches,
            onProgress: (completed, total) => setStatsBombProgress({ completed, total }),
          });
          if (!disposed) setStatsBombPlayers(filterChampionsLeaguePlayers(stats, clubs));
        } catch (error) {
          console.error("CHAMPIONS LEAGUE PLAYER DATA ERROR:", error);
          if (!disposed) setStatsBombError("Some extra Champions League player data could not be loaded. The local player list is still available.");
        } finally {
          if (!disposed) setStatsBombLoading(false);
        }
      } catch (error) {
        console.error("PLAYER DATASET ERROR:", error);
        if (!disposed) setCsvError("Could not load the player database. Please reload to try again.");
        if (!disposed) setDatabaseLoading(false);
      }
    }
    loadUclDatabase();
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (playerQuery.trim().length >= 2) {
      const panel = prematchRef.current;
      if (panel) panel.scrollTop = panel.scrollHeight;
    }
  }, [playerQuery, databaseLoading]);

  const allDatabasePlayers = useMemo(() => [...mergeChampionsLeaguePlayers(databasePlayers, statsBombPlayers, uclClubs), ...legends], [databasePlayers, statsBombPlayers, uclClubs]);
  const homeRoster = useMemo(() => homeCustomSquad.map(player => resolvePlayerSeason(player, allDatabasePlayers)), [allDatabasePlayers, homeCustomSquad]);
  const availableSquad = editingAway ? awayEditor.roster : homeRoster;
  const canKickoff = validLineup(homeLineup, homeRoster) && validLineup(awayEditor.lineup, awayEditor.roster);
  const byId = (id) => availableSquad.find(player => player.id === id);
  const starters = lineup.filter(Boolean);
  const bench = started && matchTeams ? eligibleSubstitutes(homeRoster, matchTeams.home.players, substitutions) : availableSquad.filter(player => !starters.includes(player.id));
  const disciplinary = useMemo(() => refereeSummary(feed), [feed]);
  // Select any player on the ticket, then click a green circle on the pitch.
  function placePlayer(id, slotIndex) {
    if (started || !id) return;
    setLineup(current => {
      const next = [...current];
      const previousIndex = next.indexOf(id);
      const displaced = next[slotIndex];
      next[slotIndex] = id;
      if (previousIndex !== -1 && previousIndex !== slotIndex) next[previousIndex] = displaced;
      return next;
    });
    setPickedNumber(null);
    setDraggedNumber(null);
    setReplaceSlot(null);
    setSelectedPlayer(null);
  }

  function handlePitchClick(index) {
    const player = byId(lineup[index]);
    if (!started) {
      setReplaceSlot(index);
      if (pickedNumber) { placePlayer(pickedNumber, index); return; }
    }
    setSelectedPlayer(old => old?.id === player?.id ? null : player || null);
  }

  function handleBenchClick(id) {
    if (started) setSelectedPlayer(byId(id));
    else { setPickedNumber(old => old === id ? null : id); setSelectedPlayer(null); }
  }

  function addDatabasePlayer(player) {
    if (started) return;
    const added = databaseSquadPlayer(player, availableSquad);
    const id = added.id;
    if (!availableSquad.some(item => item.id === id) && availableSquad.length >= MAX_SQUAD_SIZE) {
      setRosterError(`Your squad is full (${MAX_SQUAD_SIZE} players). Release a substitute before adding someone.`);
      return;
    }
    setRosterError("");
    setCustomSquad(current => current.some(item => item.id === id)
      ? current.map(item => item.id === id ? added : item)
      : [...current, added]);
    // Pick the target position first, otherwise replace the currently selected starter.
    const slot = replaceSlot ?? (pickedNumber ? lineup.indexOf(pickedNumber) : -1);
    if (slot >= 0) placePlayer(id, slot);
    else setPickedNumber(id);
    setPlayerQuery("");
  }

  function releaseSquadPlayer(id) {
    if (started || lineup.includes(id)) return;
    setCustomSquad(current => current.filter(player => player.id !== id));
    setRosterError("");
    setPickedNumber(null);
  }

  function prepareMatch() {
    const managedSeed = draftHomeClub === "RANDOM_XI" ? buildRandomTeam(allDatabasePlayers)
      : buildOpponent(allDatabasePlayers, draftHomeClub);
    const opponentSeed = draftOpponent === "RANDOM_XI" ? buildRandomTeam(allDatabasePlayers)
      : buildOpponent(allDatabasePlayers, draftOpponent);
    if (!managedSeed || !opponentSeed) return;
    const editor = opponentEditor(managedSeed);
    setHomeCustomSquad(editor.roster);
    setHomeLineup(editor.lineup);
    setHomeFormation(editor.formation);
    setHomeClub(managedSeed.name);
    setHomeSeason(managedSeed?.season || "");
    setOpponent(opponentSeed.name);
    setOpponentSeason(opponentSeed.season || "");
    if (draftOpponent === "RANDOM_XI" || draftOpponent !== opponent || opponentSeed.season !== opponentSeason || !awayEditor.roster.length) {
      setAwayEditor(opponentEditor(opponentSeed));
    }
    setEditingSide("home");
    setInfoPanel(null);
    setPaused(false);
    setStarted(false);
    setSubstitutions([]);
    setShowSubstitution(false);
    setMatchTeams(null);
    setMatchId(null);
    setDecisions([]);
    setMinute(0);
    setTimeline(initialPhase());
    setHomeScore(0);
    setAwayScore(0);
    setFeed([]);
    setTactic("balanced");
    setTargetId(null);
    setPlayerMarking(null);
    setPendingDecision(null);
    setLastManagementMinute(0);
    setPickedNumber(null);
    setDraggedNumber(null);
    setReplaceSlot(null);
    setSelectedPlayer(null);
    setPlayerQuery("");
    setShowSetup(false);
  }

  function beginMatch() {
    if (!canKickoff) return;
    const home = { name: homeTeamName, season: homeSeason, players: homeLineup.map((id, index) => ({ ...homeRoster.find(player => player.id === id), role: formations[homeFormation][index][2] })) };
    const away = { name: opponent, season: opponentSeason, formation: awayEditor.formation, players: awayEditor.lineup.map((id, index) => ({ ...awayEditor.roster.find(player => player.id === id), role: formations[awayEditor.formation][index][2] })) };
    setMatchTeams({ home, away });
    setKickoffXI(home.players);
    setKickoffOpponentXI(away.players);
    setSubstitutions([]);
    setShowSubstitution(false);
    setEditingSide("home");
    setMatchRules({ ...settings, substitutionLimit: SUBSTITUTION_LIMIT });
    setPaused(false);
    setTargetId(null);
    setPlayerMarking(null);
    setMatchId(crypto.randomUUID());
    setDecisions([]);
    setMinute(0);
    setTimeline(initialPhase());
    setHomeScore(0);
    setAwayScore(0);
    setTactic("balanced");
    setSelectedPlayer(null);
    setPendingDecision(null);
    setLastManagementMinute(0);
    setFeed([{ id: 0, minute: 0, kind: "info", text: `Kickoff! ${home.name} face ${opponent}.` }]);
    setResultDismissed(false);
    setStarted(true);
    setPickedNumber(null);
    setShowSetup(false);
  }

  function advanceMatch(stepMinutes = 5) {
    if (!started || pendingDecision || finished || halftime) return;
    const plannedMinute = Math.min(minute + stepMinutes, phaseBoundary(timeline));
    const actualStep = plannedMinute - minute;
    if (actualStep <= 0) return;
    const regulationStart = timeline.halfTimeAt === null ? Math.min(45, minute) : Math.min(90, 45 + minute - timeline.halfTimeAt);
    const result = simulateStep({ ...matchTeams, minute, tactic, targetId, marking: playerMarking, stepMinutes: actualStep, endMinute: plannedMinute, recentEvents: feed.slice(-20), score: { home: homeScore, away: awayScore }, regulationStart });
    const nextMinute = result.playedUntil;
    setMatchTeams(result.teams);
    const events = result.events.map(event => ({ ...event, clockLabel: matchMinute(event.minute, timeline) }));
    const goalsFor = homeScore + result.homeGoal;
    const goalsAgainst = awayScore + result.awayGoal;
    const progressed = result.abandoned ? { state: { ...timeline, phase: "abandoned" }, notices: [] } : progressPhase(timeline, nextMinute, [...feed, ...events]);
    const nextTimeline = progressed.state;
    const finalFeed = [...feed, ...events, ...progressed.notices];
    setMinute(nextMinute);
    setTimeline(nextTimeline);
    setHomeScore(goalsFor);
    setAwayScore(goalsAgainst);
    setFeed(finalFeed);
    const gameMinute = nextTimeline.halfTimeAt === null ? nextMinute : 45 + nextMinute - nextTimeline.halfTimeAt;
    const recentEvents = [...feed, ...events].filter(event => event.minute > nextMinute - 8);
    const activeHalf = !["halftime", "full-time", "abandoned"].includes(nextTimeline.phase);
    const situation = activeHalf && shouldOfferDecision(nextMinute, lastManagementMinute, recentEvents, Math.random)
      ? managementSituation({ home: result.teams.home, away: result.teams.away, events: recentEvents, context: { minute: gameMinute, homeScore: goalsFor, awayScore: goalsAgainst, canSubstitute: substitutions.length < matchRules.substitutionLimit && bench.length > 0 }, recentTypes: decisions.map(decision => decision.type).filter(Boolean), random: Math.random }) : null;
    if (situation) {
      const decision = { ...situation, source: "automatic", minute: nextMinute, clockLabel: matchMinute(nextMinute, nextTimeline) };
      setLastManagementMinute(nextMinute);
      setPendingDecision(decision);
      setFeed(old => [...old, { id: crypto.randomUUID(), minute: nextMinute, clockLabel: decision.clockLabel, kind: "situation", title: decision.title, text: decision.text }]);
    }
    if (nextTimeline.phase === "full-time") {
      const record = {
        id: matchId, date: new Date().toISOString(), homeTeam: matchTeams.home.name, opponent, opponentClub: opponent, goalsFor, goalsAgainst, formation: homeFormation,
        playerInstructions: playerMarking ? [playerMarking] : [],
        matchRules, elapsedMinutes: nextMinute,
        addedTime: { firstHalf: nextTimeline.firstAdded, secondHalf: nextTimeline.secondAdded },
        result: goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D",
        decisions: [...decisions], events: finalFeed,
        modelVersion: MODEL_VERSION,
        startingXI: kickoffXI, finalXI: activePlayers(result.teams.home), substitutions: [...substitutions], opponentXI: kickoffOpponentXI, finalOpponentXI: activePlayers(result.teams.away),
        referee: refereeSummary(finalFeed),
        opponentSeason: matchTeams.away.season,
        matchStats: {
          homeShots: finalFeed.filter(event => event.side === "home" && isShotEvent(event)).length,
          awayShots: finalFeed.filter(event => event.side === "away" && isShotEvent(event)).length,
        },
      };
      setCareer(old => old.matches.some(match => match.id === matchId) ? old : { ...old, matches: [record, ...old.matches] });
    }
  }

  function resumeSecondHalf() {
    if (!halftime) return;
    setTimeline(old => ({ ...old, phase: "second-half" }));
    setPaused(false);
    setLastManagementMinute(minute);
    setFeed(old => [...old, { id: crypto.randomUUID(), minute, clockLabel: "45'", kind: "info", pitchReset: true, text: "Second half kickoff. Your selected instructions are now in effect." }]);
  }

  function halftimeTactic(value) {
    setTactic(value);
    setTargetId(null);
    const label = "Half-time instructions: " + value;
    setDecisions(old => [...old, { minute, clockLabel: "HALF TIME", label, tactic: value, timedOut: false }]);
    setFeed(old => [...old, { id: crypto.randomUUID(), minute, clockLabel: "HALF TIME", kind: "choice", title: label, text: "You change the team's approach for the second half." }]);
  }

  function chooseDecision(choice, timedOut = false) {
    if (!pendingDecision) return;
    const chosenTactic = choice.action === "substitute" ? tactic : choice.tactic;
    setTactic(chosenTactic);
    if (choice.action !== "substitute") setTargetId(choice.targetId || null);
    if (choice.action === "substitute") { setSubstitutionOff(choice.playerId); setShowSubstitution(true); }
    setDecisions(old => [...old, { minute: pendingDecision.minute, label: choice.label, tactic: chosenTactic, targetId: choice.targetId || null, action: choice.action || "tactic", timedOut, clockLabel: pendingDecision.clockLabel,
      type: pendingDecision.type || "tactical", source: pendingDecision.source || "automatic", basis: pendingDecision.basis || {} }]);
    setFeed((old) => [...old, {
      id: Date.now() + Math.random(), minute: pendingDecision.minute, clockLabel: pendingDecision.clockLabel,
      kind: "choice", title: choice.label, text: choice.note,
    }]);
    setPendingDecision(null);
  }

  function giveInstructions() {
    if (!started || finished || halftime || pendingDecision || paused) return;
    const gameMinute = timeline.halfTimeAt === null ? Math.min(minute, 45) : Math.min(90, 45 + minute - timeline.halfTimeAt);
    const situation = managementSituation({ home: matchTeams.home, away: matchTeams.away, events: feed.filter(event => event.minute > minute - 8),
      context: { minute: gameMinute, homeScore, awayScore, canSubstitute: substitutions.length < matchRules.substitutionLimit && bench.length > 0 },       recentTypes: decisions.map(decision => decision.type).filter(Boolean), random: Math.random });
    const decision = { ...situation, source: "manual", minute, clockLabel: matchMinute(minute, timeline) };
    setLastManagementMinute(minute);
    setPendingDecision(decision);
    setFeed(old => [...old, { id: crypto.randomUUID(), minute, clockLabel: decision.clockLabel, kind: "situation", title: decision.title, text: decision.text }]);
  }

  function confirmSubstitution(playerOffId, playerOnId) {
    if (!started || finished) throw new Error("Substitutions are only available during the match.");
    const replacement = substitute(matchTeams.home, homeRoster, substitutions, playerOffId, playerOnId, matchRules.substitutionLimit);
    const change = { ...replacement.change, minute, clockLabel: matchMinute(minute, timeline) };
    setMatchTeams(old => ({ ...old, home: replacement.team }));
    setSubstitutions(old => [...old, change]);
    if (pendingDecision?.choices.some(choice => choice.action === "substitute" && choice.playerId === playerOffId)) {
      setDecisions(old => [...old, { minute, clockLabel: change.clockLabel, label: `Substitute booked player ${change.playerOff.name}`, tactic, type: "booking-risk", source: "substitution", timedOut: false }]);
      setPendingDecision(null);
    }
    setSelectedPlayer(null);
    setFeed(old => [...old, { id: crypto.randomUUID(), minute, clockLabel: change.clockLabel, kind: "substitution",
      text: `${change.playerOn.name} comes on for ${change.playerOff.name}. ${substitutions.length + 1}/${matchRules.substitutionLimit} substitutions used.`,
      playerOffId, playerOnId, stoppageSeconds: halftime ? 0 : 30 }]);
    setShowSubstitution(false);
  }

  function confirmPlayerInstruction(instruction) {
    setPlayerMarking(instruction);
    const label = instruction ? `${instruction.markerName} will stay close to ${instruction.targetName}` : "Remove the player-marking instruction";
    setDecisions(old => [...old, { minute, clockLabel: matchMinute(minute, timeline), label, action: "marking", type: "player-instruction", source: "manual", timedOut: false }]);
    setFeed(old => [...old, { id: crypto.randomUUID(), minute, clockLabel: matchMinute(minute, timeline), kind: "choice", title: label,
      text: instruction ? "This instruction makes the marked player's shots and attacking link-ups less likely in the match model." : "Your players return to their usual defensive roles." }]);
    setShowPlayerInstruction(false);
  }

  const timerPaused = paused || halftime || showSubstitution || showPlayerInstruction || Boolean(infoPanel) || showSetup || showGameMode || showAccount || screen !== "game";
  const timer = useMatchTimer({ matchId, started, paused: timerPaused, finished, minute, decision: pendingDecision,
    rules: matchRules, onAdvance: advanceMatch,
    onTimeout: () => chooseDecision({ label: "Time expired: keep current instructions", tactic, targetId,
      note: "The deadline passed. Your previous tactical instructions remain in effect." }, true) });
  function openMatchSetup() {
    setDraftHomeClub(homeClub === "Random XI" || homeClub === "RANDOM_XI" ? "RANDOM_XI" : homeClub);
    setDraftOpponent(opponent === "Random XI" ? "RANDOM_XI" : opponent);
    setInfoPanel(null);
    setShowSetup(true);
    setShowGameMode(false);
  }
  function switchEditor(side) {
    setEditingSide(side); setSelectedPlayer(null); setPickedNumber(null); setReplaceSlot(null); setPlayerQuery("");
  }

  const wins = career.matches.filter(m => m.result === "W").length;
  const draws = career.matches.filter(m => m.result === "D").length;
  const losses = career.matches.filter(m => m.result === "L").length;
  const winRate = career.matches.length ? Math.round(100 * wins / career.matches.length) : 0;

  const accountPanel = showAccount && <Suspense fallback={<div className="modal-overlay"><p role="status">Loading account...</p></div>}><AccountPanel career={career}
    onCloudSaved={(uid, savedCareer) => setCloudSave({ uid, snapshot: JSON.stringify(savedCareer) })}
    canLoad={!started || finished} onClose={() => setShowAccount(false)}
    onLoad={loaded => {
      // Back up the browser career before the user explicitly loads cloud data.
      localStorage.setItem(STORAGE_KEY + "-backup-" + Date.now(), JSON.stringify(career));
      setCareer(loaded);
      setScreen("game");
      setTimeline(initialPhase());
      setStarted(false);
      setMinute(0);
      setHomeScore(0);
      setAwayScore(0);
      setFeed([]);
      setPendingDecision(null);
      setMatchId(null);
      setDecisions([]);
      setInfoPanel(null);
      setShowSetup(false);
      setShowGameMode(false);
    }} /></Suspense>;

  if (screen === "welcome") {
    return <>
      <WelcomePage accountEmail={accountEmail} career={career} onAccount={() => setShowAccount(true)} onContinue={() => {
        setScreen("game");
        setShowSetup(false);
        setShowGameMode(false);
      }}
        onCreate={name => {
          setCareer(old => old.managerName.trim() ? old : { ...old, managerName: name });
          setScreen("game");
          setShowSetup(false);
          setShowGameMode(false);
        }} />
      {accountPanel}
    </>;
  }

  return (
    <div className="app-background">
      <div className={`game-shell ${started ? "live-match" : ""}`}>
        <aside className="sidebar">
          <div className="brand-mark"><img src={dugoutLogo} alt="The Dugout" /></div>
          <nav className="sidebar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} className={`nav-button ${activeTab === item.id ? "active" : ""}`} title={item.label} aria-label={item.label} onClick={() => {
                setActiveTab(item.id);
                setSelectedHistory(null);
                if (item.id === "play") {
                  setInfoPanel(null);
                  setShowSetup(false);
                  setShowGameMode(true);
                } else {
                  setShowGameMode(false);
                  setInfoPanel(item.id);
                }
              }}><Icon size={20} /></button>;
            })}
          </nav>
          <div className="sidebar-bottom">
            <details className="console-account">
              <summary title={career.managerName + " - " + accountEmail} aria-label="Manager and account details"><span>{(career.managerName || "M").slice(0, 2).toUpperCase()}</span><i className={localSaved ? "device-saved" : "device-unsaved"} /></summary>
        <div className="manager-bar">
          <div><strong>{career.managerName || "No manager created"}</strong><small>{homeTeamName} · {career.matches.length} completed matches · {localSaved ? "Saved on this device" : "Device save unavailable"}</small></div>
          <button onClick={() => setShowAccount(true)}><UserRound size={16} /><span>{accountEmail}<small>{accountId && cloudSave?.uid === accountId && cloudSave.snapshot === JSON.stringify(career) ? "Cloud save up to date" : "Account · cloud save is manual"}</small></span></button>
        {accountId && <button type="button" className="sidebar-logout" onClick={signOutFromSidebar} disabled={sidebarSigningOut}>
          {sidebarSigningOut ? "Logging out…" : "Log out"}
        </button>}
        {sidebarAccountError && <p className="csv-error" role="alert">{sidebarAccountError}</p>}
        </div>

            </details>
            <button className="nav-button" title="Settings" onClick={() => setInfoPanel("settings")}><Settings size={20} /></button>
            <button className="nav-button" title="Match setup" aria-label="Match setup" onClick={openMatchSetup}><SlidersHorizontal size={20} /></button>
          </div>
        </aside>

        <main className="main-content">
          <div className="scoreboard">
            <span>{matchTeams?.home.name.toUpperCase() || homeTeamName.toUpperCase()}</span>
            <div className="score-center"><strong>{homeScore} - {awayScore}</strong><small>{matchMinute(minute, timeline)}</small></div>
            <span>{opponent.toUpperCase()}</span>
          </div>
          <Pitch {...{ formation, byId, lineup, started, setDraggedNumber, draggedNumber, placePlayer, selectedPlayer, pickedNumber, handlePitchClick, setSelectedPlayer, matchTeams, matchId }}
            action={feed.findLast(event => ["goal", "shot", "buildup", "event"].includes(event.kind) || event.pitchReset)}
            running={started && !timerPaused && !pendingDecision && !finished}
            secondHalf={timeline.phase.startsWith("second") || (finished && timeline.halfTimeAt !== null)} />
          <div className="pitch-footer"><span>FORMATION {formation}</span><span>{started ? timeline.phase === "abandoned" ? "MATCH ABANDONED" : finished ? "MATCH COMPLETE" : halftime ? "HALF-TIME BREAK" : "MATCH IN PROGRESS" : "TAP A PLAYER, THEN A POSITION TO SWAP"}</span></div>

        </main>

        <aside className="decision-panel">
          {!started ? (
            <div className="prematch-panel" ref={prematchRef}>
              <p className="eyebrow">{editingAway ? "OPPONENT LINEUP" : "YOUR LINEUP"}</p>
              <div className="editor-tabs" role="group" aria-label="Team to edit">
                <button type="button" aria-pressed={!editingAway} onClick={() => switchEditor("home")}>Your XI</button>
                <button type="button" aria-pressed={editingAway} onClick={() => switchEditor("away")}>Opponent XI</button>
              </div>
              <h2>Ready for kickoff?</h2>
              <p className="panel-description">Build your XI on the pitch. Drag players on desktop, or tap a player and then a position on mobile.</p>
              <label className="formation-label" htmlFor="formation">FORMATION</label>
              <select id="formation" className="formation-select" value={formation} onChange={(event) => { setFormation(event.target.value); setSelectedPlayer(null); setPickedNumber(null); setReplaceSlot(null); }}>
                {Object.keys(formations).map((name) => <option key={name}>{name}</option>)}
              </select>
              <p className="panel-description lineup-help">Your team: {homeTeamName} · Opponent: {opponent}</p>
              <p className="lineup-help">Player stats help shape attacks. When stats are missing, the game estimates them.</p>
              <button className="secondary-button" type="button" onClick={() => { setLineup(Array(11).fill(null)); setSelectedPlayer(null); setPickedNumber(null); setReplaceSlot(null); }}>Clear XI</button>
              <p className="lineup-count">{editingAway ? "OPPONENT SQUAD" : "YOUR SQUAD"} · {starters.length}/11 STARTERS · {availableSquad.length}/{MAX_SQUAD_SIZE} PLAYERS</p>
              {availableSquad.length >= MAX_SQUAD_SIZE
                ? <p className="csv-error" role="alert">Your squad is full ({MAX_SQUAD_SIZE} players). You can't add anyone else until you release a substitute.</p>
                : rosterError && <p className="csv-error" role="alert">{rosterError}</p>}
              <p className="panel-description lineup-help">Select a player below, then tap the green position circle on the pitch to swap them in.</p>
              <div className="ticket-squad-list">
                {availableSquad.map(player => <div className="ticket-squad-row" key={player.id}>
                  <button type="button" className={`ticket-squad-player ${pickedNumber === player.id ? "picked" : ""} ${starters.includes(player.id) ? "in-xi" : ""}`}
                    draggable onDragStart={event => { event.dataTransfer.setData("text/plain", player.id); setDraggedNumber(player.id); }}
                    onClick={() => handleBenchClick(player.id)}>
                    <span className="ticket-green-number">{player.number}</span>
                    <span className="ticket-squad-name">{player.name}<small>{player.role} · {starters.includes(player.id) ? "STARTING XI" : "SUBSTITUTE"}</small></span>
                  </button>
                  {!started && !starters.includes(player.id) && <button className="release-player" type="button" aria-label={`Release ${player.name}`} onClick={() => releaseSquadPlayer(player.id)}>Release</button>}
                </div>)}
              </div>
              <PlayerDatabase players={allDatabasePlayers}
                query={playerQuery} setQuery={setPlayerQuery} loading={databaseLoading}
                error={csvError} onSelect={addDatabasePlayer}
                statsBombLoading={statsBombLoading} statsBombProgress={statsBombProgress} statsBombError={statsBombError} />
              <button className="primary-button" disabled={!canKickoff} onClick={beginMatch}><Play size={16}/> Start Match</button>
            </div>
          ) : (
            <>
              <div className="match-feed-header"><p className="eyebrow">LIVE MATCH FEED</p><h2>{pendingDecision ? "Your decision" : timeline.phase === "abandoned" ? "Match abandoned" : finished ? "Full time" : halftime ? "Half time" : "On the touchline"}</h2></div>
              <div className="match-timer" role="status">
                <span>{timeline.phase === "abandoned" ? "Match stopped" : finished ? "Match complete" : halftime ? "Half-time break · clock stopped" : timeline.phase.endsWith("added") ? `Added time · ${matchMinute(minute, timeline)}` : matchRules.autoPlay ? formatTime(Math.max(0, matchRules.durationMinutes * 60000 - timer.elapsed + Math.max(0, (timeline.halfTimeAt || 45) - 45) * matchRules.durationMinutes * 60000 / 90)) + " regulation time left" : "Manual match"}</span>
                {!finished && !halftime && <button type="button" onClick={() => setPaused(old => !old)}>{paused ? "Resume" : "Pause"}</button>}
              </div>
              {(disciplinary.home.yellows + disciplinary.home.reds + disciplinary.away.yellows + disciplinary.away.reds > 0) && <div className="disciplinary-status" aria-label="Cards and players on the pitch">
                <span>Your XI: Y {disciplinary.home.yellows} · R {disciplinary.home.reds} · {matchTeams ? activePlayers(matchTeams.home).length : 11} players</span>
                <span>Opposition: Y {disciplinary.away.yellows} · R {disciplinary.away.reds} · {matchTeams ? activePlayers(matchTeams.away).length : 11} players</span>
              </div>}
              <Substitutes players={bench} used={substitutions.length}
                limit={matchRules.substitutionLimit} finished={finished} onSubstitute={() => { setSubstitutionOff(""); setShowSubstitution(true); }} />
              <MatchFeed events={feed} />
              <div className="ticket-divider" aria-hidden="true" />
              <div className="match-controls">
                {!finished && !halftime && <button className="manager-instructions-button" type="button" disabled={Boolean(pendingDecision) || paused} onClick={giveInstructions}>Give instructions</button>}
                {!finished && !halftime && <button className="secondary-button" type="button" disabled={Boolean(pendingDecision) || paused}
                  onClick={() => setShowPlayerInstruction(true)}>{playerMarking ? `Mark ${playerMarking.targetName}` : "Mark an opponent"}</button>}
                {halftime ? <HalfTimePanel {...{ homeScore, awayScore, feed, tactic, onTactic: halftimeTactic, onResume: resumeSecondHalf }} /> : pendingDecision ? (
                  <p className="current-tactic">Decision in progress · match clock stopped</p>
                ) : !finished ? (
                  matchRules.autoPlay ? <p className="current-tactic">{paused ? "MATCH PAUSED" : "MATCH RUNNING"} · {tactic.toUpperCase()}</p> :
                  <button className="primary-button" disabled={paused} onClick={() => advanceMatch(5)}>
                    <Play size={16} /> Continue Match
                  </button>
                ) : (
                  <p className="full-time-label">{timeline.phase === "abandoned" ? "MATCH ABANDONED · No completed result saved" : `FULL TIME · ${homeScore} – ${awayScore}`}</p>
                )}
              </div>

            </>
          )}
        </aside>
      </div>

      {pendingDecision && !showSubstitution && <MatchDialog title={pendingDecision.title} label="BIG DECISION">
        <p className="decision-context">{pendingDecision.clockLabel} · {matchTeams?.home.name || homeTeamName} {homeScore} – {awayScore} {opponent}</p>
        <p>{pendingDecision.text}</p>
        <p className="decision-deadline" role="status">{matchRules.timedDecisions ? (paused ? "Decision timer paused" : "Decide in " + Math.ceil(timer.remaining / 1000) + "s") : "Match paused · take your time"}</p>
        <div className="decision-choices">{pendingDecision.choices.map(choice => <button key={choice.label} className="choice-button" onClick={() => chooseDecision(choice)}>{choice.label}<small>{choice.note}</small></button>)}</div>
      </MatchDialog>}
      {showPlayerInstruction && started && matchTeams && <PlayerInstructionModal home={matchTeams.home} away={matchTeams.away}
        current={playerMarking} onClose={() => setShowPlayerInstruction(false)} onConfirm={confirmPlayerInstruction} />}
      {finished && !resultDismissed && <MatchDialog title={timeline.phase === "abandoned" ? "Match abandoned" : homeScore > awayScore ? "Victory!" : homeScore < awayScore ? "A tough defeat" : "Honours even"} label="FULL TIME" onClose={() => setResultDismissed(true)}>
        <div className={"result-score " + (homeScore > awayScore ? "won" : homeScore < awayScore ? "lost" : "drawn")}><span>{matchTeams?.home.name || homeTeamName}</span><strong>{homeScore} – {awayScore}</strong><span>{opponent}</span></div>
        <p>{timeline.phase === "abandoned" ? "The match was stopped. No completed result was saved." : homeScore > awayScore ? "Job done. Your team delivered when it mattered." : homeScore < awayScore ? "A result to learn from. Regroup and come back stronger." : "A hard-fought draw. There is more to build on."}</p>
        <p>{timeline.phase !== "abandoned" && (localSaved ? "Saved to your manager career on this device." : "Device save unavailable. Open Account to save to the cloud.")}</p>
        <button className="primary-button" onClick={() => setResultDismissed(true)}>Review match</button>
        <button className="secondary-button" onClick={() => { setResultDismissed(true); openMatchSetup(); }}>Next match</button>
      </MatchDialog>}
      {accountPanel}
      {showSubstitution && started && matchTeams && <SubstitutionModal active={activePlayers(matchTeams.home)} bench={bench}
        initialOff={substitutionOff} used={substitutions.length} limit={matchRules.substitutionLimit} onClose={() => setShowSubstitution(false)} onConfirm={confirmSubstitution} />}
      {infoPanel && <CareerPage {...{ infoPanel, setInfoPanel, career, selectedHistory, setSelectedHistory, wins, draws, losses, winRate, settings, setSettings, started, onRestart: openMatchSetup, onMenu: () => { setInfoPanel(null); setScreen("welcome"); setPaused(true); }, onAccount: () => { setInfoPanel(null); setShowAccount(true); } }} />}

      {showGameMode && <GameModeModal
        signedIn={Boolean(accountId)}
        onSinglePlayer={() => { setShowGameMode(false); setShowSetup(true); }}
        onMultiplayer={() => { setShowGameMode(false); setShowOnlineMatch(true); }}
        onRequireAccount={() => { setShowGameMode(false); setShowAccount(true); }}
        onClose={() => { setShowGameMode(false); setShowSetup(false);  }} />}
      <OnlineMatchPanel open={showOnlineMatch} onClose={() => setShowOnlineMatch(false)}
        uid={accountId} managerName={career.managerName} players={allDatabasePlayers} clubs={uclClubs} />
      {showSetup && !showGameMode && <MatchSetup homeTeam={draftHomeClub} setHomeTeam={setDraftHomeClub}
        opponent={draftOpponent} setOpponent={setDraftOpponent} players={allDatabasePlayers} clubs={uclClubs}
        loading={databaseLoading} error={csvError} started={started && !finished} onClose={() => setShowSetup(false)} onConfirm={prepareMatch} />}

    </div>
  );
}
