import { defaultSettings } from "../data/settings";
export default function SettingsPage({ settings, setSettings, started, onRestart, onMenu, onAccount }) {
  return <div className="career-section">
    <p>Timing changes apply to your next kickoff. Menus, pause, and hidden browser tabs stop the clocks.</p>
    <label htmlFor="match-duration">Regulation playing time · {settings.durationMinutes} minutes</label>
    <input id="match-duration" type="range" min="3" max="10" step="1" value={settings.durationMinutes}
      onChange={event => setSettings(old => ({ ...old, durationMinutes: Number(event.target.value) }))} />
    <div className="range-labels"><span>3 min</span><span>5 min</span><span>10 min</span></div>
    <label className="setting-toggle"><input type="checkbox" checked={settings.autoPlay} onChange={event => setSettings(old => ({ ...old, autoPlay: event.target.checked }))} />Automatic match progression</label>
    <label className="setting-toggle"><input type="checkbox" checked={settings.timedDecisions} onChange={event => setSettings(old => ({ ...old, timedDecisions: event.target.checked }))} />Timed tactical decisions</label>
    <label htmlFor="decision-duration">Decision deadline · {settings.decisionSeconds} seconds</label>
    <input id="decision-duration" type="range" min="5" max="45" step="5" disabled={!settings.timedDecisions} value={settings.decisionSeconds}
      onChange={event => setSettings(old => ({ ...old, decisionSeconds: Number(event.target.value) }))} />
    <p>If time expires, your previous instructions remain in effect and the missed decision is recorded. Added time and decisions extend the selected regulation playing time. Halftime waits for you to start the second half.</p>
    <button className="secondary-button" onClick={onAccount}>Account · sign in / sign out / cloud saves</button>
    <button className="secondary-button" onClick={onRestart}>{started ? "Restart match / change lineups" : "Set up a match"}</button>
    {started && <p>Restart discards the unfinished match. Completed career history stays saved.</p>}
    <button className="secondary-button" onClick={onMenu}>Return to opening screen</button>
    <button className="secondary-button" onClick={() => setSettings({ ...defaultSettings })}>Restore default settings</button>
  </div>;
}
