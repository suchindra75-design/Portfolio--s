/**
 * RECORDED DATA — not a simulation.
 *
 * recorded.json holds the 365 rows of the "Recorded sensor readings" table in the PDF audit
 * report the INFINOS app generated for one bag on 2026-09-17 12:10:50 UTC
 * (INFINOS_BAG_report_2026-09-17.pdf, extracted with PDFKit). Each row is
 * [seconds since t0, Field 1, Field 2]. Field labels are kept exactly as the app recorded them:
 * the channel's fields carry no names, so the app shows "Field 1" and "Field 2".
 *
 * The one alert and the summary numbers are copied from the same report.
 */
import raw from "./recorded.json";

export type Row = { i: number; ts: number; f1: number; f2: number };

const T0 = Date.parse(raw.t0);
export const ROWS: Row[] = (raw.rows as [number, number, number][]).map(([s, f1, f2], i) => ({ i, ts: T0 + s * 1000, f1, f2 }));
export const N = ROWS.length;
export const FIELDS = raw.fields as [string, string];
export const ALERT = raw.alert;
export const REPORT_SUMMARY = raw.summary as Record<string, { latest: number; min: number; max: number; avg: number }>;
export const ALERT_AT = Date.parse(raw.alert.triggered);
/** When the app generated the report. */
export const GENERATED = Date.parse(raw.generated);
/** The reading the alert was triggered on (the first one synced). */
export const ALERT_INDEX = Math.max(0, ROWS.findIndex((r) => r.ts >= ALERT_AT));
/** The app's default cold-compartment maximum (backend/src/config/alert.config.ts). */
export const COLD_MAX = 8;
/** WARNING → CRITICAL margin for the cold compartment (alert.config.ts). */
export const COLD_MARGIN = 2;

/* ── Sessions: a gap of more than 10 minutes between readings starts a new one. */
const GAP_MS = 10 * 60 * 1000;
export type Session = { start: number; end: number };
export const SESSIONS: Session[] = [];
ROWS.forEach((r, i) => {
  if (i === 0 || r.ts - ROWS[i - 1].ts > GAP_MS) SESSIONS.push({ start: i, end: i });
  else SESSIONS[SESSIONS.length - 1].end = i;
});
const sessionOf = new Int16Array(N);
SESSIONS.forEach((s, k) => {
  for (let i = s.start; i <= s.end; i++) sessionOf[i] = k;
});

/* ── Geometry. X is reading order; each break between sessions is drawn as a fixed gap. */
const GAP_UNITS = 9;
const xUnit = ROWS.map((_, i) => i + sessionOf[i] * GAP_UNITS);
const X_MAX = xUnit[N - 1];
/** 0..1 horizontal position of reading i (fractional i interpolates). */
export function xAt(i: number) {
  const a = Math.max(0, Math.min(N - 1, Math.floor(i)));
  const b = Math.min(N - 1, a + 1);
  const t = Math.max(0, Math.min(1, i - a));
  return (xUnit[a] + (xUnit[b] - xUnit[a]) * t) / X_MAX;
}
/** Nearest reading index for a 0..1 horizontal position. */
export function indexAtX(x: number) {
  const u = Math.max(0, Math.min(1, x)) * X_MAX;
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < N; i++) {
    const d = Math.abs(xUnit[i] - u);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}
/** Middle of the gap before session k (k ≥ 1), 0..1. */
export const gapX = (k: number) => (xUnit[SESSIONS[k].start] - GAP_UNITS / 2) / X_MAX;

export const Y_LO = 0;
export const Y_HI = 32;
export const Y_TICKS = [0, 8, 16, 24, 32];
/** 0..1 from the top for value v. */
export const yAt = (v: number, lo = Y_LO, hi = Y_HI) => 1 - (v - lo) / (hi - lo);

