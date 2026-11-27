/**
 * THE ARRIVAL: the opening sequence, played once per visit inside the hero's own three.js scene
 * (same renderer, same frame loop; see docs/interactive/ARRIVAL.md).
 *
 *   searchlights -> a figure on a far roof -> web shot -> swing -> rooftop landing -> standing up
 *   -> the camera closes on him until he fills his portrait -> the portrait takes over -> unmask
 *
 * Everything here is a pure function of the sequence time t (a paused GSAP timeline for the
 * choreography, a pre-computed rope simulation for the path), so the sequence can be skipped,
 * replayed or inspected frame by frame. It adds five small things to the scene for its length
 * and removes them when it ends: the sky (one quad: skyline, haze and three beams), the rooftop,
 * the figure (one quad, figure.ts), two web strands (the web's own thread shader) and twenty
 * dust motes.
 */
import * as THREE from "three";
import { gsap } from "gsap";
import type { V3 } from "./geometry";
import { createFigureMaterial, makeRig, poseAt, blankPose, solve, upload, POSES, HEAD } from "./figure";

export type ArrivalHooks = {
  nudge: (ndcX: number, ndcY: number, amount: number) => void; // web strands give way (landing)
  pulse: (p: V3) => void; // a light ripple through the web
  dom: (state: "play" | "reveal" | "done") => void; // html[data-arrival]
  unmask: (snap: boolean) => void; // open the portrait reveal on his face
};
export type ArrivalOpts = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  at: (sx: number, sy: number, z: number) => V3;
  W: number; H: number; mobile: boolean; camZ: number;
  threadMat: THREE.Material;
  quadPos: THREE.BufferAttribute; quadIndex: THREE.BufferAttribute;
  /** the portrait box in canvas pixels */
  portrait: { x: number; y: number; w: number; h: number };
  hooks: ArrivalHooks;
};

const SKY_Z = -26;
const SEGS = 24;

// ---------------------------------------------------------------------------------------------
const skyVert = /* glsl */ `
  varying vec2 vW;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }
`;
const skyFrag = /* glsl */ `
  uniform float uSky; uniform float uTime; uniform float uHorizon;
  uniform vec2 uO[3]; uniform vec3 uAng; uniform vec3 uAmp; uniform vec3 uPerch;
  varying vec2 vW;
  float h1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
  float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
  // a row of buildings: cell width cw, base height h0, range hr
  float roofs(float x, float seed, float cw, float h0, float hr) {
    float id = floor(x / cw), f = fract(x / cw);
    float h = h0 + h1(id + seed) * hr + step(0.84, h1(id * 1.7 + seed)) * hr * 0.8;
    h += step(0.9, h1(id * 3.1 + seed)) * step(abs(f - 0.5), 0.02) * 1.4; // a mast
    float inset = step(0.08, f) * step(f, 0.92);
    return mix(h0 + hr * 0.15, h, inset);
  }
  void main() {
    vec2 p = vW;
    float near = roofs(p.x, 3.0, 1.7, uHorizon - 0.7, 2.3);
    if (abs(p.x - uPerch.x) < uPerch.z) near = uPerch.y; // the roof he waits on
    float far = roofs(p.x + 0.37, 11.0, 0.95, uHorizon + 0.4, 1.7);
    // haze: a low glow over the city, barely warm
    float up = p.y - uHorizon;
    vec3 col = vec3(0.15, 0.15, 0.18) * exp(-max(0.0, up) / 3.0) + vec3(0.06, 0.014, 0.02) * exp(-abs(up) / 1.2);
    // the beams, rising from behind the roofs
    vec3 beams = vec3(0.0);
    float haze = vn(p * vec2(0.9, 0.22) + vec2(0.0, -uTime * 0.25)); // one sample of drifting haze, shared
    vec3 bc[3]; bc[0] = vec3(0.72, 0.78, 0.92); bc[1] = vec3(0.8, 0.78, 0.74); bc[2] = vec3(0.86, 0.15, 0.17);
    for (int i = 0; i < 3; i++) {
      float a = uAng[i];
      vec2 dir = vec2(sin(a), cos(a));
      vec2 d = p - uO[i];
      float s = dot(d, dir), q = dot(d, vec2(dir.y, -dir.x));
      float w = 0.2 + max(s, 0.0) * 0.07;
      float I = exp(-q * q / (w * w) * 1.5) + 0.35 * exp(-q * q / (w * w) * 9.0);
      I *= smoothstep(0.0, 2.5, s) * exp(-max(s, 0.0) * 0.028) * uAmp[i];
      float streak = 0.78 + 0.22 * (1.0 + sin(6.2832 * (haze + float(i) * 0.37) + q / w * 0.6));
      beams += bc[i] * I * streak * 0.62;
    }
    if (p.y < near) {
      // a near roof: black, the odd lit window, and it hides the beams
      vec2 g = vec2(p.x / 0.2, p.y / 0.3);
      float lit = step(0.982, h2(floor(g) + 7.0)) * step(0.25, fract(g.x)) * step(fract(g.x), 0.75) * step(0.3, fract(g.y)) * step(fract(g.y), 0.7);
      col = vec3(0.004, 0.004, 0.006) + vec3(0.32, 0.2, 0.11) * lit * 0.1 * step(p.y, near - 0.35);
    } else if (p.y < far) {
      col = col * 0.42 + beams * 0.1; // far roofs, half lost in the haze
    } else {
      col += beams;
    }
    col *= uSky;
    gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
  }
`;

