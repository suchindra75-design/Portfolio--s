/**
 * THE WEB, renderer. Plain three.js in one imperative module (no React per frame): every thread is
 * one instance of a screen-space quad, drawn in a single call, lit from its tangent like a fibre
 * (Kajiya-Kay style): a neutral key light and a very low crimson rim from behind. Hubs and the five
 * interactive anchors are one small point layer.
 *
 * Renders only while something changes (construction, a pulse, the camera easing, hover, the page
 * scrolling), and not at all while it is off screen or the tab is hidden. See
 * docs/interactive/HERO-WEB.md.
 *
 * Phase 4 (docs/interactive/PHASE4-DARKROOM-LINE.md): the canvas is one sticky screen behind the
 * hero AND the project gallery. As the page scrolls the web tilts back and dims (it follows the
 * scroll position; nothing plays on its own), and one crimson thread leaves the near web and falls
 * to the centre of the gallery's rail, where it holds the project in front. Its far end is read
 * from the page every frame, so the strand and the rail never come apart.
 */
import * as THREE from "three";
import { buildWeb, type V3, type WebData } from "./geometry";
import { railNode } from "../showcase/thread";
import { createArrival, type Arrival, type ArrivalHooks } from "./arrival";

const FOV = 32;
const CAM_Z = 12;
const LOOK: V3 = [0, 0, -2];
const PULSE_SPEED = 7.5; // world units per second
const PULSE_LIFE = 2.6; // s
const MAX_PULSES = 4;

