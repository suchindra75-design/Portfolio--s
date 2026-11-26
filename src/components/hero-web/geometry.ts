/**
 * THE WEB, geometry. Pure data, no three.js: builds every silk thread of the hero scene as short
 * straight segments with the attributes the instanced shader needs. See docs/interactive/HERO-WEB.md.
 *
 * Composition (C, "anchored dimensional web"): a near orb web whose hub sits beside his head,
 * behind the shoulder line; a larger, dimmer far web on the other side; sagging bridges between
 * them; anchor threads running off-screen; a few drop lines at different depths; and soft,
 * defocused foreground strands at the edges. Everything is irregular: jittered radials, uneven
 * spiral spacing, broken spiral segments and gravity sag on every free span.
 */

export type V3 = [number, number, number];

/** One segment = one instance. Interleaved per attribute for direct upload. */
export type WebData = {
  count: number;
  start: Float32Array; // vec3
  end: Float32Array; // vec3
  t: Float32Array; // vec2: position along its thread at the start and end (0..1), for construction
  time: Float32Array; // vec2: thread start time and duration (s)
  style: Float32Array; // vec4: width (css px), brightness, softness (0 sharp .. 1 defocused), seed
  anchors: V3[]; // interactive anchor points (world); starts as the two hubs, the scene adds more
  junctions: V3[]; // places where threads meet: anchor candidates
  hubs: V3[]; // the two hubs (world), for the construction light
  buildEnd: number; // when the last thread finishes (s)
};

type Opts = { width: number; bright: number; soft?: number; start: number; dur: number };
type Strand = { pts: V3[]; skip?: boolean[]; o: Opts };

/** Small seeded PRNG so the web is the same on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const lerp = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

/** Rotation matrix from Euler XYZ (radians), applied as R = Rz * Ry * Rx. */
function rotator(rx: number, ry: number, rz: number) {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(rx), Math.sin(rx), Math.cos(ry), Math.sin(ry), Math.cos(rz), Math.sin(rz)];
  return (p: V3): V3 => {
    let [x, y, z] = p;
    [y, z] = [y * cx - z * sx, y * sx + z * cx];
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    [x, y] = [x * cz - y * sz, x * sz + y * cz];
    return [x, y, z];
  };
}

/** A free thread between two points: subdivided, sagging under gravity (world -Y). */
function sagLine(a: V3, b: V3, sag: number, n: number): V3[] {
  const L = len(sub(b, a));
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = lerp(a, b, u);
    p[1] -= Math.sin(Math.PI * u) * sag * L;
    out.push(p);
  }
  return out;
}

type OrbOpts = {
  center: V3;
  rot: [number, number, number];
  R: number;
  radials: number;
  rings: number;
  start: number;
  bright: number;
  wR: number; // radial width
  wS: number; // spiral width
  seed: number;
};

