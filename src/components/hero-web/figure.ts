/**
 * THE ARRIVAL, the figure. An original masked web-slinger, drawn as one 2.5D puppet: a 2D skeleton
 * (17 tapered limb segments and an elliptical head) posed on the CPU, and a single quad whose
 * fragment shader draws the silhouette as a signed-distance field. No model file, no textures: it
 * is sharp at any size (from a 70 px figure on a far rooftop to a head that fills the screen), it
 * costs one draw call, and its edges, panels, web lines, rim light and dissolve all come from the
 * same distance field. See docs/interactive/ARRIVAL.md.
 *
 * Coordinates: local units are metres (the figure is about 1.8 tall), y up, the pelvis at the
 * origin before the root tilt. Angles: a bone's direction is measured from straight up,
 * counter-clockwise; a limb hanging down points at pi.
 */
import * as THREE from "three";

export type Pose = {
  spine: number; // chest bend relative to the pelvis
  tl: number; // torso length scale (a lean toward or away from the camera foreshortens it)
  neck: number;
  head: number;
  yaw: number; // -1..1: a turn of the head and shoulders (eyes slide, one shoulder narrows)
  aL: number; eL: number; fL: number; // left arm: abduction from hanging (0..pi), elbow bend, forearm length scale
  aR: number; eR: number; fR: number;
  hL: number; kL: number; tL: number; sL: number; // left leg: abduction, knee bend, thigh and shin length scales
  hR: number; kR: number; tR: number; sR: number;
  ftL: number; ftR: number; // foot angle from the shin
};

const P = (o: Partial<Pose>): Pose => ({
  spine: 0, tl: 1, neck: 0, head: 0, yaw: 0,
  aL: 0.12, eL: 0.05, fL: 1, aR: 0.12, eR: 0.05, fR: 1,
  hL: 0.08, kL: 0.02, tL: 1, sL: 1, hR: 0.08, kR: 0.02, tR: 1, sR: 1,
  ftL: 1.15, ftR: 1.15,
  ...o,
});

