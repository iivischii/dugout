// Real Madrid first-team squad for 2026/27.
export const squad = [
  { number: 1, name: "Courtois", role: "GK" },
  { number: 13, name: "Lunin", role: "GK" },
  { number: 2, name: "Asencio", role: "CB" },
  { number: 3, name: "Eder Militão", role: "CB" },
  { number: 4, name: "Huijsen", role: "CB" },
  { number: 5, name: "Bellingham", role: "CM" },
  { number: 6, name: "Camavinga", role: "CM" },
  { number: 7, name: "Vinícius Júnior", role: "LW" },
  { number: 8, name: "Valverde", role: "CM" },
  { number: 10, name: "Mbappé", role: "ST" },
  { number: 11, name: "Rodrygo", role: "RW" },
  { number: 12, name: "Trent", role: "RB" },
  { number: 14, name: "Tchouaméni", role: "CDM" },
  { number: 15, name: "Arda Güler", role: "CM" },
  { number: 18, name: "Á. Carreras", role: "LB" },
  { number: 21, name: "Brahim", role: "F" },
];

// Slot order: GK, back line (left to right), midfield, attack.
export const formations = {
  "4-2-3-1": [
    [50, 89, "GK"], [17, 74, "LB"], [39, 77, "CB"], [61, 77, "CB"], [83, 74, "RB"],
    [39, 59, "CDM"], [61, 59, "CM"], [17, 36, "LW"], [50, 39, "CAM"], [83, 36, "RW"], [50, 17, "ST"],
  ],
  "4-3-3": [
    [50, 89, "GK"], [17, 74, "LB"], [39, 77, "CB"], [61, 77, "CB"], [83, 74, "RB"],
    [50, 60, "CDM"], [30, 48, "CM"], [70, 48, "CM"], [17, 23, "LW"], [83, 23, "RW"], [50, 16, "ST"],
  ],
  "4-4-2": [
    [50, 89, "GK"], [17, 74, "LB"], [39, 77, "CB"], [61, 77, "CB"], [83, 74, "RB"],
    [16, 49, "LM"], [39, 54, "CM"], [61, 54, "CM"], [84, 49, "RM"], [37, 22, "ST"], [63, 22, "ST"],
  ],
  "3-5-2": [
    [50, 89, "GK"], [24, 75, "CB"], [50, 77, "CB"], [76, 75, "CB"],
    [12, 48, "LWB"], [34, 55, "CM"], [50, 62, "CDM"], [66, 55, "CM"], [88, 48, "RWB"],
    [37, 22, "ST"], [63, 22, "ST"],
  ],
};

export const defaultLineup = [1, 18, 4, 3, 12, 14, 5, 8, 7, 11, 10];
export const withId = (player) => ({ ...player, id: `rm-${player.number}` });
export const normalize = (text) => String(text ?? "").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
