export const SETTINGS_KEY = "dugout-settings-v1";
export const defaultSettings = { durationMinutes: 5, decisionSeconds: 20, autoPlay: true, timedDecisions: true };
export function sanitizeSettings(value = {}) {
  return {
    durationMinutes: Math.max(3, Math.min(10, Number(value.durationMinutes) || 5)),
    decisionSeconds: Math.max(5, Math.min(45, Number(value.decisionSeconds) || 20)),
    autoPlay: typeof value.autoPlay === "boolean" ? value.autoPlay : true,
    timedDecisions: typeof value.timedDecisions === "boolean" ? value.timedDecisions : true,
  };
}
export function readSettings() {
  try { return sanitizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")); }
  catch { return { ...defaultSettings }; }
}