/** The poses, in the order the sequence passes through them (the timeline tweens an index). */
export const POSES: Record<string, Pose> = {
  // on the far rooftop's edge: low, knees out, one hand down on the ledge
  perch: P({ tl: 0.82, spine: 0.08, neck: -0.12, head: -0.08, yaw: -0.35, aL: 0.5, eL: 0.55, aR: 0.32, eR: 0.35, fR: 0.85, hL: 1.18, kL: 1.95, tL: 0.82, hR: 1.05, kR: 1.85, tR: 0.8, ftL: 1.35, ftR: 1.3 }),
  // he hears something: head up and round toward us
  alert: P({ tl: 0.9, spine: -0.04, neck: 0.06, head: 0.1, yaw: 0.45, aL: 0.62, eL: 0.6, aR: 0.4, eR: 0.3, hL: 0.95, kL: 1.6, tL: 0.88, hR: 0.88, kR: 1.5, tR: 0.88 }),
  // right arm up at the anchor, the left drawn back, legs loading
  shoot: P({ tl: 0.95, spine: -0.1, neck: 0.1, head: 0.12, yaw: 0.2, aR: 2.75, eR: 0.04, fR: 1, aL: 0.95, eL: 0.9, hL: 0.7, kL: 1.15, hR: 0.62, kR: 1.05 }),
  // the leap: long body, both hands on the web, legs trailing
  leap: P({ spine: -0.05, neck: 0.08, yaw: 0.1, aR: 2.98, eR: 0.08, aL: 2.62, eL: 0.35, hL: 0.12, kL: 0.35, sL: 0.9, hR: 0.2, kR: 0.7, sR: 0.82, ftL: 0.5, ftR: 0.5 }),
  // the swing: hanging from the web, knees up toward us (foreshortened shins)
  swing: P({ spine: 0.04, neck: 0.12, yaw: -0.1, aR: 2.95, eR: 0.1, aL: 2.78, eL: 0.22, hL: 0.22, kL: 1.05, sL: 0.62, tL: 0.92, hR: 0.16, kR: 0.85, sR: 0.7, tR: 0.95, ftL: 0.7, ftR: 0.7 }),
  // the release: arms thrown wide, legs tucked
  release: P({ spine: -0.08, neck: 0.1, yaw: 0.15, aR: 2.1, eR: 0.35, aL: 2.0, eL: 0.4, hL: 0.42, kL: 2.1, tL: 0.72, sL: 0.82, hR: 0.38, kR: 2.0, tR: 0.7, sR: 0.82 }),
  // reaching for the second anchor
  reach: P({ spine: -0.06, neck: 0.12, yaw: 0.25, aR: 2.55, eR: 0.06, aL: 1.25, eL: 0.6, hL: 0.3, kL: 1.3, tL: 0.85, hR: 0.18, kR: 0.9, sR: 0.85 }),
  // dropping onto the roof: arms out for balance, legs reaching down
  drop: P({ spine: 0.06, neck: -0.05, yaw: 0, aR: 1.45, eR: 0.3, aL: 1.6, eL: 0.25, hL: 0.32, kL: 0.4, hR: 0.26, kR: 0.5 }),
  // the landing: three points. Left knee out, right knee down (thigh toward us), right hand on the roof,
  // left arm out behind; chest pitched forward (foreshortened), head up at the camera
  land: P({ tl: 0.72, spine: 0.1, neck: -0.16, head: -0.04, yaw: -0.12, aR: 0.3, eR: 0.04, fR: 0.95, aL: 1.7, eL: 0.25, hL: 1.2, kL: 1.22, tL: 0.88, hR: 0.3, kR: 0.25, tR: 0.55, sR: 0.38, ftL: 1.3, ftR: 0.5 }),
  // halfway up, deliberate
  rise: P({ tl: 0.9, spine: 0.04, neck: -0.04, aR: 0.42, eR: 0.25, aL: 0.5, eL: 0.25, hL: 0.55, kL: 0.95, tL: 0.92, hR: 0.48, kR: 0.9, tR: 0.92 }),
  // standing: square to the camera, shoulders set (the pose that becomes the portrait)
  stand: P({ aR: 0.2, eR: 0.08, aL: 0.2, eL: 0.08, hL: 0.07, hR: 0.07 }),
};
export const ORDER = ["perch", "alert", "shoot", "leap", "swing", "release", "reach", "drop", "land", "rise", "stand"] as const;
const LIST = ORDER.map((k) => POSES[k]);

/** The pose at a fractional index into ORDER (smoothstep between neighbours). */
export function poseAt(c: number, out: Pose): Pose {
  const i = Math.max(0, Math.min(LIST.length - 1, Math.floor(c)));
  const j = Math.min(LIST.length - 1, i + 1);
  let u = Math.max(0, Math.min(1, c - i));
  u = u * u * (3 - 2 * u);
  const a = LIST[i], b = LIST[j];
  for (const k in a) (out as Record<string, number>)[k] = (a as Record<string, number>)[k] + ((b as Record<string, number>)[k] - (a as Record<string, number>)[k]) * u;
  return out;
}
export const blankPose = (): Pose => ({ ...POSES.stand });

// ---- the skeleton ----
export const N_SEG = 18;
const HEAD_RX = 0.098, HEAD_RY = 0.135;
type V2 = [number, number];
const dirOf = (phi: number): V2 => [-Math.sin(phi), Math.cos(phi)];
const addv = (a: V2, d: V2, l: number): V2 => [a[0] + d[0] * l, a[1] + d[1] * l];
const rot = (v: V2, a: number): V2 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

export type Rig = {
  a: Float32Array; // N_SEG * 4: ax, ay, ra, depth
  b: Float32Array; // N_SEG * 4: bx, by, rb, part code
  head: [number, number, number, number]; // cx, cy, angle, yaw
  chest: V2;
  handL: V2; handR: V2; // palm points (where a web leaves)
  minY: number; // lowest point (the soles), for grounding
  box: [number, number, number, number]; // x0, y0, x1, y1 (with margin)
};
export const makeRig = (): Rig => ({ a: new Float32Array(N_SEG * 4), b: new Float32Array(N_SEG * 4), head: [0, 0, 0, 0], chest: [0, 0], handL: [0, 0], handR: [0, 0], minY: 0, box: [0, 0, 0, 0] });