const roofVert = /* glsl */ `
  varying vec2 vL;
  void main() { vL = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const roofFrag = /* glsl */ `
  uniform float uRoof; uniform float uRim; uniform float uKey; uniform float uTop; uniform float uX; uniform float uHalf;
  varying vec2 vL;
  float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float yy = uTop - vL.y; // depth below the parapet's edge
    vec3 col = vec3(0.011, 0.011, 0.014);
    col += vec3(0.012) * (1.0 - smoothstep(0.0, 0.09, yy)); // the coping
    float seam = 1.0 - smoothstep(0.0, 0.012, abs(fract(vL.x / 1.35) - 0.5) * 1.35 - 0.664);
    col *= 1.0 - seam * 0.5 * step(0.09, yy);
    col *= 0.85 + 0.3 * h2(floor(vL * vec2(40.0, 60.0)));
    float edge = exp(-yy * yy / 0.00018) * exp(-pow((vL.x - uX) / 2.4, 2.0));
    col += (vec3(0.8, 0.12, 0.14) * uRim + vec3(0.6, 0.65, 0.75) * uKey) * edge;
    col *= 1.0 - smoothstep(0.5, 3.5, yy) * 0.7;
    // a building's roof, not a line across the page: it ends a little either side of him
    float side = abs(vL.x - uX) - uHalf;
    col += vec3(0.035) * exp(-pow(side / 0.02, 2.0)) * (1.0 - smoothstep(0.0, 1.2, yy)); // its corner catches the light
    float a = uRoof * (1.0 - smoothstep(-0.01, 0.01, side));
    gl_FragColor = vec4(col * a, a);
  }
`;

const dustVert = /* glsl */ `
  attribute float aA; uniform float uDpr; varying float vA;
  void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; vA = aA; gl_PointSize = uDpr * (2.0 + 26.0 / -mv.z); }
`;
const dustFrag = /* glsl */ `
  varying float vA;
  void main() { vec2 p = gl_PointCoord * 2.0 - 1.0; float a = exp(-dot(p, p) * 3.0) * vA; gl_FragColor = vec4(vec3(0.6, 0.6, 0.64) * a, a); }