/** One orb web. Returns its strands, the frame points (for bridges and anchors) and the hub. */
function orbWeb(o: OrbOpts) {
  const rnd = mulberry32(o.seed);
  const rot = rotator(...o.rot);
  const W = (p: V3): V3 => add(rot(p), o.center);
  const strands: Strand[] = [];
  const n = o.radials;

  // radials: jittered angles and lengths
  const ang: number[] = [], Rl: number[] = [];
  for (let i = 0; i < n; i++) {
    ang.push(((i + (rnd() - 0.5) * 0.55) / n) * Math.PI * 2);
    Rl.push(o.R * (0.74 + rnd() * 0.4));
  }
  const local = (i: number, f: number): V3 => {
    const a = ang[i], r = Rl[i] * f;
    // a slight in-plane bow on each radial
    const bow = Math.sin(Math.PI * f) * 0.025 * o.R * ((i * 7919) % 2 ? 1 : -1);
    return [Math.cos(a) * r - Math.sin(a) * bow, Math.sin(a) * r + Math.cos(a) * bow, 0];
  };
  const order = Array.from({ length: n }, (_, i) => i).sort(() => rnd() - 0.5);
  for (let i = 0; i < n; i++) {
    const pts: V3[] = [];
    for (let k = 0; k <= 10; k++) pts.push(W(local(i, 0.05 + (0.95 * k) / 10)));
    for (let k = 1; k < pts.length - 1; k++) pts[k][1] -= Math.sin((Math.PI * k) / 10) * 0.012 * Rl[i];
    strands.push({ pts, o: { width: o.wR, bright: o.bright, start: o.start + order.indexOf(i) * 0.028, dur: 0.5 + Rl[i] / o.R * 0.15 } });
  }

  // hub: a few tight, irregular turns
  for (let r = 0; r < 3; r++) {
    const pts: V3[] = [];
    const f = 0.035 + r * 0.028;
    for (let i = 0; i <= n; i++) pts.push(W(local(i % n, f * (0.85 + rnd() * 0.3))));
    strands.push({ pts, o: { width: o.wS, bright: o.bright * 0.9, start: o.start + 0.05 + r * 0.06, dur: 0.3 } });
  }

  // frame: the polygon through the radial ends, each span sagging
  const ends = Array.from({ length: n }, (_, i) => W(local(i, 1)));
  {
    const pts: V3[] = [];
    for (let i = 0; i < n; i++) {
      const seg = sagLine(ends[i], ends[(i + 1) % n], 0.05, 4);
      pts.push(...(i ? seg.slice(1) : seg));
    }
    strands.push({ pts, o: { width: o.wR * 1.15, bright: o.bright, start: o.start + 0.55, dur: 0.55 } });
  }

  // capture spiral: one continuous thread winding outward, unevenly spaced, with broken spans
  {
    const pts: V3[] = [], skip: boolean[] = [];
    let q = 0.2;
    const qEnd = 0.92;
    const step = (qEnd - q) / o.rings;
    let prev: V3 | null = null;
    // many orb webs keep one sector free of spiral (the spider's signal-thread gap)
    const gap = Math.floor(rnd() * n);
    while (q < qEnd) {
      for (let i = 0; i < n; i++) {
        const qq = q + (step * i) / n;
        const p = W(local(i, Math.min(qq, 0.97)));
        if (prev) {
          const seg = sagLine(prev, p, 0.08, 3);
          const broken = rnd() < 0.1 || ((i - gap + n) % n < 2 && q > 0.34);
          for (let k = 1; k < seg.length; k++) {
            pts.push(seg[k]);
            skip.push(broken);
          }
        } else {
          pts.push(p);
        }
        prev = p;
      }
      q += step * (0.65 + rnd() * 0.8);
    }
    strands.push({ pts, skip: [false, ...skip], o: { width: o.wS, bright: o.bright * 0.92, start: o.start + 0.75, dur: 1.45 } });
  }

  // knots: where radials cross the capture spiral (real junctions, inside the web)
  const knots: V3[] = [];
  for (let i = 0; i < n; i += 2) for (const f of [0.42, 0.62, 0.8]) knots.push(W(local(i, f)));
  return { strands, ends, knots, hub: W([0, 0, 0]) };
}

export type Layout = {
  /** world point at screen fraction (sx, sy) on the plane z (camera space ready) */
  at: (sx: number, sy: number, z: number) => V3;
  mobile: boolean;
};