// part codes: 1 torso, 2 arm, 3 leg, 4 hand, 5 foot, 6 neck; code = part * 2 + (right side ? 1 : 0)
/** Forward kinematics: pose + root tilt -> segments (pelvis at the origin). */
export function solve(p: Pose, tilt: number, r: Rig): Rig {
  let n = 0;
  const R = (v: V2): V2 => rot(v, tilt);
  const seg = (a: V2, b: V2, ra: number, rb: number, depth: number, part: number, right: boolean) => {
    const A = R(a), B = R(b);
    r.a.set([A[0], A[1], ra, depth], n * 4);
    r.b.set([B[0], B[1], rb, part * 2 + (right ? 1 : 0)], n * 4);
    n++;
  };
  const hipL: V2 = [-0.095, -0.03], hipR: V2 = [0.095, -0.03];
  const waist = rot([0, 0.25 * p.tl], p.spine * 0.5);
  const chest = addv(waist, dirOf(p.spine), 0.24 * p.tl);
  const sw = 0.19;
  const shL = addv(chest, rot([-sw * (1 + 0.28 * p.yaw), -0.005], p.spine), 1);
  const shR = addv(chest, rot([sw * (1 - 0.28 * p.yaw), -0.005], p.spine), 1);
  const neckB = addv(chest, rot([0.015 * p.yaw, 0.075], p.spine), 1);
  const neckT = addv(neckB, dirOf(p.spine + p.neck), 0.05);
  const hAng = p.spine + p.neck + p.head;
  const hc = addv(neckT, dirOf(hAng), HEAD_RY * 0.82);

  seg(hipL, hipR, 0.105, 0.105, 0, 1, false); // pelvis
  seg([0, 0], waist, 0.13, 0.122, 0, 1, false);
  seg(waist, chest, 0.124, 0.168, 0.02, 1, false);
  seg(neckB, shL, 0.075, 0.088, 0.05, 1, false); // trapezius sloping to the shoulder
  seg(neckB, shR, 0.075, 0.088, 0.05, 1, false);
  seg(neckB, neckT, 0.07, 0.06, 0.1, 6, false);

  const arm = (sh: V2, a: number, e: number, f: number, side: 1 | -1, right: boolean) => {
    const phi = p.spine + Math.PI - side * a;
    const el = addv(sh, dirOf(phi), 0.29);
    const phi2 = phi - side * e;
    const wr = addv(el, dirOf(phi2), 0.26 * f);
    const hd = addv(wr, dirOf(phi2 - side * 0.12), 0.085 * Math.max(0.55, f));
    seg(sh, el, 0.074, 0.056, 0.8, 2, right);
    seg(el, wr, 0.057, 0.038, 0.9, 2, right);
    seg(wr, hd, 0.04, 0.03, 1, 4, right);
    minY = Math.min(minY, R(hd)[1] - 0.03);
    return hd;
  };
  let minY = 1e9;
  const handL = arm(shL, p.aL, p.eL, p.fL, 1, false);
  const handR = arm(shR, p.aR, p.eR, p.fR, -1, true);

  const leg = (hip: V2, h: number, k: number, t: number, s: number, ft: number, side: 1 | -1, right: boolean) => {
    const phi = Math.PI - side * h;
    const kn = addv(hip, dirOf(phi), 0.44 * t);
    const phi2 = phi + side * k;
    const an = addv(kn, dirOf(phi2), 0.43 * s);
    const toe = addv(an, dirOf(phi2 - side * ft), 0.12);
    seg(hip, kn, 0.102, 0.07, 0.4, 3, right);
    seg(kn, an, 0.068, 0.044, 0.45, 3, right);
    seg(an, toe, 0.046, 0.034, 0.5, 5, right);
    for (const q of [kn, an, toe]) minY = Math.min(minY, R(q)[1] - 0.035);
  };
  leg(hipL, p.hL, p.kL, p.tL, p.sL, p.ftL, 1, false);
  leg(hipR, p.hR, p.kR, p.tR, p.sR, p.ftR, -1, true);

  const H = R(hc);
  r.head = [H[0], H[1], hAng + tilt, p.yaw];
  r.chest = R(addv(chest, dirOf(p.spine), -0.05));
  r.handL = R(handL);
  r.handR = R(handR);
  r.minY = minY;
  // bounds of everything, plus a margin for the soft edge and rim
  let x0 = H[0] - 0.2, x1 = H[0] + 0.2, y0 = H[1] - 0.2, y1 = H[1] + 0.2;
  for (let i = 0; i < N_SEG; i++) {
    for (const arr of [r.a, r.b]) {
      const x = arr[i * 4], y = arr[i * 4 + 1], rr = arr === r.a ? r.a[i * 4 + 2] : r.b[i * 4 + 2];
      x0 = Math.min(x0, x - rr); x1 = Math.max(x1, x + rr); y0 = Math.min(y0, y - rr); y1 = Math.max(y1, y + rr);
    }
  }
  const m = 0.06;
  r.box = [x0 - m, y0 - m, x1 + m, y1 + m];
  return r;
}

