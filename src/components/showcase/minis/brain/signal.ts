import { isScrolling } from "../lib";
/**
 * Brain Matrix world: synthetic signals and canvas plumbing.
 *
 * Every waveform on this page comes from these functions. They are made-up, EEG/EOG-like
 * shapes (sums of sines, smoothed noise, blinks, steps), never anyone's recording, and every
 * place that shows them is badged as simulated.
 */

/** The world's inks, from projects.ts (bg/ink/muted/accent/accent2) plus two shades in the same family. */
export const PAPER = {
  bg: "#EFE6D6",
  sheet: "#F5EEE3", // the strip, a shade lighter than the ground
  ink: "#1A1216",
  muted: "#6E625C",
  oxblood: "#7A2430",
  verdigris: "#3F8F7C",
  terracotta: "#B5573A",
};

const TAU = Math.PI * 2;

/** Deterministic hash → [0, 1). */
export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smoothed value noise → roughly [-1, 1]. */
export function vnoise(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** EEG-like: a waxing and waning ~10 Hz rhythm over slower theta and broadband noise. ≈ [-1, 1]. */
export function eeg(t: number) {
  const env = 0.6 + 0.4 * vnoise(t * 0.35 + 3);
  const alpha = Math.sin(TAU * 9.8 * t + 0.9 * vnoise(t * 0.5)) * env * 0.5;
  const theta = Math.sin(TAU * 5.3 * t + 1.1) * 0.17;
  const noise = vnoise(t * 61) * 0.16 + vnoise(t * 23 + 9) * 0.14;
  return alpha + theta + noise;
}

/** EOG-like: saccade steps, occasional blinks, a slow drift. ≈ [-1, 1.2]. */
export function eog(t: number) {
  const seg = Math.floor(t / 0.9);
  const f = t / 0.9 - seg;
  const a = hash(seg + 50) * 2 - 1;
  const b = hash(seg + 51) * 2 - 1;
  let v = (a + (b - a) * smooth(0, 0.09, f)) * 0.36;
  const bs = Math.floor(t / 2.3);
  if (hash(bs + 7) > 0.4) {
    const c = bs * 2.3 + 0.4 + hash(bs + 9) * 1.4;
    v += Math.exp(-(((t - c) / 0.075) ** 2)) * 1.05;
  }
  return v + vnoise(t * 0.25 + 40) * 0.18 + vnoise(t * 34) * 0.05;
}

/** The app's "Eye Movements" field is a running count: a staircase that climbs and resets. [-1, 1]. */
export function eyeMovements(t: number, period = 2.7) {
  const k = Math.floor(t / period);
  const f = t / period - k;
  const steps = 9 + Math.floor(hash(k + 3) * 7);
  return (Math.floor(f * steps) / steps) * 1.7 - 0.85;
}

/** "EEG Artifacts": mostly quiet, with sharp isolated events. [-0.7, 1]. */
export function artifacts(t: number) {
  const slot = Math.floor(t * 2.2);
  let v = -0.65 + vnoise(t * 40) * 0.03;
  if (hash(slot + 17) > 0.72) {
    const c = (slot + 0.2 + hash(slot + 5) * 0.6) / 2.2;
    v += Math.exp(-(((t - c) / 0.012) ** 2)) * (1.1 + hash(slot) * 0.5);
  }
  return v;
}

/** "Total Samples": a fine staircase ramp. [-1, 1]. */
export function totalSamples(t: number, period = 3.6) {
  const f = (t / period) % 1;
  return (Math.floor(f * 28) / 28) * 1.7 - 0.85;
}

/** "Recording Time": a straight ramp that resets with each recording. [-1, 1]. */
export function recordingTime(t: number, period = 3.6) {
  const f = ((t + period * 0.35) / period) % 1;
  return f * 1.7 - 0.85;
}

/* ───────────────────────── canvas plumbing ───────────────────────── */

export type Frame = { ctx: CanvasRenderingContext2D; w: number; h: number; now: number; dt: number };

/**
 * Runs a 2D canvas the way DESIGN.md §5 asks: DPR ≤ 1.5, sized to its box, animated only while
 * on screen (IntersectionObserver) and only when `animate` is true; one static frame otherwise.
 * Returns a cleanup that stops everything.
 */
export function runCanvas(
  canvas: HTMLCanvasElement,
  opts: { draw: (f: Frame) => void; animate: boolean; fps?: number; onVisible?: (v: boolean) => void; expose?: (repaint: () => void) => void },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const frameMs = 1000 / (opts.fps ?? 60);
  let w = 0;
  let h = 0;
  let raf = 0;
  let visible = false;
  let last = 0;
  let lastDraw = 0;

  const paint = (now: number, dt: number) => {
    if (!w || !h) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = canvas.width / w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    opts.draw({ ctx, w, h, now, dt });
  };

  const resize = () => {
    // layout size, not getBoundingClientRect: the gallery scales frames with transforms
    const r = { width: canvas.offsetWidth, height: canvas.offsetHeight };
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    paint(performance.now(), 0);
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (now - lastDraw < frameMs - 2 || isScrolling()) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    lastDraw = now;
    paint(now, dt);
  };

  const start = () => {
    if (raf || !opts.animate) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      opts.onVisible?.(visible);
      if (visible) start();
      else stop();
    },
    { rootMargin: "80px" },
  );
  io.observe(canvas);
  const onVis = () => {
    if (document.hidden) stop();
    else if (visible) start();
  };
  document.addEventListener("visibilitychange", onVis);
  resize();
  opts.expose?.(() => paint(performance.now(), 0));
  // Labels drawn in the canvas use the site's mono face: repaint once it has loaded.
  document.fonts?.ready.then(() => paint(performance.now(), 0)).catch(() => {});

  return () => {
    stop();
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  };
}

