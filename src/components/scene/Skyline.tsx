"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ComicEffect } from "./ComicEffect";

gsap.registerPlugin(ScrollTrigger);

/**
 * THE SKYLINE BEHIND THE WORK (lazy, loaded only near #work on screens ≥ 768 px).
 * A city of plain boxes drawn in code. Six taller buildings stand for the six projects, left to
 * right in the same order as the towers in front; the one you select lights up, and one web strand
 * from the near roof swings over and anchors on it. Moving the pointer across the strand plucks it.
 * Scrolling through the section dollies the camera.
 *   Earth-Prime: night. Crimson rim light from behind, warm late-shift windows, bloom, grain, vignette.
 *   The Verse:   flat toon shading re-inked by ComicEffect, and it renders on twos (12 fps).
 * Frames are only drawn while the section is on screen and the tab is visible. The context asks for
 * the default GPU: "high-performance" woke the discrete GPU on a dual-GPU MacBook (a ~1 s stall and
 * battery drain) for a scene the integrated one draws at 60 fps.
 */

export type SkylineProps = {
  active: number;
  verse: boolean;
  reduce: boolean;
  host: HTMLElement;
  visible: React.RefObject<boolean>;
  onReady: () => void;
};

type Bldg = { x: number; z: number; w: number; d: number; h: number; hero: number };

const NEAR = { x: 3.2, z: -5, w: 3.4, d: 3.2, h: 4.2 };
const ROPE_N = 30;

function buildCity(): { blds: Bldg[]; heroes: number[] } {
  let s = 11;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const blds: Bldg[] = [{ ...NEAR, hero: -1 }];
  for (let row = 0; row < 9; row++) {
    const z = -7 - row * 4.4;
    let x = -36 + r() * 2;
    while (x < 40) {
      const w = 1.6 + r() * 2.6, d = 1.8 + r() * 2.4;
      const h = 1.8 + r() * (3.2 + row * 1.35);
      const cx = x + w / 2;
      if (!(row === 0 && Math.abs(cx - NEAR.x) < 3)) blds.push({ x: cx, z: z - r() * 1.6, w, d, h, hero: -1 });
      x += w + 0.5 + r() * 1.5;
    }
  }
  // six project buildings, left to right like the towers in front, a little taller than their row
  const heroes: number[] = [];
  for (let k = 0; k < 6; k++) {
    const tx = 2.5 + k * 4.4, tz = -16 - (k % 2) * 3.5;
    let best = -1, bd = Infinity;
    blds.forEach((b, i) => {
      if (i === 0 || b.hero >= 0) return;
      const dd = Math.abs(b.x - tx) * 1.4 + Math.abs(b.z - tz);
      if (dd < bd) { bd = dd; best = i; }
    });
    const b = blds[best];
    b.hero = k;
    b.w = Math.max(b.w, 2.6);
    b.h = 9.5 + (k % 3) * 1.6;
    heroes.push(best);
  }
  return { blds, heroes };
}

const PRIME = {
  bg: "#000000",
  body: "#0c0c0f",
  unlit: new THREE.Color("#0f1013"),
  late: new THREE.Color("#ffc98a").multiplyScalar(0.7),
  on: new THREE.Color("#ff5a48").multiplyScalar(2.6),
  rope: "#ece7e2",
  ropeOn: "#e3262b",
};
const VERSE = {
  bg: "#040404",
  body: "#2c2c31",
  unlit: new THREE.Color("#101010"),
  late: new THREE.Color("#f4efe6"),
  on: new THREE.Color("#ffe600"),
  rope: "#ffffff",
  ropeOn: "#ffffff",
};

/** Where a strand anchors on a building: its roof, front-left corner. */
const roofOf = (b: Bldg) => new THREE.Vector3(b.x - b.w / 2 + 0.25, b.h, b.z + b.d / 2 - 0.2);

