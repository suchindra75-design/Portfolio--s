/**
 * The voice ribbon, ported from RAYA's own ui_stage.py (class Ribbon, paintEvent): one path of
 * N points under a sin(πu)^1.6 envelope, three summed sines (9, 17, 29 cycles), a dim "depth"
 * line behind and a main line whose ends fade out. In the app the amplitude comes from the real
 * mic / speaker levels; here it is driven by a gentle simulated envelope.
 */

export type RGB = readonly [number, number, number];

export const APRICOT: RGB = [255, 178, 107];
export const GOLD: RGB = [255, 217, 160];
export const SILVER: RGB = [201, 198, 204];
export const VERDIGRIS: RGB = [95, 184, 160];
export const TERRACOTTA: RGB = [181, 87, 58];

export const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r},${g},${b},${a})`;

/** Ribbon states, named after the real app's stage states (ui_stage.py STATE_TEXT). */
export type RibbonState = "ready" | "listening" | "other" | "processing" | "speaking" | "muted";

type Geometry = { x0: number; x1: number; cy: number };

const N = 120;

function trace(ctx: CanvasRenderingContext2D, g: Geometry, A: number, ph: number, scale: number, upto = 1, band?: (u: number) => number) {
  const last = Math.max(1, Math.round(N * Math.min(1, upto)));
  ctx.beginPath();
  for (let i = 0; i <= last; i++) {
    const u = i / N;
    const env = Math.pow(Math.sin(Math.PI * u), 1.6);
    const wave = Math.sin(u * 9 + ph) * 0.55 + Math.sin(u * 17 - ph * 1.3) * 0.3 + Math.sin(u * 29 + ph * 0.7) * 0.15;
    const y = g.cy - A * scale * env * wave * (band ? band(u) : 1);
    const x = g.x0 + (g.x1 - g.x0) * u;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

function fadeStroke(ctx: CanvasRenderingContext2D, g: Geometry, col: RGB, a: number) {
  const grad = ctx.createLinearGradient(g.x0, 0, g.x1, 0);
  grad.addColorStop(0, rgba(col, 0));
  grad.addColorStop(0.18, rgba(col, a));
  grad.addColorStop(0.82, rgba(col, a));
  grad.addColorStop(1, rgba(col, 0));
  return grad;
}

export type RibbonOpts = Geometry & {
  /** Amplitude in px at full level. */
  amp: number;
  /** 0..1 level (mic or speaker loudness). */
  level: number;
  t: number;
  state: RibbonState;
  /** Draw-on progress for intros, 0..1. */
  progress?: number;
  width?: number;
  /** Stroke colour of the main line; defaults by state. */
  color?: RGB;
  band?: (u: number) => number;
  /** Phase speed override (the app: 2.6 listening, 3.2 speaking, 0.35 otherwise). */
  speed?: number;
  /** A third, fainter echo line (hero only). */
  echo?: boolean;
};

/** Paint one ribbon frame. Mirrors the real app: processing = flat hairline with a travelling light. */
export function drawRibbon(ctx: CanvasRenderingContext2D, o: RibbonOpts) {
  const g = { x0: o.x0, x1: o.x1, cy: o.cy };
  const p = o.progress ?? 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (o.state === "processing") {
    ctx.strokeStyle = rgba(SILVER, 0.22);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.x0, g.cy);
    ctx.lineTo(g.x0 + (g.x1 - g.x0) * p, g.cy);
    ctx.stroke();
    const span = g.x1 - g.x0;
    const pos = (o.t / 1.8) % 1;
    const cx = g.x0 + span * (-0.15 + pos * 1.3);
    const grad = ctx.createLinearGradient(cx - span * 0.18, 0, cx + span * 0.18, 0);
    grad.addColorStop(0, rgba(GOLD, 0));
    grad.addColorStop(0.5, rgba(GOLD, 0.92));
    grad.addColorStop(1, rgba(GOLD, 0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = (o.width ?? 2) * 1.15;
    ctx.beginPath();
    ctx.moveTo(Math.max(g.x0, cx - span * 0.18), g.cy);
    ctx.lineTo(Math.min(g.x1, cx + span * 0.18), g.cy);
    ctx.stroke();
    return;
  }

  const moving = o.state === "listening" || o.state === "speaking" || o.state === "other";
  const base = o.state === "ready" ? 0.55 : o.state === "muted" ? 0 : 0.08;
  const A = o.amp * (moving ? Math.max(o.level, base * 0.25) : Math.max(o.level, base * 0.25 + 0.04));
  const speed = o.speed ?? (o.state === "listening" || o.state === "other" ? 2.6 : o.state === "speaking" ? 3.2 : 0.35);
  const ph = o.t * speed;
  const col = o.color ?? (o.state === "speaking" ? SILVER : o.state === "other" ? SILVER : APRICOT);
  const a = o.state === "other" ? 0.45 : moving ? 0.95 : o.state === "ready" ? 0.85 : 0.35;

  if (o.echo) {
    ctx.strokeStyle = fadeStroke(ctx, g, GOLD, 0.16);
    ctx.lineWidth = 1;
    trace(ctx, g, A, ph * 0.8 + 3.7, -0.38, p, o.band);
    ctx.stroke();
  }
  // depth line (dim silver), then the main line with faded ends
  ctx.strokeStyle = rgba(SILVER, o.state === "muted" ? 0.12 : 0.26);
  ctx.lineWidth = 1;
  trace(ctx, g, A, ph + 1.9, 0.6, p, o.band);
  ctx.stroke();
  ctx.strokeStyle = fadeStroke(ctx, g, col, a);
  ctx.lineWidth = o.width ?? (moving ? 2 : 1.5);
  trace(ctx, g, A, ph, 1, p, o.band);
  ctx.stroke();
}

/** A speech-like loudness envelope (syllables over a slower phrase swell), 0..1. */
export function speechLevel(t: number, seed = 0) {
  const syll = Math.abs(Math.sin(t * 6.8 + seed)) * (0.55 + 0.45 * Math.sin(t * 2.1 + seed * 2));
  const phrase = 0.6 + 0.4 * Math.sin(t * 0.9 + seed);
  return Math.max(0.12, Math.min(1, 0.25 + 0.75 * syll * phrase));
}

/** A slowly shifting spectral shape across the ribbon (stands in for the app's 24 bands). */
export const bandsAt = (t: number) => (u: number) => 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(u * 5.2 + t * 1.7) * Math.cos(u * 2.3 - t * 0.8));
