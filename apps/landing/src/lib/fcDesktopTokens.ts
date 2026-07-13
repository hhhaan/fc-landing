/** Light-theme tokens from fc-desktop `src/App.css` — workflow demo UI baseline. */
export const FC_DESKTOP_LIGHT = {
  mainBg: "#ffffff",
  roastBg: "#ffffff",
  surface: "#efeff0",
  surfaceElevated: "#efeff0",
  surfaceWarmSolid: "#f5f2ef",
  primary: "#171717",
  secondary: "#4e4e4e",
  muted: "#777169",
  border: "#e5e5e5",
  borderSubtle: "rgba(0, 0, 0, 0.05)",

  sensorBt: "#22a85a",
  sensorEt: "#4a85c5",
  sensorRor: "#f1c21b",
  sensorBtTarget: "rgba(40, 180, 130, 0.65)",

  phaseReady: "#22a85a",
  phaseReadyBg: "rgba(34, 168, 90, 0.1)",
  phaseDrying: "#d4a017",
  phaseMaillard: "#1976d2",
  phaseDevelopment: "#5c4fd4",

  chartBg: "#ffffff",
  chartGrid: "rgba(0, 0, 0, 0.08)",
  chartGridStroke: "rgba(0, 0, 0, 0.1)",
  chartAxisLabel: "#666666",
  chartCurrentLine: "rgba(0, 0, 0, 0.45)",

  eventCharge: "#ea580c",
  eventTp: "#059669",
  eventYellow: "#d97706",
  eventFcStart: "#2563eb",

  controlDrum: "#059669",
  controlHeat: "#d97706",
  controlFan: "#2563eb",

  statusActive: "#22a85a",
  statusActiveGlow: "rgba(34, 168, 90, 0.2)",

  paletteYellow: "#d97706",
  paletteTeal: "#0d9488",
  paletteBlue: "#2563eb",
  palettePurple: "#6d28d9",
} as const;

export const FC_LEVEL_BADGE: Record<string, { color: string; bg: string }> = {
  Light: { color: "#d97706", bg: "rgba(217, 119, 6, 0.2)" },
  "Medium-Light": { color: "#0d9488", bg: "rgba(13, 148, 136, 0.15)" },
  Medium: { color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
  "Medium-Dark": { color: "#6d28d9", bg: "rgba(109, 40, 217, 0.12)" },
};

export const FC_EVENT_COLORS: Record<string, string> = {
  Charge: FC_DESKTOP_LIGHT.eventCharge,
  TP: FC_DESKTOP_LIGHT.eventTp,
  Yellow: FC_DESKTOP_LIGHT.eventYellow,
  "FC Start": FC_DESKTOP_LIGHT.eventFcStart,
};