`;

// ---------------------------------------------------------------------------------------------
/**
 * One swing: a pendulum arc about the anchor his web holds. The arc runs from where the web catches
 * him (the leap, or a point in mid-air) to where he lets go (`to`, his pelvis, as a screen fraction
 * and a depth); `dip` is how far the arc sags below the straight line between them, which fixes the
 * anchor (always above both ends) and the rope length. `prof` is the slice of a pendulum's half
 * period he travels: speed rises toward the bottom of the arc and falls toward its ends, as it does
 * on a real rope; a slice that doesn't end at 1 means he lets go while still moving.
 */
type Swing = {
  from?: V3; to: V3; dip: number; prof: [number, number];
  shoot: number; attach: number; release: number;
  anchor: THREE.Vector3;
};
type Plan = {
  perchFeet: THREE.Vector3; perchHalf: number;
  ground: THREE.Vector3; // landing point (between his feet)
  webs: Swing[];
  jump: number; land: number;
  beamO: [number, number][]; catchAt: number;
};

const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const sm = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export function createArrival(o: ArrivalOpts) {
  const { scene, camera, at, mobile } = o;
  const add: THREE.Object3D[] = [];
  const disposables: { dispose: () => void }[] = [];

  // ---- the plan: where things are, for this screen ----
  const perchFeet = v3(mobile ? at(0.2, 0.47, SKY_Z) : at(0.16, 0.5, SKY_Z));
  const ground = v3(mobile ? at(0.5, 0.735, -1.2) : at(0.5, 0.655, -1.2));
  const horizonY = at(0.5, mobile ? 0.5 : 0.53, SKY_Z)[1];
  const A0 = new THREE.Vector3();
  const plan: Plan = mobile
    ? {
        perchFeet, perchHalf: 0.9, ground,
        webs: [{ to: at(0.66, 0.27, -7), dip: 3.0, prof: [0, 0.8], shoot: 2.0, attach: 2.16, release: 3.4, anchor: A0.clone() }],
        jump: 2.3, land: 3.95,
        beamO: [[0.3, 0.66], [0.82, 0.66], [0.6, 0.68]], catchAt: 1.45,
      }
    : {
        perchFeet, perchHalf: 1.0, ground,
        webs: [
          { to: at(0.6, 0.3, -12), dip: 3.2, prof: [0, 0.82], shoot: 1.85, attach: 2.02, release: 3.2, anchor: A0.clone() },
          { from: at(0.7, 0.24, -9), to: at(0.42, 0.22, -3.5), dip: 1.6, prof: [0.04, 0.84], shoot: 3.22, attach: 3.36, release: 3.98, anchor: A0.clone() },
        ],
        jump: 2.15, land: 4.4,
        beamO: [[0.3, 0.7], [0.86, 0.7], [0.6, 0.72]], catchAt: 1.3,
      };
  const beamO = plan.beamO.map(([sx, sy]) => { const p = at(sx, sy, SKY_Z); return new THREE.Vector2(p[0], p[1]); });

  // ---- choreography (GSAP, paused: the scene's loop seeks it) ----
  const angTo = (i: number, p: THREE.Vector3) => Math.atan2(p.x - beamO[i].x, p.y - beamO[i].y);
  const cPerch = angTo(0, perchFeet.clone().setY(perchFeet.y + 0.9));
  const cLand = angTo(1, ground.clone());
  const chor = {
    sky: 0, a1: 0, a2: 0, a3: 0, b1: cPerch + 0.62, b2: -0.55, b3: 0.3,
    pose: 0, att0: 0, att1: 0, push: 0, dissolve: 0, fig: 1, roof: 1, lift: 0.28, rimC: 0.55, key: 0.1,
    camX: 0, camY: 0, camZ: 0, eye: 0,
  };
  const tl = gsap.timeline({ paused: true });
  const T = (prop: keyof typeof chor, from: number, to: number, start: number, dur: number, ease = "sine.inOut") =>
    tl.fromTo(chor, { [prop]: from }, { [prop]: to, duration: dur, ease, immediateRender: false }, start);
  const w0 = plan.webs[0], wl = plan.webs[plan.webs.length - 1];
  // 01 the spotlights
  T("sky", 0, 1, 0, 1.1, "power1.out");
  T("a1", 0, 0.95, 0, 0.9, "power1.out"); T("a2", 0, 0.7, 0.25, 1.0, "power1.out"); T("a3", 0, 0.42, 0.5, 1.2, "power1.out");
  T("b1", chor.b1, cPerch, 0, plan.catchAt, "sine.out"); // the first beam finds him...
  T("b1", cPerch, cPerch - 0.5, plan.catchAt, 1.9, "sine.inOut"); // ...and moves on
  T("b2", chor.b2, 0.42, 0, 3.0); T("b2", 0.42, cLand + 0.04, 3.0, 1.6);
  T("b3", chor.b3, -0.22, 0, 3.4); T("b3", -0.22, 0.12, 3.4, 1.8);
  // 02 the figure: still on the far roof; the light catches him; he looks round
  T("pose", 0, 1, plan.catchAt + 0.12, 0.42, "none");
  T("eye", 0, 1, plan.catchAt + 0.12, 0.3);
  // 03 the web shot and the leap
  T("pose", 1, 2, w0.shoot - 0.16, 0.2, "none");
  T("pose", 2, 3, plan.jump - 0.05, 0.22, "none");
  T("att0", 0, 1, w0.attach, 0.12, "power2.out");
  // 04 the swing
  T("pose", 3, 4, plan.jump + 0.2, 0.4, "none");
  T("att0", 1, 0, w0.release, 0.1, "power1.in");
  T("pose", 4, 5, w0.release - 0.05, 0.22, "none");
  if (plan.webs.length > 1) {
    const w1 = plan.webs[1];
    T("pose", 5, 6, w1.shoot - 0.04, 0.16, "none");
    T("att1", 0, 1, w1.attach, 0.1, "power2.out");
    T("att1", 1, 0, w1.release, 0.08, "power1.in");
    T("pose", 6, 7, w1.release, 0.26, "none");
  } else {
    T("pose", 5, 7, w0.release + 0.18, 0.4, "none");
  }
  // 05 the landing
  T("pose", 7, 8, plan.land - 0.07, 0.17, "power1.out");
  // 06 standing up: deliberate; the lights settle into the portrait's lighting
  const rise = plan.land + 0.5;
  T("pose", 8, 9, rise, 0.75, "none");
  T("pose", 9, 10, rise + 0.75, 0.6, "none");
  T("b1", cPerch - 0.5, -0.32, plan.catchAt + 1.9, rise + 1.2 - (plan.catchAt + 1.9));
  T("a2", 0.7, 0.4, plan.land, 1.0);
  T("rimC", 0.55, 0.9, plan.land, 1.2);
  T("camX", 0, mobile ? 0.12 : 0.32, plan.jump, 1.3); T("camX", mobile ? 0.12 : 0.32, 0, plan.jump + 1.3, 1.4);
  T("camY", 0, -0.18, plan.land - 0.05, 0.12, "power2.out"); T("camY", -0.18, 0, plan.land + 0.07, 0.7, "power2.out");
  // the camera closes on him until he fills his portrait
  const pushAt = rise + 0.45;
  T("push", 0, 1, pushAt, 1.35, "power2.inOut");
  T("roof", 1, 0, pushAt + 0.6, 0.6);
  // 07 the portrait takes over: his outline breaks into web filaments as the photograph lights up
  const reveal = pushAt + 1.18;
  T("dissolve", 0, 1, reveal + 0.05, 0.8, "power1.inOut");
  T("sky", 1, 0, pushAt + 0.35, 0.85, "power1.inOut"); // the night lifts as he fills the frame
  T("lift", 0.28, 1, reveal, 1.2);
  const unmask = reveal + 0.75;
  const end = unmask + 0.65;

  // ---- the figure's rig at the key moments ----
  const pose = blankPose();
  const rig = makeRig();
  const poseMinY = (c: number) => solve(poseAt(c, pose), 0, rig).minY;
  tl.time(plan.jump, true);
  const jumpPelvis = plan.perchFeet.clone().setY(plan.perchFeet.y - poseMinY(chor.pose));
  const landPelvis = plan.ground.clone().setY(plan.ground.y - poseMinY(8));
  const standRig = solve(POSES.stand, 0, makeRig());
  tl.time(0, true);

  // ---- the path: pendulum arcs, joined (and ended on the roof) by curves that keep his speed ----
  type Seg = { t0: number; t1: number; f: (t: number, out: THREE.Vector3) => void };
  const segs: Seg[] = [];
  const posAt = (sg: Seg, t: number, out: THREE.Vector3) => sg.f(Math.min(sg.t1, Math.max(sg.t0, t)), out);
  const H = 1 / 480;
  const velAt = (sg: Seg, t: number, out: THREE.Vector3) => {
    const a = Math.max(sg.t0, Math.min(sg.t1 - H, t - H / 2));
    const q = new THREE.Vector3();
    posAt(sg, a + H, out); posAt(sg, a, q);
    return out.sub(q).divideScalar(H);
  };
  const arc = (P: THREE.Vector3, Q: THREE.Vector3, sw: Swing, t0: number): Seg => {
    const chord = Q.clone().sub(P), c = chord.length() / 2, d = chord.normalize();
    const n = new THREE.Vector3(0, 1, 0).addScaledVector(d, -d.y).normalize();
    const dip = Math.min(sw.dip, c * 0.9);
    const k = (c * c - dip * dip) / (2 * dip), R = Math.hypot(c, k);
    const A = P.clone().add(Q).multiplyScalar(0.5).addScaledVector(n, k);
    sw.anchor.copy(A);
    const uP = P.clone().sub(A).divideScalar(R), uQ = Q.clone().sub(A).divideScalar(R);
    const om = Math.acos(Math.min(1, Math.max(-1, uP.dot(uQ)))), so = Math.sin(om) || 1;
    const [pa, pb] = sw.prof, c0 = Math.cos(Math.PI * pa), norm = c0 - Math.cos(Math.PI * pb);
    const t1 = sw.release;
    return {
      t0, t1, f: (t, out) => {
        const u = clamp01((t - t0) / (t1 - t0));
        const sp = (c0 - Math.cos(Math.PI * (pa + u * (pb - pa)))) / norm;
        out.copy(uP).multiplyScalar(Math.sin((1 - sp) * om) / so).addScaledVector(uQ, Math.sin(sp * om) / so).multiplyScalar(R).add(A);
      },
    };
  };
  const curve = (a: Seg, at0: number, P1: THREE.Vector3, V1: THREE.Vector3, t1: number): Seg => {
    const P0 = new THREE.Vector3(), V0 = new THREE.Vector3();
    posAt(a, at0, P0); velAt(a, at0, V0);
    const T = t1 - at0;
    return {
      t0: at0, t1, f: (t, out) => {
        const s = clamp01((t - at0) / T), s2 = s * s, s3 = s2 * s;
        out.copy(P0).multiplyScalar(2 * s3 - 3 * s2 + 1).addScaledVector(V0, (s3 - 2 * s2 + s) * T).addScaledVector(P1, -2 * s3 + 3 * s2).addScaledVector(V1, (s3 - s2) * T);
      },
    };
  };
  plan.webs.forEach((sw, i) => {
    const t0 = i === 0 ? plan.jump : sw.attach;
    const from = i === 0 ? jumpPelvis : v3(sw.from!);
    const a = arc(from, v3(sw.to), sw, t0);
    if (i > 0) {
      // the moment between two webs: free flight from one arc into the next
      const pv = new THREE.Vector3(), pp = new THREE.Vector3();
      posAt(a, t0, pp); velAt(a, t0, pv);
      segs.push(curve(segs[segs.length - 1], plan.webs[i - 1].release, pp, pv, t0));
    }
    segs.push(a);
  });
  // the drop onto the roof: down and a little toward us
  segs.push(curve(segs[segs.length - 1], wl.release, landPelvis, new THREE.Vector3(0, -7.5, 1.2), plan.land));
  const pathAt = (t: number, P: THREE.Vector3, V: THREE.Vector3) => {
    const sg = segs.find((g) => t < g.t1) ?? segs[segs.length - 1];
    posAt(sg, t, P); velAt(sg, t, V);
  };

  // ---- the push: where his head must be for it to sit exactly on the portrait's head ----
  const pb = o.portrait;
  const headPx = 0.42 * pb.h; // the mask's head is 42% of the image height, centred at (0.503, 0.30)
  const dist = (2 * HEAD.ry * o.H) / (headPx * 2 * Math.tan((camera.fov * Math.PI) / 360));
  const headTarget = v3(at((pb.x + pb.w * 0.503) / o.W, (pb.y + pb.h * 0.3) / o.H, o.camZ - dist));
  const standPelvis = plan.ground.clone().setY(plan.ground.y - standRig.minY);
  const pushTo = headTarget.clone().sub(new THREE.Vector3(standPelvis.x + standRig.head[0], standPelvis.y + standRig.head[1], standPelvis.z));

  // ---- scene objects ----
  const group = new THREE.Group(); // the figure, his roof and the dust: what the push moves
  scene.add(group); add.push(group);

  // the sky
  const fh = 2 * (o.camZ - SKY_Z) * Math.tan((camera.fov * Math.PI) / 360);
  const skyGeo = new THREE.PlaneGeometry(fh * camera.aspect * 1.3, fh * 1.3);
  const skyU = {
    uSky: { value: 0 }, uTime: { value: 0 }, uHorizon: { value: horizonY },
    uO: { value: beamO }, uAng: { value: new THREE.Vector3() }, uAmp: { value: new THREE.Vector3() },
    uPerch: { value: new THREE.Vector3(perchFeet.x, perchFeet.y, plan.perchHalf) },
  };
  const skyMat = new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, uniforms: skyU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.set(0, 0, SKY_Z);
  sky.renderOrder = -2;
  sky.frustumCulled = false;
  scene.add(sky); add.push(sky); disposables.push(skyGeo, skyMat);

  // the rooftop he lands on
  const roofGeo = new THREE.PlaneGeometry(60, 14);
  roofGeo.translate(0, -7, 0);
  const roofU = { uRoof: { value: 1 }, uRim: { value: 0 }, uKey: { value: 0 }, uTop: { value: 0 }, uX: { value: ground.x }, uHalf: { value: mobile ? 1.15 : 2.6 } };
  const roofMat = new THREE.ShaderMaterial({ vertexShader: roofVert, fragmentShader: roofFrag, uniforms: roofU, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, plan.ground.y, plan.ground.z);
  roof.renderOrder = 1;
  roof.frustumCulled = false;
  group.add(roof); disposables.push(roofGeo, roofMat);

  // the figure
  const fig = createFigureMaterial();
  const figGeo = new THREE.PlaneGeometry(1, 1);
  const figure = new THREE.Mesh(figGeo, fig.material);
  figure.frustumCulled = false;
  group.add(figure); disposables.push(figGeo, fig.material);

  // The close-up: once he fills most of the screen, he is drawn at 1x pixel density into an
  // off-screen target and scaled up, a quarter of the work on a 2x screen (the shader is per pixel,
  // and by then the photograph is taking over from him anyway). Layer 1 holds him for that pass.
  const rt = new THREE.WebGLRenderTarget(2, 2, { depthBuffer: false, type: THREE.UnsignedByteType });
  const compMat = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: rt.texture } },
    vertexShader: "varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: "uniform sampler2D tMap; varying vec2 vUv; void main() { gl_FragColor = texture2D(tMap, vUv); }",
    transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true, blending: THREE.NormalBlending,
  });
  const compGeo = new THREE.PlaneGeometry(2, 2);
  const comp = new THREE.Mesh(compGeo, compMat);
  comp.frustumCulled = false;
  comp.renderOrder = 2;
  comp.visible = false;
  scene.add(comp); add.push(comp); disposables.push(rt, compMat, compGeo);
  let lowres = false;
  /** allocate the close-up target up front (with the shader compile), so its first use is free */
  function warm(renderer: THREE.WebGLRenderer) {
    rt.setSize(Math.ceil(o.W), Math.ceil(o.H));
    renderer.initRenderTarget(rt);
  }
  /** before the scene's own render: the close-up pass, when it's on */
  function prerender(renderer: THREE.WebGLRenderer, dpr: number) {
    lowres = dpr > 1.25 && figure.visible && probe.px > o.H * 0.55;
    figure.layers.set(lowres ? 1 : 0);
    comp.visible = lowres;
    if (!lowres) return;
    const w = Math.ceil(o.W), h = Math.ceil(o.H);
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    const prevClear = renderer.getClearAlpha();
    camera.layers.set(1);
    renderer.setRenderTarget(rt);
    renderer.setClearAlpha(0);
    renderer.clear(true, false, false);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.setClearAlpha(prevClear);
    camera.layers.set(0);
  }

  // the webs he shoots: the web's own thread shader (flag 3 = a bright strand)
  const strandGeo = new THREE.InstancedBufferGeometry();
  strandGeo.setAttribute("position", o.quadPos);
  strandGeo.setIndex(o.quadIndex);
  const nW = plan.webs.length;
  const sA = new THREE.InstancedBufferAttribute(new Float32Array(nW * SEGS * 3), 3);
  const sB = new THREE.InstancedBufferAttribute(new Float32Array(nW * SEGS * 3), 3);
  const sT = new Float32Array(nW * SEGS * 2), sTime = new Float32Array(nW * SEGS * 2), sStyle = new Float32Array(nW * SEGS * 4);
  for (let w = 0; w < nW; w++) for (let i = 0; i < SEGS; i++) {
    const j = w * SEGS + i;
    sT.set([i / SEGS, (i + 1) / SEGS], j * 2);
    sTime.set([-1e3, 1], j * 2);
    sStyle.set([1.15, 0, 0, 3], j * 4);
  }
  const sStyleAttr = new THREE.InstancedBufferAttribute(sStyle, 4);
  strandGeo.setAttribute("aStart", sA);
  strandGeo.setAttribute("aEnd", sB);
  strandGeo.setAttribute("aT", new THREE.InstancedBufferAttribute(sT, 2));
  strandGeo.setAttribute("aTime", new THREE.InstancedBufferAttribute(sTime, 2));
  strandGeo.setAttribute("aStyle", sStyleAttr);
  strandGeo.instanceCount = nW * SEGS;
  const strands = new THREE.Mesh(strandGeo, o.threadMat);
  strands.frustumCulled = false;
  strands.renderOrder = 3;
  scene.add(strands); add.push(strands); disposables.push(strandGeo);

  // landing dust: twenty motes, no more
  const ND = 20;
  const dustPos = new THREE.BufferAttribute(new Float32Array(ND * 3), 3);
  const dustA = new THREE.BufferAttribute(new Float32Array(ND), 1);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", dustPos);
  dustGeo.setAttribute("aA", dustA);
  const dustU = { uDpr: { value: 1 } };
  const dustMat = new THREE.ShaderMaterial({ vertexShader: dustVert, fragmentShader: dustFrag, uniforms: dustU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.renderOrder = 4;
  group.add(dust); disposables.push(dustGeo, dustMat);
  const seedRand = (i: number) => { const x = Math.sin(i * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x); };
  const motes = Array.from({ length: ND }, (_, i) => {
    const a = (i / ND) * Math.PI * 2 + seedRand(i) * 0.4;
    const s = 0.9 + seedRand(i + 40) * 1.6;
    return { vx: Math.cos(a) * s, vz: Math.sin(a) * s * 0.6, vy: 0.25 + seedRand(i + 80) * 0.7, life: 0.7 + seedRand(i + 120) * 0.6 };
  });

  // ---- outputs for the scene ----
  const out = {
    cam: new THREE.Vector3(),
    lift: 0.28,
    /** the beams in normalised device coordinates, for the web's catch-light: origin xy, direction xy */
    beamNdc: Array.from({ length: 3 }, () => new THREE.Vector4()),
    beamW: new THREE.Vector3(),
    beamAmt: new THREE.Vector3(),
  };

  // ---- per frame ----
  const P = new THREE.Vector3(), V = new THREE.Vector3(), Pg = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const hand = new THREE.Vector3();
  const probe = { x: 0, y: 0, z: 0, px: 0, tilt: 0 };
  let landed = false, state: "play" | "reveal" | "done" | "" = "", unmasked = false;
  const project = (p: THREE.Vector3) => tmp2.copy(p).project(camera);
  const beamAt = (i: number, x: number, y: number, ang: number, amp: number) => {
    const dx = x - beamO[i].x, dy = y - beamO[i].y;
    const s = dx * Math.sin(ang) + dy * Math.cos(ang), q = dx * Math.cos(ang) - dy * Math.sin(ang);
    const w = 0.16 + Math.max(0, s) * 0.062;
    return Math.exp((-q * q) / (w * w) * 1.5) * sm(0, 2.5, s) * amp;
  };

  function update(t: number, dpr: number) {
    tl.time(Math.min(t, end), true);
    const c = chor;
    skyU.uSky.value = c.sky;
    skyU.uTime.value = t;
    skyU.uAng.value.set(c.b1, c.b2, c.b3);
    skyU.uAmp.value.set(c.a1, c.a2, c.a3);
    out.lift = c.lift;
    out.cam.set(c.camX, c.camY, c.camZ);

    // ---- where he is ----
    const pc = c.pose;
    poseAt(pc, pose);
    let tilt = 0;
    let grounded = 1;
    if (t < plan.jump) {
      grounded = 1;
      P.copy(plan.perchFeet);
    } else if (t < plan.land) {
      pathAt(t, P, V);
      grounded = 1 - sm(plan.jump - 0.02, plan.jump + 0.08, t);
    } else {
      grounded = 1;
      P.copy(plan.ground);
    }
    // body orientation: along the web while it holds him, into the wind when free
    const atts = [c.att0, c.att1];
    let ropeW = 0, ropeTilt = 0;
    for (let k = 0; k < plan.webs.length; k++) {
      const w = atts[k] ?? 0;
      if (w <= 0) continue;
      const a = project(plan.webs[k].anchor).clone(), b = project(P);
      ropeTilt = Math.atan2(-(a.x - b.x) * camera.aspect, a.y - b.y);
      ropeW = Math.max(ropeW, w);
    }
    const free = grounded < 1 ? Math.max(-0.55, Math.min(0.55, -V.x * 0.03)) : 0;
    tilt = (ropeTilt * ropeW + free * (1 - ropeW)) * (1 - grounded);
    solve(pose, tilt, rig);
    if (grounded >= 1) {
      // feet on the roof: the pelvis sits as high as the pose allows; a small settle after the landing
      const settle = t > plan.land ? -0.06 * Math.exp(-(t - plan.land) * 9) * Math.sin((t - plan.land) * 22) : 0;
      Pg.set(P.x, P.y - rig.minY + settle, P.z);
      P.copy(Pg);
    } else if (grounded > 0) {
      Pg.set(plan.perchFeet.x, plan.perchFeet.y - rig.minY, plan.perchFeet.z);
      P.lerp(Pg, grounded);
    }
    // the push
    const e = c.push;
    group.position.copy(pushTo).multiplyScalar(e);
    figure.position.copy(P);
    upload(rig, fig.uniforms);

    // light on him: the beams that cross him, a crimson rim behind, a cool rim opposite
    const figWorld = tmp.copy(P).add(group.position);
    const pr = project(figWorld);
    probe.x = +((pr.x * 0.5 + 0.5) * o.W).toFixed(0); probe.y = +((0.5 - pr.y * 0.5) * o.H).toFixed(0); probe.z = +figWorld.z.toFixed(2); probe.tilt = +tilt.toFixed(2);
    probe.px = +((1.8 / (2 * (camera.position.z - figWorld.z) * Math.tan((camera.fov * Math.PI) / 360))) * o.H).toFixed(0);
    // where he is against the sky (for the beams)
    const k = (SKY_Z - camera.position.z) / (figWorld.z - camera.position.z);
    const sx = camera.position.x + (figWorld.x - camera.position.x) * k, sy = camera.position.y + (figWorld.y + 0.6 - camera.position.y) * k;
    const catchL = beamAt(0, sx, sy, c.b1, c.a1) + beamAt(1, sx, sy, c.b2, c.a2) * 0.7 + beamAt(2, sx, sy, c.b3, c.a3) * 0.4;
    fig.uniforms.uKey.value.set(-0.45 - pr.x * 0.4, -0.55, c.key + 0.25 * c.sky, Math.min(1.2, catchL * 0.9 * (1 - c.push)));
    fig.uniforms.uRim.value.set(0.75, 0.25, c.rimC + 0.35 * (1 - grounded), 0.35 + 0.3 * c.sky);
    fig.uniforms.uDissolve.value = c.dissolve;
    fig.uniforms.uAlpha.value = c.fig;
    fig.uniforms.uTime.value = t;
    // motion blur: the faster he crosses the screen, the softer his edges
    const speed = grounded < 1 ? V.length() / Math.max(1, -project(figWorld).z) : 0;
    fig.uniforms.uBlur.value = Math.min(2.2, speed * 0.05);
    // near the camera he is in front of the web; far away the web is in front of him
    figure.renderOrder = figWorld.z > -4 ? 2 : -1;

    // nothing invisible is drawn: a dissolved figure, a faded sky or a gone roof costs no pixels
    figure.visible = c.dissolve < 0.995 && c.fig > 0.002;
    sky.visible = c.sky > 0.002;
    roof.visible = c.roof > 0.002;
    roofU.uRoof.value = c.roof;
    roofU.uTop.value = 0;
    roofU.uRim.value = 0.15 + 0.35 * c.sky;
    roofU.uKey.value = beamAt(1, ground.x, horizonY + 1.5, c.b2, c.a2) * 0.6;
    roof.position.set(0, plan.ground.y, plan.ground.z);

    // ---- the webs he shoots ----
    hand.set(rig.handR[0], rig.handR[1], 0).add(P);
    const sAa = sA.array as Float32Array, sBa = sB.array as Float32Array;
    plan.webs.forEach((w, wi) => {
      const base = wi * SEGS;
      let show = 0, tipU = 0, wob = 0, flash = 0, fall = 0;
      if (t >= w.shoot && t < w.release + 0.5) {
        show = 1;
        tipU = clamp01((t - w.shoot) / (w.attach - w.shoot));
        tipU = 1 - (1 - tipU) * (1 - tipU);
        const ta = t - w.attach;
        if (ta > 0 && t < w.release) { wob = Math.exp(-ta * 9) * Math.cos(ta * 38); flash = ta < 0.3 ? 1 - ta / 0.3 : 0; }
        if (t >= w.release) { fall = (t - w.release) / 0.5; show = 1 - fall; }
      }
      const A = w.anchor;
      const from = t >= w.release ? tmp.copy(hand).setY(hand.y - fall * fall * 2.5) : hand;
      const L = from.distanceTo(A);
      const dir = tmp2.subVectors(A, from).normalize();
      const nx = -dir.y, ny = dir.x; // the strand's sideways direction, in the screen plane
      for (let i = 0; i < SEGS; i++) {
        for (const [arr, s] of [[sAa, i / SEGS], [sBa, (i + 1) / SEGS]] as const) {
          const u = s * tipU;
          const bow = Math.sin(Math.PI * s) * L * (0.05 * (1 - tipU) + 0.035 * wob + 0.12 * fall);
          const j = (base + i) * 3;
          arr[j] = from.x + (A.x - from.x) * u + nx * bow;
          arr[j + 1] = from.y + (A.y - from.y) * u + ny * bow - (fall > 0 ? Math.sin(Math.PI * s) * fall * 0.6 : 0);
          arr[j + 2] = from.z + (A.z - from.z) * u;
        }
        // the attachment: a flash runs down the strand from the anchor to his hand
        const s = (i + 0.5) / SEGS;
        const wave = flash > 0 ? Math.exp(-(((1 - s) - (1 - flash)) ** 2) / 0.01) : 0;
        sStyle[(base + i) * 4 + 1] = show * (0.6 + 0.9 * wave);
      }
    });
    sA.needsUpdate = true; sB.needsUpdate = true; sStyleAttr.needsUpdate = true;

    // ---- the landing: dust, the nearby web gives way, a ripple of light ----
    if (t >= plan.land && !landed) {
      landed = true;
      const n = project(tmp.copy(plan.ground).add(group.position));
      o.hooks.nudge(n.x, n.y, 1.25);
      o.hooks.pulse([plan.ground.x, plan.ground.y, plan.ground.z]);
    }
    if (t < plan.land) landed = false;
    const da = dustA.array as Float32Array, dp = dustPos.array as Float32Array;
    const tau = t - plan.land;
    motes.forEach((m, i) => {
      const live = tau > 0 && tau < m.life;
      const drag = live ? (1 - Math.exp(-tau * 3)) / 3 : 0;
      dp[i * 3] = plan.ground.x + m.vx * drag * 0.9;
      dp[i * 3 + 1] = plan.ground.y + 0.03 + m.vy * drag - 0.4 * tau * tau * (live ? 1 : 0);
      dp[i * 3 + 2] = plan.ground.z + m.vz * drag;
      da[i] = live ? 0.32 * (1 - tau / m.life) ** 2 : 0;
    });
    dustPos.needsUpdate = true; dustA.needsUpdate = true;
    dustU.uDpr.value = dpr;

    // ---- the beams, for the web's catch-light ----
    for (let i = 0; i < 3; i++) {
      const ang = [c.b1, c.b2, c.b3][i];
      const p0 = project(tmp.set(beamO[i].x, beamO[i].y, SKY_Z));
      const x0 = p0.x, y0 = p0.y;
      const p1 = project(tmp.set(beamO[i].x + Math.sin(ang) * 10, beamO[i].y + Math.cos(ang) * 10, SKY_Z));
      const dx = (p1.x - x0) * camera.aspect, dy = p1.y - y0, dl = Math.hypot(dx, dy) || 1;
      out.beamNdc[i].set(x0 * camera.aspect, y0, dx / dl, dy / dl);
    }
    out.beamW.set(0.075, 0.075, 0.085);
    out.beamAmt.set(c.a1 * c.sky, c.a2 * c.sky, c.a3 * c.sky);

    // ---- the page ----
    const want = t >= end ? "done" : t >= reveal ? "reveal" : "play";
    if (want !== state) { state = want; o.hooks.dom(want); }
    if (t >= unmask && !unmasked) { unmasked = true; o.hooks.unmask(false); }
    if (t < unmask) unmasked = false;
    return t < end;
  }

  function dispose() {
    tl.kill();
    for (const ob of add) ob.removeFromParent();
    for (const d of disposables) d.dispose();
  }

  /** hidden while its shaders compile in the background (scene.ts), so no frame waits on them */
  const setVisible = (v: boolean) => { for (const ob of add) ob.visible = v && ob !== comp; };

  return { update, prerender, warm, dispose, setVisible, duration: end, out, probe, marks: { jump: plan.jump, land: plan.land, reveal, unmask, end, push: pushAt } };
}
export type Arrival = ReturnType<typeof createArrival>;
