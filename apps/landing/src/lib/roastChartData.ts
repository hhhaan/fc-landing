export type RoastEvent = {
  id: string;
  label: string;
  time: number;
  bt: number;
};

export type RoastPhase = {
  id: string;
  label: string;
  start: number;
  end: number;
  color: string;
};

export type RoastPoint = {
  t: number;
  bt: number;
  et: number;
  ror: number;
  refBt: number;
  refEt: number;
};

const TOTAL_SEC = 780;
const SAMPLE_HZ = 2;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function btCurve(t: number) {
  const charge = 198 - 106 * Math.exp(-t / 18) * smoothstep(0, 55, t);
  const tpBlend = smoothstep(48, 95, t);
  const tp = 91 + 0.35 * t;
  const rise =
    tp +
    117 *
      smoothstep(95, 520, t) *
      (1 - 0.22 * smoothstep(520, 720, t));
  return charge * (1 - tpBlend) + rise * tpBlend;
}

function etCurve(t: number) {
  const base = 228 - 58 * Math.exp(-t / 24) * smoothstep(0, 70, t);
  const blend = smoothstep(70, 140, t);
  const trail = btCurve(t) + 14 + 8 * smoothstep(140, 620, t);
  return base * (1 - blend) + trail * blend;
}

function rorFromBt(points: { t: number; bt: number }[], i: number) {
  const window = 6;
  const a = Math.max(0, i - window);
  const b = Math.min(points.length - 1, i + window);
  const dt = (points[b].t - points[a].t) / 60;
  if (dt <= 0) return 0;
  return (points[b].bt - points[a].bt) / dt;
}

function refBtCurve(t: number) {
  return btCurve(t) + Math.sin(t / 42) * 1.8 + (t > 520 ? 1.2 : -0.8);
}

function refEtCurve(t: number) {
  return etCurve(t) + Math.cos(t / 36) * 1.4 + 0.6;
}

export const ROAST_EVENTS: RoastEvent[] = [
  { id: "charge", label: "CH", time: 0, bt: 198 },
  { id: "tp", label: "TP", time: 88, bt: 91 },
  { id: "dry", label: "DE", time: 252, bt: 151 },
  { id: "fc", label: "FC", time: 572, bt: 196.2 },
];

export const ROAST_PHASES: RoastPhase[] = [
  { id: "drying", label: "Drying", start: 88, end: 252, color: "59,130,246" },
  { id: "maillard", label: "Maillard", start: 252, end: 572, color: "251,146,60" },
  { id: "development", label: "Development", start: 572, end: TOTAL_SEC, color: "34,197,94" },
];

export function generateRoastProfile(): RoastPoint[] {
  const raw: { t: number; bt: number }[] = [];
  const step = 1 / SAMPLE_HZ;

  for (let t = 0; t <= TOTAL_SEC; t += step) {
    raw.push({ t, bt: btCurve(t) });
  }

  return raw.map((p, i) => ({
    t: p.t,
    bt: p.bt,
    et: etCurve(p.t),
    ror: Math.max(0, rorFromBt(raw, i)),
    refBt: refBtCurve(p.t),
    refEt: refEtCurve(p.t),
  }));
}

export function formatRoastTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function formatTemp(value: number) {
  return `${value.toFixed(1)}°C`;
}

export function formatRor(value: number) {
  return `${value.toFixed(1)}°/m`;
}