const threadVert = /* glsl */ `
  attribute vec3 aStart; attribute vec3 aEnd; attribute vec2 aT; attribute vec2 aTime; attribute vec4 aStyle;
  uniform vec2 uRes; uniform float uDpr; uniform float uTime; uniform vec3 uCam;
  uniform vec2 uPointer; uniform float uPointerAmt;
  uniform vec4 uPulse[${MAX_PULSES}]; uniform vec4 uHover; uniform float uVerse;
  uniform float uFade; uniform float uThread;
  uniform vec4 uBeam[3]; uniform vec3 uBeamW; uniform vec3 uBeamAmt; uniform float uLift; // the Arrival's searchlights
  varying float vT; varying float vProg; varying float vDist; varying float vHalf; varying float vCore;
  varying vec3 vColor; varying float vSoft; varying float vCover;

  float fibre(vec3 T, vec3 L, vec3 V, float p) { vec3 H = normalize(L + V); float c = dot(T, H); return pow(sqrt(max(0.0, 1.0 - c * c)), p); }
  float wrap(vec3 T, vec3 L) { float c = dot(T, L); return sqrt(max(0.0, 1.0 - c * c)); }

  void main() {
    float along = position.x; float side = position.y;
    vec4 c0 = projectionMatrix * modelViewMatrix * vec4(aStart, 1.0);
    vec4 c1 = projectionMatrix * modelViewMatrix * vec4(aEnd, 1.0);
    vec2 n0 = c0.xy / c0.w, n1 = c1.xy / c1.w;

    // tension: threads near the pointer give way a little (more for nearer threads)
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 d0 = (n0 - uPointer) * asp, d1 = (n1 - uPointer) * asp;
    float f0 = exp(-dot(d0, d0) / 0.03), f1 = exp(-dot(d1, d1) / 0.03);
    float nearK0 = clamp(14.0 / c0.w, 0.4, 1.6), nearK1 = clamp(14.0 / c1.w, 0.4, 1.6);
    float isStrand = step(2.5, aStyle.w); // flag 3: a web the Arrival's figure shoots
    float isThread = step(1.5, aStyle.w) - isStrand; // flag 2: the gallery's thread
    float fixedEnds = step(1.5, aStyle.w); // both must stay put
    n0 += normalize(d0 + 1e-5) / asp * f0 * 0.014 * uPointerAmt * nearK0 * (1.0 - fixedEnds);
    n1 += normalize(d1 + 1e-5) / asp * f1 * 0.014 * uPointerAmt * nearK1 * (1.0 - fixedEnds);

    vec2 s0 = (n0 * 0.5 + 0.5) * uRes, s1 = (n1 * 0.5 + 0.5) * uRes;
    vec2 dir = s1 - s0; float dl = length(dir); dir = dl > 1e-4 ? dir / dl : vec2(1.0, 0.0);
    vec2 nrm = vec2(-dir.y, dir.x);

    float soft = aStyle.z;
    float wDev = aStyle.x * uDpr;                    // width in device pixels
    float core = max(wDev, 1.0) * 0.5;               // never thinner than one device pixel...
    float hw = core + 1.0 + soft * wDev;             // ...plus an anti-alias / defocus fringe
    vec2 s = mix(s0, s1, along) + nrm * side * hw + dir * (along * 2.0 - 1.0) * 0.5;
    float w = mix(c0.w, c1.w, along);
    float z = mix(c0.z / c0.w, c1.z / c1.w, along);
    gl_Position = vec4((s / uRes * 2.0 - 1.0) * w, z * w, w);

    vT = mix(aT.x, aT.y, along);
    vProg = clamp((uTime - aTime.x) / aTime.y, 0.0, 1.0);
    vDist = side * hw; vHalf = hw; vCore = core; vSoft = soft;
    vCover = clamp(wDev, 0.3, 1.0); // a thread thinner than a pixel covers only part of it

    // light: tangent-based, like a fibre
    vec3 P = mix(aStart, aEnd, along);
    vec3 T = normalize(aEnd - aStart + 1e-6);
    vec3 V = normalize(uCam - P);
    vec3 Lk = normalize(vec3(-0.55, 0.7, 0.55));     // neutral key, upper left
    vec3 Lr = normalize(vec3(0.65, 0.2, -0.75));     // crimson rim, from behind
    vec3 silver = mix(vec3(0.60, 0.62, 0.66), vec3(0.74, 0.74, 0.76), uVerse);
    vec3 crimson = mix(vec3(0.78, 0.09, 0.11), vec3(0.92, 0.14, 0.17), uVerse);
    float spk = fibre(T, Lk, V, 56.0), spr = fibre(T, Lr, V, 22.0);
    // mostly dim charcoal silk; the fibre glints carry it
    vec3 col = silver * (0.06 + 0.1 * wrap(T, Lk)) + vec3(0.95, 0.94, 0.92) * spk * 0.62 + crimson * (spr * 0.3 + wrap(T, Lr) * 0.012);

    // construction tip, travelling light pulses, anchor hover, pointer catch-light
    float tip = vProg < 1.0 ? exp(-pow(vProg - vT, 2.0) / 0.0012) : 0.0;
    float pulse = 0.0;
    for (int i = 0; i < ${MAX_PULSES}; i++) {
      float age = uTime - uPulse[i].w;
      if (age > 0.0 && age < ${PULSE_LIFE.toFixed(1)}) {
        float r = age * ${PULSE_SPEED.toFixed(1)};
        float d = distance(P, uPulse[i].xyz);
        pulse += exp(-pow(d - r, 2.0) / 0.22) * (1.0 - age / ${PULSE_LIFE.toFixed(1)}) * exp(-d * 0.06);
      }
    }
    float hover = uHover.w * exp(-pow(distance(P, uHover.xyz), 2.0) / 2.2);
    float catchL = mix(f0, f1, along) * uPointerAmt;
    col += vec3(0.92, 0.9, 0.86) * (tip * 0.9 + pulse * 0.75 + hover * 0.45 + catchL * 0.3) + crimson * pulse * 0.22;

    // depth: far threads fade toward black
    float depth = clamp(1.0 - (w - 9.0) / 22.0, 0.22, 1.0);
    // the Arrival: the web is in the dark, and a searchlight crossing a thread lights it
    vec3 beamCol = vec3(0.0);
    if (uBeamAmt.x + uBeamAmt.y + uBeamAmt.z > 0.001) {
      vec2 pn = mix(n0, n1, along) * vec2(uRes.x / uRes.y, 1.0);
      for (int i = 0; i < 3; i++) {
        vec2 bd = pn - uBeam[i].xy;
        float bs = dot(bd, uBeam[i].zw), bq = bd.x * uBeam[i].w - bd.y * uBeam[i].z;
        float bw = uBeamW[i] * (1.0 + max(bs, 0.0) * 0.55);
        float b = uBeamAmt[i] * exp(-bq * bq / (bw * bw)) * smoothstep(0.0, 0.2, bs);
        beamCol += (i == 2 ? crimson : vec3(0.86, 0.88, 0.94)) * b;
      }
      beamCol *= 0.3 + spk * 2.2 + wrap(T, Lk) * 0.25;
    }
    // the web dims as the page scrolls into the work; the thread is plain crimson silk
    vColor = mix(mix((col * uLift + beamCol) * aStyle.y * depth * uFade, crimson * (0.82 + tip * 0.5) * uThread * uLift, isThread), vec3(0.86, 0.87, 0.9) * aStyle.y, isStrand);
  }
`;

const threadFrag = /* glsl */ `
  varying float vT; varying float vProg; varying float vDist; varying float vHalf; varying float vCore;
  varying vec3 vColor; varying float vSoft; varying float vCover;
  void main() {
    if (vT > vProg + 1e-4) discard;
    float d = abs(vDist);
    float sharp = clamp(vCore + 0.5 - d, 0.0, 1.0);
    float soft = 1.0 - smoothstep(0.0, vHalf, d);
    float a = mix(sharp * vCover, soft * soft, vSoft);
    vec3 c = vColor * a;
    gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
  }
`;

const pointVert = /* glsl */ `
  attribute float aKind; // 0 = hub, 1 = anchor
  attribute float aIndex;
  uniform float uDpr; uniform float uTime; uniform float uHoverIndex; uniform vec4 uFlash; uniform float uFlash4;
  uniform float uHubGlow; uniform float uPointFade;
  varying float vAlpha; varying float vRing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float flash = aIndex < 0.5 ? uFlash.x : aIndex < 1.5 ? uFlash.y : aIndex < 2.5 ? uFlash.z : aIndex < 3.5 ? uFlash.w : uFlash4;
    float hov = abs(aIndex - uHoverIndex) < 0.5 ? 1.0 : 0.0;
    float hubGlow = aIndex < 1.5 ? uHubGlow * (aIndex < 0.5 ? 1.0 : 0.6) : 0.0;
    vAlpha = clamp(hov * 0.9 + flash + hubGlow, 0.0, 1.4) * uPointFade;
    vRing = hov;
    gl_PointSize = (10.0 + hov * 12.0 + flash * 16.0 + hubGlow * 10.0) * uDpr;
  }
`;