// ---- the shader ----
const vert = /* glsl */ `
  uniform vec4 uQuad; // x0, y0, x1, y1 (local units)
  varying vec2 vP;
  void main() {
    vec2 lp = mix(uQuad.xy, uQuad.zw, position.xy + 0.5);
    vP = lp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(lp, 0.0, 1.0);
  }
`;

const frag = /* glsl */ `
  #define N ${N_SEG}
  uniform vec4 uA[N]; uniform vec4 uB[N];
  uniform vec4 uHead; uniform vec2 uChest;
  uniform vec4 uKey;   // key light dir (xy), key amount, beam catch
  uniform vec4 uRim;   // crimson rim dir (xy), crimson amount, cool rim amount
  uniform float uDissolve; uniform float uAlpha; uniform float uBlur; uniform float uTime;
  varying vec2 vP;

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
  vec2 rot2(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
  // a line in a periodic coordinate: 1 on the line, 0 off it (width w in local units, period per)
  float lineP(float x, float per, float w) { float f = abs(fract(x / per + 0.5) - 0.5) * per; return 1.0 - smoothstep(w * 0.5, w, f); }

  void main() {
    vec2 p = vP;
    float px = max(fwidth(p.x), 1e-5);
    // segments: smooth union for the outline; the front-most containing segment for the surface
    float dU = 1e5, bestZ = -1e5, nearD = 1e5;
    int bi = -1, ni = 0;
    float bh = 0.0, nh = 0.0;
    for (int i = 0; i < N; i++) {
      vec2 pa = uA[i].xy, pb = uB[i].xy, ba = pb - pa;
      float h = clamp(dot(p - pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
      float d = length(p - pa - ba * h) - mix(uA[i].z, uB[i].z, h);
      dU = smin(dU, d, 0.042);
      if (d < nearD) { nearD = d; ni = i; nh = h; }
      if (d < 0.0 && uA[i].w > bestZ) { bestZ = uA[i].w; bi = i; bh = h; }
    }
    // the head (an ellipse, rotated) and its two lenses
    vec2 e = rot2(p - uHead.xy, -uHead.z);
    vec2 hr = vec2(${HEAD_RX.toFixed(3)}, ${HEAD_RY.toFixed(3)});
    float dH = (length(e / hr) - 1.0) * min(hr.x, hr.y);
    dU = smin(dU, dH, 0.03);
    bool head = dH < 0.0 && bestZ < 0.3;
    float edgeW = px * (1.0 + uBlur);
    float alpha = 1.0 - smoothstep(-edgeW, edgeW, dU);
    if (alpha < 0.002) discard;

    // the surface the pixel belongs to
    vec3 n; float u = 0.0, along = 0.0; float part = 1.0; bool right = false; float rad = 0.1; float segL = 0.3; float dFront = 0.0;
    if (head) {
      float q = clamp(length(e / hr), 0.0, 1.0);
      n = normalize(vec3(rot2(e / hr, uHead.z) * q, sqrt(max(0.0, 1.0 - q * q)) + 0.05));
      part = 0.0; dFront = dH;
    } else {
      int k = bi >= 0 ? bi : ni;
      float h = bi >= 0 ? bh : nh;
      vec4 A = uA[k], B = uB[k];
      vec2 ba = B.xy - A.xy; vec2 c = A.xy + ba * h; vec2 v = p - c;
      rad = mix(A.z, B.z, h); segL = length(ba);
      float q = clamp(length(v) / rad, 0.0, 1.0);
      vec2 nv = length(v) > 1e-6 ? normalize(v) : vec2(0.0);
      n = normalize(vec3(nv * q, sqrt(max(0.0, 1.0 - q * q)) + 0.05));
      float cr = ba.x * v.y - ba.y * v.x;
      u = q * sign(cr);
      along = h * segL;
      part = floor(B.w * 0.5); right = mod(B.w, 2.0) > 0.5;
      dFront = length(v) - rad;
      // inner side of a limb: toward the body's midline
      if (part == 2.0 || part == 3.0) u = dot(nv, vec2(right ? -1.0 : 1.0, 0.0)) * q;
    }

    // the suit: red with black side panels, web lines on the red
    vec3 red = vec3(0.62, 0.045, 0.06), black = vec3(0.045, 0.045, 0.055);
    float isBlack = 0.0;
    if (part == 1.0) isBlack = step(0.62, abs(u));                                // torso flanks
    if (part == 2.0) isBlack = step(0.2, u);                                      // arms: inner half
    if (part == 3.0) isBlack = step(0.5, abs(u));                                 // legs: side stripes
    if (part == 5.0) isBlack = step(0.4, -n.y);                                   // soles
    vec3 albedo = mix(red, black, isBlack);

    float lw = max(0.0032, px * 0.7), fadeL = 1.0 - smoothstep(0.003, 0.009, px);
    float web = 0.0;
    if (part == 0.0) {
      vec2 w = e - vec2(0.0, -0.035);
      float ang = atan(w.y, w.x), rr = length(w);
      web = max(lineP(ang * rr, 6.2831 * rr / 12.0, lw), lineP(rr + 0.004 * cos(ang * 12.0), 0.034, lw));
    } else if (part == 1.0 || part == 6.0) {
      vec2 w = p - uChest;
      float ang = atan(w.y, w.x), rr = length(w);
      web = max(lineP(ang * rr, 6.2831 * rr / 14.0, lw), lineP(rr + 0.006 * cos(ang * 14.0), 0.06, lw));
    } else if (part == 2.0 || part == 3.0 || part == 4.0) {
      // limbs: lines along the limb, crossed by shallow arcs (a web pulled long, not rings of armour)
      web = max(lineP(u * rad, rad * 0.7, lw), lineP(along + u * u * rad * 1.4, 0.11, lw) * 0.8);
    }
    web *= (1.0 - isBlack) * fadeL;

    // the lenses: big, angled, white behind a black rim; they catch every light first
    float lens = 0.0, rim = 0.0;
    if (part == 0.0) {
      for (int s = 0; s < 2; s++) {
        float sd = s == 0 ? -1.0 : 1.0;
        vec2 c = vec2(sd * 0.05 + uHead.w * 0.03, 0.018);
        vec2 q = rot2(e - c, -sd * 0.5) / vec2(0.05, 0.03);   // outer corners swept up
        float d = (length(q) - 1.0) * 0.03;
        d = max(d, (q.y - 0.5 - sd * q.x * 0.45) * 0.016); // cut along the brow, toward the nose
        lens = max(lens, 1.0 - smoothstep(-px, px, d + 0.008));
        rim = max(rim, 1.0 - smoothstep(-px, px, d));
      }
    }

    // light: a cool key from the searchlights, a crimson rim from behind, a cool rim opposite
    vec3 Lk = normalize(vec3(uKey.xy, 0.55));
    float diff = max(0.0, dot(n, Lk));
    float fres = pow(1.0 - n.z, 2.6);
    float rC = fres * max(0.0, dot(n.xy, normalize(uRim.xy))) * uRim.z;
    float rW = fres * max(0.0, dot(n.xy, -normalize(uRim.xy))) * uRim.w;
    vec3 col = albedo * (0.1 + diff * uKey.z * 0.9 + uKey.w * 1.4);
    col = mix(col, albedo * 0.32, web * 0.6);
    // the suit's sheen
    float spec = pow(max(0.0, dot(reflect(-Lk, n), vec3(0.0, 0.0, 1.0))), 14.0);
    col += vec3(1.0, 0.8, 0.8) * spec * (uKey.z * 0.18 + uKey.w * 0.4) * (1.0 - isBlack * 0.6);
    col += vec3(0.95, 0.16, 0.18) * rC + vec3(0.62, 0.68, 0.8) * rW + vec3(0.85, 0.88, 0.95) * fres * uKey.w * 0.9;
    // a front limb over the body keeps a thin dark edge, so overlapping limbs still read
    float edgeIn = step(-lw * 1.3, dFront) * step(dU, -lw * 2.2) * (bi >= 0 && !head ? 1.0 : 0.0);
    col *= mix(1.0, 0.3, edgeIn);
    col = mix(col, vec3(0.02), rim * (1.0 - lens));
    col = mix(col, vec3(0.78, 0.8, 0.86) * (0.35 + diff * 0.5 + uKey.w * 0.8 + uKey.z * 0.25), lens);

    // the dissolve: the suit's fill breaks up first, its web lines and outline last, as silver filaments
    float a = alpha;
    if (uDissolve > 0.0) {
      float nz = vnoise(p * 22.0) * 0.7 + vnoise(p * 61.0) * 0.3;
      float fill = smoothstep(uDissolve * 1.3 - 0.15, uDissolve * 1.3, nz);
      float edge = 1.0 - smoothstep(lw * 0.6, lw * 1.6, abs(dU));
      float threads = max(web, edge) * (1.0 - smoothstep(0.55, 1.0, uDissolve));
      col = mix(vec3(0.82, 0.84, 0.9) * threads, col, fill);
      a *= max(fill, threads * 0.9);
    }
    a *= uAlpha;
    gl_FragColor = vec4(col * a, a);
  }
`;