/** The site's mono family, resolved for canvas text. */
export function monoFamily(el: Element) {
  const v = getComputedStyle(el).getPropertyValue("--font-mono").trim();
  return v || "ui-monospace, monospace";
}

/** A paper strip: the sheet, a fine recorder grid, and sprocket holes along both edges. `shift` scrolls the paper. */
export function drawPaper(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  o: { shift: number; cell: number; margin: number; holes?: boolean },
) {
  const { shift, cell, margin } = o;
  ctx.fillStyle = PAPER.sheet;
  ctx.fillRect(x, y, w, h);
  const gy0 = y + margin;
  const gy1 = y + h - margin;
  // Grid: minor and major lines in faded oxblood, like recorder chart paper.
  ctx.lineWidth = 1;
  const off = ((shift % (cell * 5)) + cell * 5) % (cell * 5);
  for (let i = 0, gx = x - off; gx <= x + w; i++, gx += cell) {
    if (gx < x) continue;
    const major = i % 5 === 0;
    ctx.strokeStyle = major ? "rgba(122,36,48,0.13)" : "rgba(122,36,48,0.055)";
    ctx.beginPath();
    ctx.moveTo(Math.round(gx) + 0.5, gy0);
    ctx.lineTo(Math.round(gx) + 0.5, gy1);
    ctx.stroke();
  }
  const rows = Math.max(1, Math.round((gy1 - gy0) / cell));
  for (let j = 0; j <= rows; j++) {
    const gy = gy0 + ((gy1 - gy0) * j) / rows;
    ctx.strokeStyle = j % 5 === 0 ? "rgba(122,36,48,0.13)" : "rgba(122,36,48,0.055)";
    ctx.beginPath();
    ctx.moveTo(x, Math.round(gy) + 0.5);
    ctx.lineTo(x + w, Math.round(gy) + 0.5);
    ctx.stroke();
  }
  // Edges.
  ctx.strokeStyle = "rgba(26,18,22,0.22)";
  ctx.beginPath();
  ctx.moveTo(x, gy0 + 0.5);
  ctx.lineTo(x + w, gy0 + 0.5);
  ctx.moveTo(x, gy1 - 0.5);
  ctx.lineTo(x + w, gy1 - 0.5);
  ctx.stroke();
  if (o.holes === false) return;
  // Sprocket holes, travelling with the paper.
  const pitch = Math.max(10, margin * 1.6);
  const hw = Math.max(2, margin * 0.34);
  const hh = Math.max(2.5, margin * 0.4);
  ctx.fillStyle = PAPER.bg;
  ctx.strokeStyle = "rgba(26,18,22,0.16)";
  const hOff = ((shift % pitch) + pitch) % pitch;
  for (let hx = x - hOff + pitch / 2; hx < x + w; hx += pitch) {
    if (hx - hw / 2 < x) continue;
    for (const cy of [y + margin / 2, y + h - margin / 2]) {
      ctx.beginPath();
      ctx.roundRect(hx - hw / 2, cy - hh / 2, hw, hh, hw / 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

/** A polygraph pen: an arm from a pivot on the right to the writing tip, the tip inked oxblood. */
export function drawPen(ctx: CanvasRenderingContext2D, tipX: number, tipY: number, pivotX: number, pivotY: number, s = 1) {
  ctx.strokeStyle = "rgba(26,18,22,0.42)";
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(tipX + 2 * s, tipY);
  ctx.stroke();
  ctx.fillStyle = PAPER.sheet;
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 2.6 * s, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAPER.oxblood;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 2.1 * s, 0, TAU);
  ctx.fill();
}