/** A verlet strand between two fixed ends, a little slack, with a breath of wind. */
class Rope {
  p: THREE.Vector3[];
  q: THREE.Vector3[];
  b = new THREE.Vector3();
  rest = 0;
  private out = new Array(ROPE_N * 3).fill(0);
  private tmp = new THREE.Vector3();
  constructor(public a: THREE.Vector3) {
    this.p = Array.from({ length: ROPE_N }, () => a.clone());
    this.q = this.p.map((v) => v.clone());
  }
  anchor(b: THREE.Vector3, settle: boolean) {
    const first = this.b.lengthSq() === 0;
    this.b.copy(b);
    if (first) this.p.forEach((v, i) => { v.copy(this.a).lerp(b, i / (ROPE_N - 1)); this.q[i].copy(v); });
    this.rest = (this.a.distanceTo(b) * 1.06) / (ROPE_N - 1);
    if (settle) for (let i = 0; i < 400; i++) this.step(1 / 60, -1);
  }
  /** t < 0: no wind */
  step(dt: number, t: number) {
    const g = -7.5 * dt * dt;
    for (let i = 1; i < ROPE_N - 1; i++) {
      const p = this.p[i], q = this.q[i];
      const vx = (p.x - q.x) * 0.985, vy = (p.y - q.y) * 0.985, vz = (p.z - q.z) * 0.985;
      q.copy(p);
      p.x += vx + (t >= 0 ? Math.sin(t * 0.9 + i * 0.3) * 0.0006 : 0);
      p.y += vy + g;
      p.z += vz + (t >= 0 ? Math.cos(t * 0.7 + i * 0.2) * 0.0004 : 0);
    }
    this.p[0].copy(this.a);
    this.p[ROPE_N - 1].copy(this.b);
    for (let it = 0; it < 18; it++) {
      for (let i = 0; i < ROPE_N - 1; i++) {
        const a = this.p[i], b = this.p[i + 1];
        this.tmp.subVectors(b, a);
        const d = this.tmp.length() || 1e-6;
        const diff = (d - this.rest) / d;
        const wa = i === 0 ? 0 : 0.5, wb = i + 1 === ROPE_N - 1 ? 0 : 0.5;
        const k = wa + wb || 1;
        a.addScaledVector(this.tmp, (diff * wa) / k);
        b.addScaledVector(this.tmp, (-diff * wb) / k);
      }
    }
  }
  flat() {
    this.p.forEach((v, i) => { this.out[i * 3] = v.x; this.out[i * 3 + 1] = v.y; this.out[i * 3 + 2] = v.z; });
    return this.out;
  }
}

/** The camera dollies in and down as the section scrolls past; the pointer leans it a little. */
function camPose(camera: THREE.Camera, look: THREE.Vector3, p: number, lx: number, ly: number) {
  camera.position.set(-1 + p * 2.4 + lx, 7.2 - p * 1.8 + ly, 21 - p * 5);
  camera.lookAt(look.set(5, 5.2 - p * 0.8, -20));
}