export function createFigureMaterial() {
  const uniforms = {
    uQuad: { value: new THREE.Vector4(-1, -1, 1, 1) },
    uA: { value: Array.from({ length: N_SEG }, () => new THREE.Vector4()) },
    uB: { value: Array.from({ length: N_SEG }, () => new THREE.Vector4()) },
    uHead: { value: new THREE.Vector4() },
    uChest: { value: new THREE.Vector2() },
    uKey: { value: new THREE.Vector4(-0.5, 0.7, 0, 0) },
    uRim: { value: new THREE.Vector4(0.7, 0.3, 0.6, 0.25) },
    uDissolve: { value: 0 },
    uAlpha: { value: 1 },
    uBlur: { value: 0 },
    uTime: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true, blending: THREE.NormalBlending });
  return { material, uniforms };
}

/** Copy a solved rig into the material's uniforms. */
export function upload(r: Rig, u: ReturnType<typeof createFigureMaterial>["uniforms"]) {
  for (let i = 0; i < N_SEG; i++) {
    u.uA.value[i].fromArray(r.a, i * 4);
    u.uB.value[i].fromArray(r.b, i * 4);
  }
  u.uHead.value.set(...r.head);
  u.uChest.value.set(r.chest[0], r.chest[1]);
  u.uQuad.value.set(...r.box);
}

export const HEAD = { rx: HEAD_RX, ry: HEAD_RY };