const pointFrag = /* glsl */ `
  varying float vAlpha; varying float vRing;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p);
    if (r > 1.0) discard;
    float core = exp(-r * r * 22.0);
    float ring = vRing * smoothstep(0.08, 0.0, abs(r - 0.72)) * 0.6;
    float a = (core + ring) * vAlpha;
    vec3 c = vec3(0.95, 0.93, 0.9) * a;
    gl_FragColor = vec4(c, a);
  }
`;

export type HeroWebHandle = { dispose: () => void };

export function createHeroWeb(canvas: HTMLCanvasElement, host: HTMLElement, opts: { reducedMotion: boolean; built?: boolean; verse: () => boolean; startAt: number; arrival?: boolean }): HeroWebHandle | null {
  let renderer: THREE.WebGLRenderer;
  const coarse = matchMedia("(pointer: coarse)").matches;
  // ask quietly first: no WebGL2 (or only a slow software one) means no scene, and no console noise
  {
    const probe = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!probe) return null;
    probe.getExtension("WEBGL_lose_context")?.loseContext();
  }
  try {
    // "default", not "high-performance": on dual-GPU Macs the latter switches to the discrete GPU
    // and blocks the main thread for about a second, mid-intro. The scene holds 60 fps either way.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "default", failIfMajorPerformanceCaveat: true });
  } catch {
    return null; // no WebGL: the hero simply stays as it was
  }
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(...LOOK);

  // shared quad: x = along (0..1), y = side (-1..1)
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);

  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: 1 },
    uTime: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uPointer: { value: new THREE.Vector2(9, 9) },
    uPointerAmt: { value: 0 },
    uPulse: { value: Array.from({ length: MAX_PULSES }, () => new THREE.Vector4(0, 0, 0, -99)) },
    uHover: { value: new THREE.Vector4(0, 0, 0, 0) },
    uVerse: { value: 0 },
    uFade: { value: 1 },
    uThread: { value: 1 },
    uBeam: { value: Array.from({ length: 3 }, () => new THREE.Vector4()) },
    uBeamW: { value: new THREE.Vector3() },
    uBeamAmt: { value: new THREE.Vector3() },
    uLift: { value: 1 },
  };
  const blend = { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor } as const;
  const threadMat = new THREE.ShaderMaterial({ vertexShader: threadVert, fragmentShader: threadFrag, uniforms, transparent: true, depthTest: false, depthWrite: false, ...blend });
  // the web lives in a group, so scrolling can tilt it back without rebuilding anything
  const web = new THREE.Group();
  scene.add(web);
  const threads = new THREE.Mesh(quad, threadMat);
  threads.frustumCulled = false;
  web.add(threads);

  // the gallery's thread: its own few segments (same quad, same shader), in world space
  const SEG = 28;
  const strand = new THREE.InstancedBufferGeometry();
  strand.setAttribute("position", quad.getAttribute("position"));
  strand.setIndex(quad.getIndex());
  const sStart = new THREE.InstancedBufferAttribute(new Float32Array(SEG * 3), 3);
  const sEnd = new THREE.InstancedBufferAttribute(new Float32Array(SEG * 3), 3);
  const sT = new Float32Array(SEG * 2), sTime = new Float32Array(SEG * 2), sStyle = new Float32Array(SEG * 4);
  for (let i = 0; i < SEG; i++) {
    sT.set([i / SEG, (i + 1) / SEG], i * 2);
    sStyle.set([1, 1, 0, 2], i * 4); // 1 css px, full brightness, sharp, flag 2 = the thread
  }
  const sTimeAttr = new THREE.InstancedBufferAttribute(sTime, 2);
  strand.setAttribute("aStart", sStart);
  strand.setAttribute("aEnd", sEnd);
  strand.setAttribute("aT", new THREE.InstancedBufferAttribute(sT, 2));
  strand.setAttribute("aTime", sTimeAttr);
  strand.setAttribute("aStyle", new THREE.InstancedBufferAttribute(sStyle, 4));
  strand.instanceCount = SEG;
  const thread = new THREE.Mesh(strand, threadMat);
  thread.frustumCulled = false;
  thread.visible = false;
  scene.add(thread);

  const pointUniforms = {
    uDpr: uniforms.uDpr,
    uTime: uniforms.uTime,
    uHoverIndex: { value: -1 },
    uFlash: { value: new THREE.Vector4() },
    uFlash4: { value: 0 },
    uHubGlow: { value: 0 },
    uPointFade: { value: 1 },
  };
  const pointGeo = new THREE.BufferGeometry();
  const pointMat = new THREE.ShaderMaterial({ vertexShader: pointVert, fragmentShader: pointFrag, uniforms: pointUniforms, transparent: true, depthTest: false, depthWrite: false, ...blend });
  const points = new THREE.Points(pointGeo, pointMat);
  points.frustumCulled = false;
  web.add(points);

  // ---- layout: build (and rebuild on a real change of shape) ----
  let data: WebData | null = null;
  let layoutKey = "";
  let W = 1, H = 1, dpr = 1;
  const ray = new THREE.Vector3();
  const at = (sx: number, sy: number, z: number): V3 => {
    // screen fraction -> world point on the plane z, from the camera's resting position
    ray.set(sx * 2 - 1, 1 - sy * 2, 0.5).unproject(camera).sub(camera.position).normalize();
    const k = (z - camera.position.z) / ray.z;
    return [camera.position.x + ray.x * k, camera.position.y + ray.y * k, z];
  };
  const resize = () => {
    const pw = W, ph = H;
    W = Math.max(1, canvas.clientWidth);
    H = Math.max(1, canvas.clientHeight);
    // the sequence is framed for one screen: a new size ends it
    if (arrival && (pw !== W || ph !== H)) endArrival(true);
    dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.position.set(0, 0, CAM_Z);
    camera.lookAt(...LOOK);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    uniforms.uRes.value.set(W * dpr, H * dpr);
    uniforms.uDpr.value = dpr;
    const mobile = W / H < 0.85 || W < 640;
    const key = `${mobile}:${(W / H).toFixed(1)}`;
    if (key !== layoutKey) {
      layoutKey = key;
      data = buildWeb({ at, mobile });
      const d = data;
      quad.setAttribute("aStart", new THREE.InstancedBufferAttribute(d.start, 3));
      quad.setAttribute("aEnd", new THREE.InstancedBufferAttribute(d.end, 3));
      quad.setAttribute("aT", new THREE.InstancedBufferAttribute(d.t, 2));
      quad.setAttribute("aTime", new THREE.InstancedBufferAttribute(d.time, 2));
      quad.setAttribute("aStyle", new THREE.InstancedBufferAttribute(d.style, 4));
      quad.instanceCount = d.count;
      // the thread follows the web: it starts as the last threads finish
      for (let i = 0; i < SEG; i++) sTime.set([d.buildEnd - 0.25, 0.9], i * 2);
      sTimeAttr.needsUpdate = true;
      setAnchorPoints();
      chooseAnchors();
    }
  };
  function setAnchorPoints() {
    const pts = data ? data.anchors : [];
    pointGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts.flat()), 3));
    pointGeo.setAttribute("aIndex", new THREE.BufferAttribute(new Float32Array(pts.map((_, i) => i)), 1));
    pointGeo.setAttribute("aKind", new THREE.BufferAttribute(new Float32Array(pts.map((_, i) => (i < 2 ? 0 : 1))), 1));
  }
  /**
   * Anchors are the hubs plus the junctions that are really visible here: on screen, not behind
   * his figure (silhouette mask), not under any text or control, spread apart (farthest-first).
   */
  function chooseAnchors() {
    if (!data || !sil) return;
    // in the hero's own frame, with the web at rest (the canvas and the hero coincide at the top)
    const r = host.getBoundingClientRect();
    const want = coarse || W < 640 ? 4 : 5;
    const minGap = Math.min(W, H) * 0.18;
    // text and controls (rects, padded): many sit in pointer-events:none layers, so hit-testing
    // would see through them
    const pad = 18;
    const blockers = [...host.querySelectorAll<HTMLElement>("h1,p,a,button"), ...document.querySelectorAll<HTMLElement>("[data-site-nav]")]
      .map((el) => el.getBoundingClientRect())
      .filter((b) => b.width > 0 && b.height > 0 && !(b.width > W * 0.9 && b.height > H * 0.9));
    const usable = (p: V3) => {
      ray.set(p[0], p[1], p[2]).project(camera);
      const x = (ray.x * 0.5 + 0.5) * W, y = (1 - (ray.y * 0.5 + 0.5)) * H;
      if (x < 28 || y < 90 || x > W - 28 || y > H - 40) return null;
      const cx = r.left + x, cy = r.top + y;
      if (occluded(cx, cy)) return null;
      // desktop: keep anchors outside the reticle ring, away from his face (phones have no room)
      if (frame0 && !(coarse || W < 640)) {
        const b = frame0.getBoundingClientRect();
        const rx = b.left + b.width * 0.5, ry = b.top + b.height * (372 / 1018), rr = b.width * (318 / 771) + 24;
        if (Math.hypot(cx - rx, cy - ry) < rr) return null;
      }
      if (blockers.some((b) => cx > b.left - pad && cx < b.right + pad && cy > b.top - pad && cy < b.bottom + pad)) return null;
      return [x, y] as const;
    };
    const chosen: { p: V3; s: readonly [number, number] }[] = [];
    for (const h of data.hubs) { const s = usable(h); if (s) chosen.push({ p: h, s }); }
    const pool = data.junctions.map((p) => ({ p, s: usable(p) })).filter((c): c is { p: V3; s: readonly [number, number] } => !!c.s);
    while (chosen.length < want && pool.length) {
      let bi = -1, bd = -1;
      pool.forEach((c, i) => {
        const d = Math.min(...chosen.map((k) => Math.hypot(k.s[0] - c.s[0], k.s[1] - c.s[1])), Infinity);
        if (d > bd) { bd = d; bi = i; }
      });
      if (bi < 0 || bd < minGap) break;
      chosen.push(pool.splice(bi, 1)[0]);
    }
    data.anchors = chosen.map((c) => c.p);
    setAnchorPoints();
    kick();
  }

  // ---- time and state ----
  const t0 = performance.now() / 1000;
  const startDelay = Math.max(0, opts.startAt - performance.now()) / 1000; // let the portrait arrive first
  // the Arrival plays over a finished web (it stays dark until the searchlights find it)
  const skip = opts.reducedMotion || !!opts.built || !!opts.arrival;
  let built = skip;
  let buildT = skip ? 99 : 0; // seconds into the construction
  let constructionPulsed = skip;
  let pulseSlot = 0;
  const camTarget = new THREE.Vector2(), camNow = new THREE.Vector2();
  let pointerAmt = 0, pointerTarget = 0;
  let hoverIndex = -1, hoverAmt = 0;
  const flash = [0, 0, 0, 0, 0]; // one per anchor (desktop 5, phones 4)
  let visible = true;
  let raf = 0, last = 0;
  // scroll: p = how many hero heights the page has scrolled; leave = the web fading out once the
  // sticky canvas starts to scroll away with the end of the work (its soft lower edge, in CSS,
  // means it never shows a line)
  let scrollP = 0, leave = 0;
  const layer = canvas.parentElement!;
  const sm = (a: number, b: number, v: number) => { const x = Math.min(1, Math.max(0, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
  // Page positions are measured once (and again on any resize), then derived from the scroll
  // position each frame: reading layout every frame forces the browser to lay the page out while
  // the gallery's animations are changing it, which costs whole frames.
  const doc = { heroTop: 0, heroH: 1, layerTop: 0, layerBottom: 1, nodeEl: null as HTMLElement | null, nodeLeft: 0, nodeTop: 0 };
  const measure = () => {
    const sx = window.scrollX, sy = window.scrollY;
    const hr = host.getBoundingClientRect(), lr = layer.getBoundingClientRect();
    doc.heroTop = hr.top + sy;
    doc.heroH = Math.max(1, hr.height);
    doc.layerTop = lr.top + sy;
    doc.layerBottom = lr.bottom + sy;
    const n = railNode.get();
    doc.nodeEl = n && n.el.isConnected ? n.el : null;
    if (doc.nodeEl) {
      const er = doc.nodeEl.getBoundingClientRect();
      doc.nodeLeft = er.left + sx;
      doc.nodeTop = er.top + sy;
    }
  };
  const readScroll = () => {
    const sy = window.scrollY;
    scrollP = Math.max(0, (sy - doc.heroTop) / doc.heroH);
    const vh = window.innerHeight;
    const gone = vh - (doc.layerBottom - sy); // how far the canvas has scrolled away
    leave = sm(0, 0.4 * vh, gone);
    const edge = `${(Math.min(1, Math.max(0, gone / (0.25 * vh))) * 25).toFixed(1)}%`;
    if (canvas.style.getPropertyValue("--edge") !== edge) canvas.style.setProperty("--edge", edge);
  };
  const tv = new THREE.Vector3(), tw = new THREE.Vector3();
  /** Draw the thread from the near web to the rail's centre node (or hide it). */
  const placeThread = () => {
    const n = railNode.get();
    if (!data || !n || !n.el.isConnected || uniforms.uThread.value < 0.002) { thread.visible = false; return; }
    if (n.el !== doc.nodeEl) measure();
    const y0 = window.scrollY;
    // the sticky canvas: pinned at the top until the end of its layer pushes it up
    const canvasTop = Math.max(doc.layerTop - y0, Math.min(0, doc.layerBottom - y0 - H));
    const sx = (doc.nodeLeft - window.scrollX + n.x) / W, sy = (doc.nodeTop - y0 + n.y - canvasTop) / H;
    tv.set(...data.threadFrom).applyMatrix4(web.matrixWorld);
    ray.set(sx * 2 - 1, 1 - sy * 2, 0.5).unproject(camera).sub(camera.position).normalize();
    const k = (tv.z - camera.position.z) / ray.z;
    tw.copy(camera.position).addScaledVector(ray, k);
    const L = tv.distanceTo(tw);
    const a = sStart.array as Float32Array, b = sEnd.array as Float32Array;
    const pt = (u: number, o: Float32Array, j: number) => {
      o[j] = tv.x + (tw.x - tv.x) * u;
      o[j + 1] = tv.y + (tw.y - tv.y) * u - Math.sin(Math.PI * u) * 0.012 * L; // a little sag
      o[j + 2] = tv.z + (tw.z - tv.z) * u;
    };
    for (let i = 0; i < SEG; i++) { pt(i / SEG, a, i * 3); pt((i + 1) / SEG, b, i * 3); }
    sStart.needsUpdate = true;
    sEnd.needsUpdate = true;
    thread.visible = true;
  };
  const stats = { frames: 0, slow: 0, worst: 0, sum: 0, dts: [] as number[] };

  const firePulse = (p: V3, t: number) => {
    uniforms.uPulse.value[pulseSlot].set(p[0], p[1], p[2], t);
    pulseSlot = (pulseSlot + 1) % MAX_PULSES;
  };
  const pulsesActive = (t: number) => uniforms.uPulse.value.some((v) => t - v.w < PULSE_LIFE);

  // ---- the Arrival (arrival.ts): the opening sequence, once per visit, in this scene and loop ----
  let arrival: Arrival | null = null;
  let arrT = 0, arrSlow = 0, arrFrames = 0, arrHeld = false, arrReady = false;
  const NO_CAM = new THREE.Vector3();
  const setArrivalState = (st: "play" | "reveal" | "done") => {
    if (document.documentElement.dataset.arrival !== st) document.documentElement.dataset.arrival = st;
    window.dispatchEvent(new CustomEvent("swing-shift:arrival-state", { detail: st }));
  };
  const hooks: ArrivalHooks = {
    nudge: (x, y, amt) => { uniforms.uPointer.value.set(x, y); pointerTarget = amt; },
    pulse: (p) => firePulse(p, buildT),
    dom: setArrivalState,
    unmask: (snap) => window.dispatchEvent(new CustomEvent("swing-shift:unmask", { detail: { snap } })),
  };
  const startArrival = () => {
    const fr = host.querySelector<HTMLElement>(".portrait-frame");
    if (!data || !fr) return false;
    const pr = fr.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    arrival = createArrival({
      scene, camera, at, W, H, mobile: W / H < 0.85 || W < 640, camZ: CAM_Z, threadMat,
      quadPos: quad.getAttribute("position") as THREE.BufferAttribute, quadIndex: quad.getIndex()!,
      portrait: { x: pr.left - cr.left, y: pr.top - cr.top, w: pr.width, h: pr.height }, hooks,
    });
    arrT = 0; arrSlow = 0; arrFrames = 0; arrHeld = false; arrReady = false;
    (window as unknown as { __arrivalStarted?: boolean }).__arrivalStarted = true;
    setArrivalState("play");
    // its four shaders compile in parallel first (KHR_parallel_shader_compile where available), so
    // the first frame of the sequence never stalls on them; the sequence starts when they are ready
    const a = arrival;
    const go = () => { if (arrival !== a) return; arrReady = true; a.setVisible(true); kick(); };
    a.warm(renderer);
    renderer.compileAsync(scene, camera).then(go, go);
    a.setVisible(false);
    return true;
  };
  /** Ends the sequence; skipped = straight to the finished hero (portrait lit, face revealed). */
  const endArrival = (skipped: boolean) => {
    if (!arrival) return;
    arrival.dispose();
    arrival = null;
    uniforms.uLift.value = 1;
    uniforms.uBeamAmt.value.set(0, 0, 0);
    if (skipped) { setArrivalState("done"); hooks.unmask(true); }
    kick();
  };

  const frame = (now: number) => {
    raf = 0;
    const tNow = now / 1000;
    const dt = Math.min(0.05, last ? tNow - last : 1 / 60);
    if (last) {
      const ms = (tNow - last) * 1000;
      stats.frames++; stats.sum += ms; stats.worst = Math.max(stats.worst, ms); if (ms > 20) stats.slow++; if (stats.dts.length < 900) stats.dts.push(ms);
    }
    last = tNow;
    const sceneT = tNow - t0 - startDelay;
    if (!built) {
      buildT = Math.max(0, sceneT);
      if (data && !constructionPulsed && buildT > data.buildEnd - 0.9) {
        constructionPulsed = true;
        firePulse(data.hubs[0], buildT);
        firePulse(data.hubs[1], buildT + 0.35);
      }
      if (data && buildT > data.buildEnd + 0.05) built = true;
    } else if (!opts.reducedMotion) buildT += dt;
    uniforms.uTime.value = buildT;

    // the Arrival: scrolling away or a device that can't keep up goes straight to the end
    if (arrival && !arrHeld && arrReady) {
      arrFrames++;
      if (arrFrames > 6 && arrFrames < 60 && dt > 0.045) arrSlow++;
      if (scrollP > 0.12 || arrSlow > 12) endArrival(true);
    }
    if (arrival && arrReady) {
      if (!arrHeld) arrT += dt;
      const running = arrival.update(arrT, dpr);
      const ao = arrival.out;
      for (let i = 0; i < 3; i++) uniforms.uBeam.value[i].copy(ao.beamNdc[i]);
      uniforms.uBeamW.value.copy(ao.beamW);
      uniforms.uBeamAmt.value.copy(ao.beamAmt);
      uniforms.uLift.value = ao.lift;
      if (!running) endArrival(false);
    }
    const ac = arrival ? arrival.out.cam : NO_CAM;

    // the first point: brightens beside his head, then settles to a faint star
    const g = skip ? 0.12 : buildT < 0.15 ? 0 : buildT < 0.7 ? (buildT - 0.15) / 0.55 : Math.max(0.12, 1 - (buildT - 0.7) * 0.6);
    pointUniforms.uHubGlow.value = g;

    // camera parallax (eased); pointer tension (eased); hover and flashes (decay)
    const k = 1 - Math.exp(-dt * 4);
    camNow.x += (camTarget.x - camNow.x) * k;
    camNow.y += (camTarget.y - camNow.y) * k;
    camera.position.set(camNow.x * 0.55 + ac.x, camNow.y * 0.35 + ac.y, CAM_Z + ac.z);
    camera.lookAt(LOOK[0] + ac.x * 0.5, LOOK[1] + ac.y * 0.5, LOOK[2]);
    camera.updateMatrixWorld();
    uniforms.uCam.value.copy(camera.position);

    // scrolling into the work: the web tilts back, rises and dims; the thread brightens a little.
    // Under reduced motion it only dims.
    const e = sm(0.12, 0.95, scrollP), tilt = opts.reducedMotion ? 0 : e;
    const drift = opts.reducedMotion ? 0 : Math.min(1.5, Math.max(0, scrollP - 0.95) * 1.4); // keeps rising, slowly
    web.position.set(-0.9 * tilt, 2.9 * tilt + drift, -2 * tilt);
    web.rotation.x = -0.35 * tilt;
    web.updateMatrixWorld();
    uniforms.uFade.value = (1 - 0.66 * e) * (1 - leave);
    uniforms.uThread.value = (0.45 + 0.55 * sm(0, 0.25, scrollP)) * (1 - leave);
    pointUniforms.uPointFade.value = (1 - sm(0.05, 0.3, scrollP)) * (1 - leave) * uniforms.uLift.value;
    placeThread();
    pointerAmt += (pointerTarget - pointerAmt) * (1 - Math.exp(-dt * 6));
    pointerTarget *= Math.exp(-dt * 1.6); // the web relaxes when the pointer rests
    uniforms.uPointerAmt.value = pointerAmt;
    hoverAmt += ((hoverIndex >= 0 ? 1 : 0) - hoverAmt) * (1 - Math.exp(-dt * 8));
    uniforms.uHover.value.w = hoverAmt;
    for (let i = 0; i < 5; i++) flash[i] *= Math.exp(-dt * 2.2);
    pointUniforms.uFlash.value.set(flash[0], flash[1], flash[2], flash[3]);
    pointUniforms.uFlash4.value = flash[4];
    pointUniforms.uHoverIndex.value = hoverIndex;
    uniforms.uVerse.value = opts.verse() ? 1 : 0;

    if (arrival && arrReady) arrival.prerender(renderer, dpr);
    renderer.render(scene, camera);

    const moving =
      (!!arrival && !arrHeld && arrReady) ||
      !built ||
      pulsesActive(buildT) ||
      Math.abs(camTarget.x - camNow.x) + Math.abs(camTarget.y - camNow.y) > 1e-4 ||
      pointerAmt > 0.002 ||
      Math.abs(hoverAmt - (hoverIndex >= 0 ? 1 : 0)) > 0.002 ||
      flash.some((f) => f > 0.004) ||
      (g > 0.12 && g < 1);
    if (moving && visible && !document.hidden) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  const kick = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };

  // ---- input (listening on the hero, never blocking it) ----
  const anchorScreen = (i: number) => {
    const a = data!.anchors[i];
    ray.set(a[0], a[1], a[2]).applyMatrix4(web.matrixWorld).project(camera);
    return [(ray.x * 0.5 + 0.5) * W, (1 - (ray.y * 0.5 + 0.5)) * H];
  };
  // an anchor hidden behind his figure (or off screen) is not interactive: tapping his face
  // must reveal the face, not set off an invisible pulse. The test uses the same silhouette mask.
  let sil: { d: Uint8ClampedArray; w: number; h: number } | null = null;
  {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      const g = c.getContext("2d");
      if (!g) return;
      g.drawImage(im, 0, 0);
      sil = { d: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
      chooseAnchors();
    };
    im.src = "/portrait/silhouette.png";
  }
  const frame0 = host.querySelector<HTMLElement>(".portrait-frame");
  const occluded = (clientX: number, clientY: number) => {
    if (!frame0 || !sil) return false;
    const m = sil;
    const b = frame0.getBoundingClientRect();
    // the point and a ring 14 px round it: an anchor keeps clear of his outline
    for (let k = 0; k < 9; k++) {
      const a = (k / 8) * Math.PI * 2, rr = k === 8 ? 0 : 14;
      const fx = (clientX + Math.cos(a) * rr - b.left) / b.width, fy = (clientY + Math.sin(a) * rr - b.top) / b.height;
      if (fx < 0 || fy < 0 || fx >= 1 || fy >= 1) continue;
      if (m.d[(Math.floor(fy * m.h) * m.w + Math.floor(fx * m.w)) * 4 + 3] > 16) return true;
    }
    return false;
  };
  const pickAnchor = (cx: number, cy: number) => {
    if (!data || !built || scrollP > 0.3) return -1; // anchors belong to the hero
    const r = canvas.getBoundingClientRect();
    const x = cx - r.left, y = cy - r.top;
    let best = -1, bd = coarse ? 34 : 22;
    for (let i = 0; i < data.anchors.length; i++) {
      const [ax, ay] = anchorScreen(i);
      if (ax < 8 || ay < 8 || ax > W - 8 || ay > H - 8 || occluded(r.left + ax, r.top + ay)) continue;
      const d = Math.hypot(ax - x, ay - y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = 1 - ((e.clientY - r.top) / r.height) * 2;
    if (opts.reducedMotion) return;
    camTarget.set(nx, ny).multiplyScalar(e.pointerType === "touch" ? 0.5 : 1);
    uniforms.uPointer.value.set(nx, ny);
    pointerTarget = 1;
    if (e.pointerType !== "touch") {
      const h = pickAnchor(e.clientX, e.clientY);
      if (h !== hoverIndex) {
        hoverIndex = h;
        if (h >= 0) uniforms.uHover.value.set(data!.anchors[h][0], data!.anchors[h][1], data!.anchors[h][2], uniforms.uHover.value.w);
        host.style.cursor = h >= 0 ? "pointer" : "";
      }
    }
    kick();
  };
  const onLeave = () => {
    camTarget.set(0, 0);
    pointerTarget = 0;
    if (hoverIndex >= 0) { hoverIndex = -1; host.style.cursor = ""; }
    kick();
  };
  const pulseAt = (i: number) => {
    flash[i] = 1;
    if (!opts.reducedMotion) firePulse(data!.anchors[i], buildT);
    kick();
  };
  // capture phase: an anchor hit is consumed here, so the click doesn't also fire an SVG web
  let touchPulsedAt = -1e9;
  const onClick = (e: MouseEvent) => {
    const i = pickAnchor(e.clientX, e.clientY);
    if (i < 0) return;
    e.preventDefault();
    if (performance.now() - touchPulsedAt > 700) pulseAt(i); // a tap already pulsed it
  };
  // touch: a tap on an anchor must not also reach the portrait's tap-to-reveal underneath, so
  // the touch is stopped here, on its way down, and only when it starts on an anchor
  let touchAnchor = -1;
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchAnchor = t ? pickAnchor(t.clientX, t.clientY) : -1;
    if (touchAnchor >= 0) e.stopPropagation();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchAnchor < 0) return;
    e.stopPropagation();
    pulseAt(touchAnchor);
    touchPulsedAt = performance.now();
    touchAnchor = -1;
  };

  const io = new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible) kick();
  });
  const ro = new ResizeObserver(() => { resize(); measure(); readScroll(); kick(); });
  const onVis = () => { if (!document.hidden) kick(); };
  const onDim = () => kick();
  const onArrival = (e: Event) => {
    const cmd = (e as CustomEvent<string>).detail;
    if (cmd === "skip") endArrival(true);
    if (cmd === "replay" && !arrival && !opts.reducedMotion && scrollP < 0.12) {
      window.dispatchEvent(new CustomEvent("swing-shift:mask"));
      startArrival();
    }
  };
  const onScroll = () => { readScroll(); kick(); };
  const offRail = railNode.on(kick);

  resize();
  measure();
  readScroll();
  io.observe(canvas);
  ro.observe(canvas);
  ro.observe(host);
  ro.observe(layer); // anything above the gallery changing height changes the layer's height
  window.addEventListener("scroll", onScroll, { passive: true });
  document.documentElement.dataset.webThread = "1"; // the gallery hides its fallback thread
  host.addEventListener("pointermove", onMove, { passive: true });
  host.addEventListener("pointerdown", onMove, { passive: true });
  host.addEventListener("pointerleave", onLeave);
  host.addEventListener("click", onClick, true);
  host.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
  host.addEventListener("touchend", onTouchEnd, true);
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("swing-shift:dimension", onDim);
  window.addEventListener("swing-shift:arrival", onArrival);
  // read-only diagnostics for QA (frame timings, size, anchor positions)
  (window as unknown as { __heroWeb?: unknown }).__heroWeb = { stats, get segments() { return data?.count ?? 0; }, get dpr() { return dpr; }, anchors: () => (data ? data.anchors.map((_, i) => anchorScreen(i)) : []), thread: () => {
    if (!thread.visible) return null;
    const scr = (v: THREE.Vector3) => { const q = v.clone().project(camera); return [Math.round((q.x * 0.5 + 0.5) * W), Math.round((1 - (q.y * 0.5 + 0.5)) * H)]; };
    return { from: scr(tv), to: scr(tw), p: +scrollP.toFixed(3) };
  }, arrival: {
    get t() { return arrival ? arrT : -1; },
    get marks() { return arrival?.marks; },
    get probe() { return arrival ? { ...arrival.probe } : null; },
    /** QA: hold the sequence at time t (frame-by-frame review); play() resumes */
    seek(t: number) { if (!arrival) return false; arrT = t; arrHeld = true; kick(); return true; },
    play() { arrHeld = false; kick(); },
  } };
  if (opts.arrival && !opts.reducedMotion) { if (!startArrival()) setArrivalState("done"); }
  kick();

  return {
    dispose() {
      endArrival(true); // leaving the page mid-sequence must never leave the portrait dark
      window.removeEventListener("swing-shift:arrival", onArrival);
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("click", onClick, true);
      host.removeEventListener("touchstart", onTouchStart, true);
      host.removeEventListener("touchend", onTouchEnd, true);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("swing-shift:dimension", onDim);
      window.removeEventListener("scroll", onScroll);
      offRail();
      delete document.documentElement.dataset.webThread;
      host.style.cursor = "";
      quad.dispose();
      strand.dispose();
      pointGeo.dispose();
      threadMat.dispose();
      pointMat.dispose();
      renderer.dispose();
    },
  };
}