function toonRamp() {
  const t = new THREE.DataTexture(new Uint8Array([40, 40, 40, 255, 130, 130, 130, 255, 255, 255, 255, 255]), 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

function City({ active, verse, reduce, host }: Omit<SkylineProps, "visible" | "onReady">) {
  const { blds, heroes } = useMemo(() => buildCity(), []);
  const ramp = useMemo(() => toonRamp(), []);
  const pal = verse ? VERSE : PRIME;

  // buildings: one instanced box
  const body = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = body.current!, o = new THREE.Object3D();
    blds.forEach((b, i) => {
      o.position.set(b.x, b.h / 2, b.z);
      o.scale.set(b.w, b.h, b.d);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [blds]);

  // windows on the street-facing side
  const win = useMemo(() => {
    let s = 5;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const list: { x: number; y: number; z: number; owner: number; late: boolean }[] = [];
    blds.forEach((b, i) => {
      const cols = Math.max(1, Math.floor((b.w - 0.3) / 0.52));
      const rows = Math.max(1, Math.floor((b.h - 0.6) / 0.72));
      for (let c = 0; c < cols; c++)
        for (let rr = 0; rr < rows; rr++) {
          const x = b.x - ((cols - 1) * 0.52) / 2 + c * 0.52;
          list.push({ x, y: 0.55 + rr * 0.72, z: b.z + b.d / 2 + 0.01, owner: i, late: r() < 0.09 });
        }
    });
    return list;
  }, [blds]);
  const glass = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = glass.current!, o = new THREE.Object3D();
    win.forEach((w, i) => {
      o.position.set(w.x, w.y, w.z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [win]);

  // light: each project building eases between dark and lit
  const level = useRef(new Float32Array(6));
  const paint = (all: boolean) => {
    const m = glass.current!;
    const c = new THREE.Color();
    win.forEach((w, i) => {
      const hero = blds[w.owner].hero;
      if (!all && hero < 0) return;
      const base = w.late ? pal.late : pal.unlit;
      if (hero >= 0) c.copy(base).lerp(pal.on, level.current[hero]);
      else c.copy(base);
      m.setColorAt(i, c);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  };
  useLayoutEffect(() => {
    if (reduce) level.current.forEach((_, k) => (level.current[k] = k === active ? 1 : 0));
    paint(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- repaint on a new palette
  }, [win, verse]);

  // the strand: verlet rope from the near roof to the selected building's roof
  const line = useRef<{ geometry: { setPositions: (a: number[]) => void } }>(null);
  const A = useMemo(() => new THREE.Vector3(NEAR.x + NEAR.w / 2 - 0.2, NEAR.h, NEAR.z + NEAR.d / 2 - 0.3), []);
  const initialPoints = useMemo(() => {
    const b = roofOf(blds[heroes[0]]);
    return Array.from({ length: ROPE_N }, (_, i) => A.clone().lerp(b, i / (ROPE_N - 1)));
  }, [A, blds, heroes]);
  const ropeRef = useRef<Rope | null>(null);
  const pushLine = () => ropeRef.current && line.current?.geometry.setPositions(ropeRef.current.flat());
  useLayoutEffect(() => {
    const first = !ropeRef.current;
    ropeRef.current ??= new Rope(A);
    ropeRef.current.anchor(roofOf(blds[heroes[active]]), reduce || first);
    pushLine();
    if (reduce) {
      level.current.forEach((_, k) => (level.current[k] = k === active ? 1 : 0));
      paint(false);
      pushLine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-anchor on a new selection
  }, [active, reduce]);

  // pointer: pluck the strand and lean the camera a little
  const { camera, size, invalidate } = useThree();
  const ptr = useRef({ x: 0, y: 0, nx: 0, ny: 0, vx: 0, vy: 0, live: false });
  useEffect(() => {
    let lx = 0, ly = 0;
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const P = ptr.current;
      P.vx = e.clientX - lx; P.vy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      P.x = e.clientX - r.left; P.y = e.clientY - r.top;
      P.nx = (e.clientX / innerWidth) * 2 - 1; P.ny = (e.clientY / innerHeight) * 2 - 1;
      P.live = true;
    };
    const leave = () => (ptr.current.live = false);
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, [host]);

  // scroll: dolly through the section
  const prog = useRef(0.5);
  useEffect(() => {
    if (reduce) return;
    const st = ScrollTrigger.create({ trigger: host, start: "top bottom", end: "bottom top", onUpdate: (s) => { prog.current = s.progress; } });
    prog.current = st.progress;
    return () => st.kill();
  }, [host, reduce]);

  const look = useMemo(() => new THREE.Vector3(), []);
  const lean = useRef({ x: 0, y: 0 });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useLayoutEffect(() => {
    const p = prog.current;
    camPose(camera, look, p, 0, 0);
    invalidate();
  }, [camera, look, invalidate, size]);

  useFrame((_, delta) => {
    const rope = ropeRef.current;
    if (reduce || !rope) return;
    const dt = Math.min(delta, 0.1);
    // camera
    const P = ptr.current;
    lean.current.x += ((P.live ? P.nx : 0) * 0.5 - lean.current.x) * Math.min(1, dt * 2.5);
    lean.current.y += ((P.live ? -P.ny : 0) * 0.25 - lean.current.y) * Math.min(1, dt * 2.5);
    const p = prog.current;
    camPose(camera, look, p, lean.current.x, lean.current.y);

    // windows ease toward the selection
    let changed = false;
    for (let k = 0; k < 6; k++) {
      const goal = k === active ? 1 : 0;
      const v = level.current[k];
      if (Math.abs(goal - v) > 0.002) {
        level.current[k] = v + (goal - v) * Math.min(1, dt * (verse ? 9 : 3.2));
        changed = true;
      }
    }
    if (changed) paint(false);

    // pluck: rope points near the pointer (in screen space) take its motion
    const r = rope;
    if (P.live && (P.vx || P.vy)) {
      const ppu = size.height / (2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)));
      for (let i = 1; i < ROPE_N - 1; i++) {
        tmp.copy(r.p[i]).project(camera);
        const sx = (tmp.x * 0.5 + 0.5) * size.width, sy = (-tmp.y * 0.5 + 0.5) * size.height;
        const dd = Math.hypot(sx - P.x, sy - P.y);
        if (dd < 46) {
          const depth = camera.position.distanceTo(r.p[i]);
          const f = (1 - dd / 46) * (depth / ppu) * 0.55;
          r.q[i].x -= P.vx * f;
          r.q[i].y += P.vy * f;
        }
      }
      P.vx = P.vy = 0;
    }
    const n = Math.min(6, Math.max(1, Math.round(dt * 60)));
    for (let i = 0; i < n; i++) rope.step(dt / n, performance.now() / 1000);
    pushLine();
  });

  return (
    <>
      <color attach="background" args={[pal.bg]} />
      <fog attach="fog" args={[pal.bg, verse ? 26 : 22, verse ? 84 : 74]} />
      {verse ? (
        <>
          <ambientLight intensity={0.25} />
          <directionalLight position={[10, 14, 9]} intensity={0.9} />
          <directionalLight position={[-14, 6, -6]} intensity={3.4} color="#e3262b" />
        </>
      ) : (
        <>
          <ambientLight intensity={0.12} color="#22242c" />
          <directionalLight position={[-6, 14, -30]} intensity={1.15} color="#e3262b" />
          <directionalLight position={[9, 7, 12]} intensity={0.18} color="#6f7c9c" />
        </>
      )}
      <instancedMesh ref={body} args={[undefined, undefined, blds.length]} frustumCulled={false}>
        <boxGeometry />
        {verse ? <meshToonMaterial color={pal.body} gradientMap={ramp} /> : <meshStandardMaterial color={pal.body} roughness={0.88} metalness={0} />}
      </instancedMesh>
      <instancedMesh ref={glass} args={[undefined, undefined, win.length]} frustumCulled={false}>
        <planeGeometry args={[0.24, 0.36]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color={pal.bg} />
      </mesh>
      <Line
        ref={line as never}
        points={initialPoints}
        color={verse ? pal.rope : pal.ropeOn}
        lineWidth={verse ? 3 : 1.4}
        transparent={!verse}
        opacity={verse ? 1 : 0.85}
      />
    </>
  );
}

/**
 * Drives the frames: every tick in Earth-Prime, every ~83 ms in the Verse (on twos), and only while
 * the section is on screen and the tab is visible. Under reduced motion it draws a few still frames
 * once the section is in view (and again after a new selection), then stops.
 */
function Clock({ verse, reduce, active, visible, warm }: { verse: boolean; reduce: boolean; active: number; visible: React.RefObject<boolean>; warm: boolean }) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (!warm) return;
    if (reduce) {
      // a short burst of frames once the section is on screen, then nothing
      let id = 0, drawn = 0;
      const burst = () => {
        if (visible.current && !document.hidden) {
          invalidate();
          drawn++;
        }
        if (drawn < 6) id = requestAnimationFrame(burst);
      };
      id = requestAnimationFrame(burst);
      return () => cancelAnimationFrame(id);
    }
    let last = 0;
    const tick = (time: number) => {
      if (!visible.current || document.hidden) return;
      if (verse && time - last < 1 / 12) return;
      last = time;
      invalidate();
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [verse, reduce, active, visible, invalidate, warm]);
  return null;
}

/**
 * Compiles every material's shader program in parallel (KHR_parallel_shader_compile) before the
 * first frame, so the scene's first appearance doesn't stall the GPU mid-scroll. Until it is done
 * the canvas draws nothing (frameloop "never").
 */
function Warm({ onWarm }: { onWarm: () => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let live = true;
    gl.compileAsync(scene, camera)
      .catch(() => {})
      .then(() => live && onWarm());
    return () => {
      live = false;
    };
  }, [gl, scene, camera, onWarm]);
  return null;
}

function Ready({ onReady, after }: { onReady: () => void; after: number }) {
  const n = useRef(0);
  useFrame(() => {
    if (++n.current === after) onReady();
  });
  return null;
}

function Finish({ verse, dpr }: { verse: boolean; dpr: number }) {
  const comic = useMemo(() => new ComicEffect({ dot: 6 * dpr, shift: 2 * dpr }), [dpr]);
  useEffect(() => () => comic.dispose(), [comic]);
  return verse ? (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <primitive object={comic} />
    </EffectComposer>
  ) : (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={0.8} luminanceSmoothing={0.15} intensity={0.7} radius={0.6} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.32} />
      <Vignette offset={0.28} darkness={0.75} />
    </EffectComposer>
  );
}

export default function Skyline(props: SkylineProps) {
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio || 1));
  const low = (navigator.hardwareConcurrency || 8) <= 4;
  const [warm, setWarm] = useState(false);
  const onWarm = useCallback(() => setWarm(true), []);
  return (
    <Canvas
      frameloop={warm ? "demand" : "never"}
      dpr={low ? 1 : dpr}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "default" }}
      camera={{ fov: 34, near: 0.5, far: 140, position: [0, 6, 20] }}
      aria-hidden="true"
      tabIndex={-1}
      style={{ pointerEvents: "none" }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(1.5, window.devicePixelRatio || 1))} />
      <City active={props.active} verse={props.verse} reduce={props.reduce} host={props.host} />
      <Warm onWarm={onWarm} />
      <Clock verse={props.verse} reduce={props.reduce} active={props.active} visible={props.visible} warm={warm} />
      <Ready onReady={props.onReady} after={props.reduce ? 1 : 3} />
      <Finish verse={props.verse} dpr={low ? 1 : dpr} />
    </Canvas>
  );
}