export function buildWeb({ at, mobile }: Layout): WebData {
  const strands: Strand[] = [];
  const rnd = mulberry32(42);

  // NEAR web: hub beside his head, behind the shoulder line
  const A = orbWeb({
    center: mobile ? at(0.76, 0.15, -1.5) : at(0.765, 0.29, -1.5),
    rot: mobile ? [-0.3, -0.55, 0.14] : [-0.38, -0.92, 0.16],
    R: mobile ? 3.4 : 5.4,
    radials: mobile ? 18 : 26,
    rings: mobile ? 12 : 18,
    start: 0.25,
    bright: 0.9,
    wR: 0.95,
    wS: 0.7,
    seed: 7,
  });
  // FAR web: larger, deeper, dimmer, on the other side
  const B = orbWeb({
    center: mobile ? at(0.18, 0.1, -7) : at(0.2, 0.22, -7.5),
    rot: [0.26, 0.86, -0.2],
    R: mobile ? 5.6 : 8.6,
    radials: mobile ? 14 : 21,
    rings: mobile ? 10 : 16,
    start: 0.55,
    bright: 0.64,
    wR: 0.8,
    wS: 0.6,
    seed: 23,
  });
  strands.push(...A.strands, ...B.strands);

  // bridges: near web's frame to the far web's frame, long and sagging
  const nb = mobile ? 3 : 5;
  const pickA = (i: number) => A.ends[Math.floor((A.ends.length * (0.38 + (i / nb) * 0.3)) % A.ends.length)];
  const pickB = (i: number) => B.ends[Math.floor((B.ends.length * (0.85 + (i / nb) * 0.35)) % B.ends.length)];
  const bridgeA: V3[] = [], bridgeB: V3[] = [];
  for (let i = 0; i < nb; i++) {
    const a = pickA(i), b = pickB(i);
    bridgeA.push(a);
    bridgeB.push(b);
    strands.push({ pts: sagLine(a, b, 0.05 + rnd() * 0.04, 14), o: { width: 0.75, bright: 0.72, start: 1.25 + i * 0.09, dur: 0.85 } });
  }

  // anchor threads: from each web's frame out past the screen edges
  const offA: V3[] = mobile
    ? [at(1.15, 0.02, -1.2), at(1.2, 0.36, -1.8), at(0.62, -0.12, -1.5)]
    : [at(1.12, 0.05, -1.2), at(1.15, 0.62, -1.8), at(0.86, -0.12, -1.4), at(0.58, -0.1, -2)];
  offA.forEach((p, i) => {
    let best = A.ends[0];
    for (const e of A.ends) if (len(sub(e, p)) < len(sub(best, p))) best = e;
    strands.push({ pts: sagLine(best, p, 0.03, 12), o: { width: 1.0, bright: 0.85, start: 0.8 + i * 0.08, dur: 0.7 } });
  });
  const offB: V3[] = mobile ? [at(-0.15, 0.04, -7.5), at(0.3, -0.12, -7)] : [at(-0.12, 0.08, -7.5), at(-0.1, 0.6, -8), at(0.35, -0.12, -7)];
  offB.forEach((p, i) => {
    let best = B.ends[0];
    for (const e of B.ends) if (len(sub(e, p)) < len(sub(best, p))) best = e;
    strands.push({ pts: sagLine(best, p, 0.03, 12), o: { width: 0.8, bright: 0.5, start: 1.0 + i * 0.1, dur: 0.8 } });
  });

  // drop lines: near-vertical threads from above the frame, at several depths, behind him
  const drops = mobile ? [[0.08, -4], [0.9, -5.5], [0.55, -9]] : [[0.06, -3.5], [0.14, -9], [0.83, -5], [0.95, -2.5], [0.42, -10]];
  drops.forEach(([sx, z], i) => {
    const top = at(sx, -0.08, z), bottom = at(sx + (rnd() - 0.5) * 0.08, 1.08, z);
    strands.push({ pts: sagLine(top, bottom, 0.004, 16), o: { width: 0.65, bright: 0.38, start: 0.35 + i * 0.12, dur: 1.2 } });
  });

  // descent (Phase 3): long silk threads that carry the web on down past the hero, so the camera
  // can keep descending through the same environment behind the projects. Sparse on purpose: a
  // few lines at different depths, with an occasional sagging cross-thread between neighbours.
  const DEPTH = 52; // world units below the hero
  const descent = mobile
    ? [[0.06, -5], [0.32, -11], [0.72, -7], [0.94, -4]]
    : [[0.04, -4], [0.17, -10], [0.3, -6.5], [0.64, -13], [0.79, -5.5], [0.9, -9], [0.97, -3.2]];
  const lines: V3[][] = descent.map(([sx, z], i) => {
    const top = at(sx, 0.55 + (i % 3) * 0.12, z);
    const drift = (rnd() - 0.5) * 3;
    const pts: V3[] = [];
    for (let k = 0; k <= 44; k++) {
      const u = k / 44;
      pts.push([top[0] + drift * u + Math.sin(u * 5 + i) * 0.35, top[1] - u * DEPTH, top[2] + Math.sin(u * 3 + i * 2) * 0.6]);
    }
    strands.push({ pts, o: { width: 0.7, bright: 0.78, start: 1.3 + i * 0.12, dur: 2.6 } });
    return pts;
  });
  for (let i = 0; i < lines.length - 1; i++) {
    for (let y = 5 + (i % 2) * 3.5; y < DEPTH - 4; y += 8.5 + rnd() * 4) {
      const k = Math.round((y / DEPTH) * 44);
      const a = lines[i][k], b = lines[i + 1][Math.min(44, k + Math.round((rnd() - 0.5) * 6))];
      if (Math.abs(a[2] - b[2]) > 7) continue; // too far apart in depth to read as one web
      strands.push({ pts: sagLine(a, b, 0.07 + rnd() * 0.05, 10), o: { width: 0.6, bright: 0.42, start: 2.0 + i * 0.1, dur: 1.2 } });
    }
  }

  // foreground: defocused strands close to the camera, only at the edges
  const fg = mobile
    ? [[[-0.05, 0.62], [0.24, 1.08]], [[0.8, -0.05], [1.08, 0.3]]]
    : [[[-0.04, 0.55], [0.2, 1.08]], [[0.78, -0.06], [1.06, 0.34]], [[0.9, 1.06], [1.06, 0.7]]];
  fg.forEach(([a, b], i) => {
    const p = at(a[0], a[1], 5.2 - i * 0.4), q = at(b[0], b[1], 5.2 - i * 0.4);
    strands.push({ pts: sagLine(p, q, 0.06, 10), o: { width: 4.5 + i, bright: 0.28, soft: 1, start: 1.7 + i * 0.15, dur: 1.0 } });
  });

  // ---- flatten to instances ----
  let count = 0;
  for (const s of strands) for (let k = 1; k < s.pts.length; k++) if (!s.skip?.[k]) count++;
  const start = new Float32Array(count * 3), end = new Float32Array(count * 3);
  const t = new Float32Array(count * 2), time = new Float32Array(count * 2), style = new Float32Array(count * 4);
  let j = 0, buildEnd = 0;
  for (const s of strands) {
    const cum = [0];
    for (let k = 1; k < s.pts.length; k++) cum.push(cum[k - 1] + len(sub(s.pts[k], s.pts[k - 1])));
    const total = cum[cum.length - 1] || 1;
    buildEnd = Math.max(buildEnd, s.o.start + s.o.dur);
    for (let k = 1; k < s.pts.length; k++) {
      if (s.skip?.[k]) continue;
      start.set(s.pts[k - 1], j * 3);
      end.set(s.pts[k], j * 3);
      t[j * 2] = cum[k - 1] / total;
      t[j * 2 + 1] = cum[k] / total;
      time[j * 2] = s.o.start;
      time[j * 2 + 1] = s.o.dur;
      style.set([s.o.width, s.o.bright, s.o.soft ?? 0, rnd()], j * 4);
      j++;
    }
  }

  // anchor candidates: the hubs and every real junction (frame corners, bridge ends). The scene
  // picks the ones that are actually visible and reachable on this page (see scene.ts).
  const junctions = [...A.ends, ...B.ends, ...bridgeA, ...bridgeB, ...A.knots, ...B.knots];
  return { count, start, end, t, time, style, anchors: [A.hub, B.hub], junctions, hubs: [A.hub, B.hub], buildEnd };
}

export const v3 = { add, sub, mul, len, lerp };