/** SVG path data (viewBox w × h) for one field, one sub-path per session. */
export function tracePath(key: "f1" | "f2", w: number, h: number, lo = Y_LO, hi = Y_HI) {
  let d = "";
  for (const s of SESSIONS) {
    if (s.start === s.end) {
      const x = xAt(s.start) * w;
      const y = yAt(ROWS[s.start][key], lo, hi) * h;
      d += `M${(x - 2).toFixed(1)} ${y.toFixed(2)}L${(x + 2).toFixed(1)} ${y.toFixed(2)}`;
      continue;
    }
    for (let i = s.start; i <= s.end; i++) d += `${i === s.start ? "M" : "L"}${(xAt(i) * w).toFixed(1)} ${(yAt(ROWS[i][key], lo, hi) * h).toFixed(2)}`;
  }
  return d;
}

/** A closed area under one field down to the baseline (multi-reading sessions only). */
export function areaPath(key: "f1" | "f2", w: number, h: number, lo = Y_LO, hi = Y_HI) {
  let d = "";
  for (const s of SESSIONS) {
    if (s.start === s.end) continue;
    const x0 = (xAt(s.start) * w).toFixed(1);
    const x1 = (xAt(s.end) * w).toFixed(1);
    d += `M${x0} ${h}`;
    for (let i = s.start; i <= s.end; i++) d += `L${(xAt(i) * w).toFixed(1)} ${(yAt(ROWS[i][key], lo, hi) * h).toFixed(2)}`;
    d += `L${x1} ${h}Z`;
  }
  return d;
}

/* ── Running statistics over readings 0..i (prefix arrays, O(1) per lookup). */
function prefix(key: "f1" | "f2") {
  const min = new Float32Array(N);
  const max = new Float32Array(N);
  const sum = new Float64Array(N);
  ROWS.forEach((r, i) => {
    const v = r[key];
    min[i] = i ? Math.min(min[i - 1], v) : v;
    max[i] = i ? Math.max(max[i - 1], v) : v;
    sum[i] = (i ? sum[i - 1] : 0) + v;
  });
  return (i: number) => ({ min: min[i], max: max[i], avg: sum[i] / (i + 1), latest: ROWS[i][key] });
}
export const statsF1 = prefix("f1");
export const statsF2 = prefix("f2");

/* ── Formatting (fixed UTC strings, so server and client render the same text). */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n: number) => String(n).padStart(2, "0");
export function fmtStamp(ts: number) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
}
export function fmtDay(ts: number) {
  const d = new Date(ts);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
export function fmtClock(ts: number, seconds = false) {
  const d = new Date(ts);
  return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}${seconds ? `:${p2(d.getUTCSeconds())}` : ""}`;
}
export const f1d = (v: number) => v.toFixed(1);

/** The lowest Field 2 reading (the 17 Sep dip). */
export const F2_DIP = ROWS.reduce((m, r) => (r.f2 < m.f2 ? r : m), ROWS[0]);
export const FIRST = ROWS[0];
export const LAST = ROWS[N - 1];

/**
 * Date labels for the top of a chart: one per recording day, short neighbouring days merged
 * ("11–12 Sep"), long days labelled at their centre, so labels never collide at any width.
 */
export const DAY_LABELS: { x: number; text: string; center: boolean }[] = (() => {
  const days: { a: number; b: number; d: Date }[] = [];
  for (const s of SESSIONS) {
    const d = new Date(ROWS[s.start].ts);
    const last = days[days.length - 1];
    if (last && last.d.getUTCDate() === d.getUTCDate()) last.b = xAt(s.end);
    else days.push({ a: xAt(s.start), b: xAt(s.end), d });
  }
  const out: { x: number; text: string; center: boolean; b: number; d0: Date; d1: Date }[] = [];
  for (const g of days) {
    const prev = out[out.length - 1];
    if (prev && prev.b - prev.x < 0.1 && g.b - g.a < 0.1 && g.a - prev.b < 0.1) {
      prev.b = g.b;
      prev.d1 = g.d;
    } else out.push({ x: g.a, text: "", center: false, b: g.b, d0: g.d, d1: g.d });
  }
  return out.map((g) => {
    const span = g.b - g.x;
    const text = g.d0 === g.d1 ? fmtDay(g.d0.getTime()) : `${g.d0.getUTCDate()}–${fmtDay(g.d1.getTime())}`;
    return span > 0.3 ? { x: (g.x + g.b) / 2, text, center: true } : { x: g.x, text, center: false };
  });
})();
