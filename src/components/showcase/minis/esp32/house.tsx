"use client";

import { useEffect, useId, useRef, useState, type RefObject, type SVGProps } from "react";

/**
 * ESP32 HOME AUTOMATION — the 2D drawing shared by the Mini, the hero and the no-WebGL demo fallback.
 *
 * An architect's section through a small two-storey house at dusk: the cut walls and slabs are
 * solid, the rooms are open to view, and a hairline of verdigris wiring runs inside the slabs
 * from one small controller in the hall (an ESP32 with a two-channel relay, as in the résumé
 * build) to every fixture. A command sends a pulse along a run; the room lights when it arrives.
 *
 * Coordinates are in house units (x 0…1000, ground line at y 805). The viewBox is computed
 * from the box's aspect so the house sits top/right on landscape boxes and top on portrait
 * ones, leaving the bottom-left calm for type.
 */

export type Room = "hall" | "kitchen" | "living" | "landing" | "study" | "bedroom";
/** The order a "lights" command reaches the rooms: nearest the controller first. */
export const ROOMS: Room[] = ["hall", "kitchen", "living", "landing", "study", "bedroom"];
export type Lit = Record<Room, boolean>;
export const allLit = (on: boolean): Lit => ({ hall: on, kitchen: on, living: on, landing: on, study: on, bedroom: on });

/* ─────────────── Palette (DESIGN.md family; two shades of dusk for the drawing) ─────────────── */
const C = {
  void: "#120A0F",
  dusk: "#2B1620",
  oxblood: "#5A1E24",
  terracotta: "#B5573A",
  travertine: "#D8C7B0",
  apricot: "#FFB26B",
  gold: "#FFD9A0",
  verdigris: "#5FB8A0",
  poche: "#0D070A", // the cut: walls, slabs, roof
  room: "#21111A", // a room with the lights off
  warm: "#5B2A22", // a room's lit ambient
  furn: "#150B10", // furniture silhouettes
};

/* ─────────────── Geometry ─────────────── */

type Shape = { rect: [number, number, number, number] } | { poly: string };
const ROOM: Record<Room, { shape: Shape; glow: [number, number, number] }> = {
  living: { shape: { rect: [60, 520, 376, 270] }, glow: [112, 640, 380] },
  kitchen: { shape: { rect: [444, 520, 272, 270] }, glow: [580, 585, 300] },
  hall: { shape: { rect: [724, 520, 236, 270] }, glow: [842, 556, 260] },
  bedroom: { shape: { poly: "60,505 60,262 300,102 540,262 540,505" }, glow: [300, 200, 340] },
  study: { shape: { rect: [560, 284, 240, 221] }, glow: [680, 345, 250] },
  landing: { shape: { rect: [808, 284, 152, 221] }, glow: [884, 330, 210] },
};

/** Each room's run from the controller (hall, x≈770), inside the slabs and the right-hand wall. */
export const RUN: Record<Room, string> = {
  hall: "M770 602 V512 H842 V522",
  kitchen: "M770 602 V512 H580 V522",
  living: "M770 650 V797 H112 V790",
  landing: "M770 650 V797 H970 V273 H884 V286",
  study: "M770 650 V797 H970 V273 H680 V286",
  bedroom: "M770 650 V797 H970 V273 H578 L300 87 V104",
};

const roofOuter = (x: number) => 72 + Math.abs(x - 300) * (2 / 3);
const roofInner = (x: number) => 102 + Math.abs(x - 300) * (2 / 3);
const ROOF = `-14,${roofOuter(-14)} 300,72 590,${roofOuter(590)} 590,${roofInner(590)} 300,102 -14,${roofInner(-14) + 2}`;

/** Stairs in the hall: eleven risers from the ground floor to the landing. */
const STAIRS = (() => {
  let d = "M728 790";
  for (let i = 0; i < 11; i++) {
    const y = 790 - 26 * (i + 1);
    d += ` V${y} H${728 + 21 * (i + 1)}`;
  }
  return d + " V530 L752 790 Z";
})();

/** Subject box (house + caption) and framing. */
const BOX = { x0: -60, x1: 1115, y0: 40, y1: 830 };
export type Framing = { k: number; top: number; right: number; portraitTop: number };
export const FRAMING_PLATE: Framing = { k: 0.74, top: 0.1, right: 0.975, portraitTop: 0.12 };
/** The demo's no-WebGL fallback: lower and smaller, clear of the section title. */
export const FRAMING_DEMO: Framing = { k: 0.58, top: 0.15, right: 0.97, portraitTop: 0.25 };
export const FRAMING_HERO: Framing = { k: 0.56, top: 0.12, right: 0.99, portraitTop: 0.19 };

function viewBoxFor(w: number, h: number, f: Framing) {
  const bw = BOX.x1 - BOX.x0;
  const bh = BOX.y1 - BOX.y0;
  const aspect = w > 0 && h > 0 ? w / h : 1.6;
  if (aspect >= 1.05) {
    let vh = bh / f.k;
    let vw = vh * aspect;
    if (bw > vw * 0.9) {
      vw = bw / 0.9;
      vh = vw / aspect;
    }
    // Right-aligned, unless that would crop the house on the left.
    const vx = Math.min(BOX.x1 - f.right * vw, BOX.x0 - vw * 0.03);
    const vy = BOX.y0 - f.top * vh;
    return `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`;
  }
  const vw = bw / 0.92;
  const vh = vw / aspect;
  const vx = BOX.x0 - (vw - bw) / 2;
  const vy = BOX.y0 - Math.min(f.portraitTop * vh, Math.max(0, vh - bh) * 0.5);
  return `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`;
}

/** viewBox that follows the element's aspect. */
function useViewBox(ref: RefObject<SVGSVGElement | null>, f: Framing) {
  const [vb, setVb] = useState(() => viewBoxFor(16, 10, f));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setVb(viewBoxFor(width, height, f));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, f]);
  return vb;
}

/** True while the element is on screen. */
export function useInView(ref: RefObject<Element | null>, margin = "0px") {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return inView;
}

/* ─────────────── Imperative helpers (pulses, fan, LED) ─────────────── */

const CINE = "cubic-bezier(0.65, 0, 0.35, 1)";

/** Sends one pulse along a room's run. Returns the Animation (or null) so callers can cancel it. */
export function sendPulse(svg: SVGSVGElement | null, room: Room, ms = 650): Animation | null {
  const el = svg?.querySelector<SVGPathElement>(`[data-pulse="${room}"]`);
  if (!el || typeof el.animate !== "function") return null;
  return el.animate(
    [
      { strokeDashoffset: 0.16, opacity: 1 },
      { strokeDashoffset: -1, opacity: 1 },
    ],
    { duration: ms, easing: CINE },
  );
}

/** The controller's LED blinks while it receives a command. */
export function blinkLed(svg: SVGSVGElement | null, ms = 420): Animation | null {
  const el = svg?.querySelector<SVGElement>("[data-led]");
  if (!el || typeof el.animate !== "function") return null;
  return el.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], { duration: ms });
}

/**
 * The fan, seen edge-on, "spins" by foreshortening its blades. Runs only while `run` is true
 * (the fan is on and the drawing is on screen) and stops under reduced motion.
 *
 * The blades live alone in their own <svg> layer, so the transform is applied to that whole
 * element about the blades' centre (in % of the box, so it survives resizes at the same
 * aspect). A transform on an HTML-level element runs on the compositor: no repaint per frame.
 */
function useFanSpin(svg: RefObject<SVGSVGElement | null>, run: boolean, vb: string) {
  useEffect(() => {
    const el = svg.current;
    const blade = el?.querySelector<SVGGraphicsElement>("[data-blades]");
    if (!el || !blade || !run || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = el.getBoundingClientRect();
    const b = blade.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const ox = ((b.left - box.left + b.width / 2) / box.width) * 100;
    const oy = ((b.top - box.top + b.height / 2) / box.height) * 100;
    el.style.setProperty("transform-origin", `${ox.toFixed(3)}% ${oy.toFixed(3)}%`);
    const a = el.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0.12)" }, { transform: "scaleX(1)" }], { duration: 520, iterations: Infinity });
    return () => a.cancel();
  }, [svg, run, vb]);
}

/* ─────────────── The drawing ─────────────── */

export type HouseProps = {
  lit: Lit;
  tv: boolean;
  fan: boolean;
  /** The command shown in the sky (top right), and whether its caret blinks. */
  caption?: string;
  captionState?: "typing" | "sent" | "idle";
  framing?: Framing;
  /** Light fade duration (ms). */
  fade?: number;
  /** Whether the drawing is on screen (gates the fan). */
  live?: boolean;
  svgRef?: RefObject<SVGSVGElement | null>;
  className?: string;
};

function RoomShape({ room, ...rest }: { room: Room } & SVGProps<SVGRectElement & SVGPolygonElement>) {
  const s = ROOM[room].shape;
  if ("rect" in s) {
    const [x, y, w, h] = s.rect;
    return <rect x={x} y={y} width={w} height={h} {...(rest as SVGProps<SVGRectElement>)} />;
  }
  return <polygon points={s.poly} {...(rest as SVGProps<SVGPolygonElement>)} />;
}

/** A window in a back wall: the dusk sky seen through it (same gradient as outside). */
function Pane({ x, y, w, h, sky, lit, split = false }: { x: number; y: number; w: number; h: number; sky: string; lit: boolean; split?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${sky})`} />
      <rect x={x} y={y} width={w} height={h} fill={C.gold} opacity={lit ? 0.08 : 0} style={{ transition: "opacity 600ms" }} />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={C.poche} strokeWidth={5} />
      {split && <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={C.poche} strokeWidth={4} />}
      <line x1={x - 6} y1={y + h + 3} x2={x + w + 6} y2={y + h + 3} stroke={C.poche} strokeWidth={6} />
    </g>
  );
}

/** A pendant: cord from the ceiling and a small shade; the bulb brightens when lit. */
function Pendant({ x, top, drop, lit, fade }: { x: number; top: number; drop: number; lit: boolean; fade: number }) {
  const y = top + drop;
  return (
    <g>
      <line x1={x} y1={top} x2={x} y2={y} stroke={C.furn} strokeWidth={1.6} />
      <path d={`M${x - 13} ${y + 12} Q${x} ${y - 6} ${x + 13} ${y + 12} Z`} fill={lit ? "#7A4630" : "#2E1C1E"} style={{ transition: `fill ${fade}ms` }} />
      <ellipse cx={x} cy={y + 12} rx={7} ry={3} fill={C.gold} opacity={lit ? 1 : 0.08} style={{ transition: `opacity ${fade}ms` }} />
    </g>
  );
}

export function House({ lit, tv, fan, caption, captionState = "idle", framing = FRAMING_PLATE, fade = 700, live = true, svgRef, className = "" }: HouseProps) {
  const own = useRef<SVGSVGElement>(null);
  const ref = svgRef ?? own;
  const vb = useViewBox(ref, framing);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sky = `${id}-sky`;
  const glow = `${id}-glow`;
  const pool = `${id}-pool`;
  const sun = `${id}-sun`;
  const blades = useRef<SVGSVGElement>(null);
  useFanSpin(blades, fan && live, vb);
  const t = (prop: string) => ({ transition: `${prop} ${fade}ms cubic-bezier(0.16, 1, 0.3, 1)` });

  return (
    <>
      <svg ref={ref} viewBox={vb} preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 block h-full w-full ${className}`} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={sky} gradientUnits="userSpaceOnUse" x1="0" y1="-900" x2="0" y2="805">
            <stop offset="0" stopColor={C.void} />
            <stop offset="0.42" stopColor={C.dusk} />
            <stop offset="0.74" stopColor={C.oxblood} />
            <stop offset="0.92" stopColor="#8E3F2E" />
            <stop offset="1" stopColor={C.terracotta} />
          </linearGradient>
          <radialGradient id={sun} gradientUnits="userSpaceOnUse" cx="-420" cy="812" r="1250">
            <stop offset="0" stopColor={C.gold} stopOpacity="0.85" />
            <stop offset="0.14" stopColor={C.apricot} stopOpacity="0.5" />
            <stop offset="0.45" stopColor={C.terracotta} stopOpacity="0.16" />
            <stop offset="1" stopColor={C.terracotta} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={glow}>
            <stop offset="0" stopColor="#FFF0D8" />
            <stop offset="0.08" stopColor={C.gold} />
            <stop offset="0.36" stopColor={C.apricot} stopOpacity="0.7" />
            <stop offset="0.75" stopColor={C.terracotta} stopOpacity="0.22" />
            <stop offset="1" stopColor={C.terracotta} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={pool}>
            <stop offset="0" stopColor={C.gold} stopOpacity="0.5" />
            <stop offset="1" stopColor={C.apricot} stopOpacity="0" />
          </radialGradient>
          {ROOMS.map((r) => (
            <clipPath key={r} id={`${id}-clip-${r}`}>
              <RoomShape room={r} />
            </clipPath>
          ))}
        </defs>

        {/* ── Dusk: sky, the last of the sun low on the left, hills, ground ── */}
        <rect x="-5000" y="-5000" width="11000" height="5805" fill={`url(#${sky})`} />
        <rect x="-5000" y="-5000" width="11000" height="5805" fill={`url(#${sun})`} />
        <path d="M-5000 805 V786 C-2600 770 -1700 760 -1100 772 S-420 790 -60 780 S700 768 1200 776 S2400 790 3200 774 S5000 780 6000 784 V805 Z" fill="#3B1820" opacity="0.85" />
        <path d="M-5000 805 V798 C-3000 792 -1400 786 -700 794 S600 800 1400 795 S4000 790 6000 797 V805 Z" fill="#22101A" />
        <rect x="-5000" y="805" width="11000" height="5000" fill="#160A10" />
        <line x1="-5000" y1="805.5" x2="6000" y2="805.5" stroke={C.terracotta} strokeOpacity="0.35" strokeWidth="1.5" />

        {/* A slender tree against the glow, and a lower one beyond the house */}
        <g fill="#1A0B11">
          <path d="M-150 805 L-146 640 L-142 805 Z" />
          <ellipse cx="-147" cy="600" rx="34" ry="78" />
          <ellipse cx="-160" cy="660" rx="26" ry="40" />
          <path d="M1068 805 L1071 700 L1074 805 Z" />
          <ellipse cx="1071" cy="690" rx="38" ry="46" />
        </g>

        {/* ── Rooms (lights off) ── */}
        {ROOMS.map((r) => (
          <RoomShape key={r} room={r} fill={C.room} />
        ))}

        {/* ── Light: ambient warmth and a pool from each fixture, clipped to its room ── */}
        {ROOMS.map((r) => {
          const [cx, cy, rad] = ROOM[r].glow;
          return (
            <g key={r} clipPath={`url(#${id}-clip-${r})`} opacity={lit[r] ? 1 : 0} style={t("opacity")}>
              <RoomShape room={r} fill={C.warm} />
              <circle cx={cx} cy={cy} r={rad} fill={`url(#${glow})`} />
            </g>
          );
        })}
        {/* The television's own light, on the living-room wall */}
        <g clipPath={`url(#${id}-clip-living)`} opacity={tv ? 1 : 0} style={t("opacity")}>
          <circle cx="384" cy="708" r="120" fill={`url(#${pool})`} />
        </g>

        {/* ── Windows in the back walls: the same dusk, seen through the house ── */}
        <Pane x={176} y={566} w={130} h={128} sky={sky} lit={lit.living} split />
        <Pane x={634} y={598} w={64} h={78} sky={sky} lit={lit.kitchen} />
        <Pane x={398} y={338} w={70} h={104} sky={sky} lit={lit.bedroom} />
        <Pane x={716} y={318} w={64} h={92} sky={sky} lit={lit.study} />
        <Pane x={926} y={316} w={20} h={140} sky={sky} lit={lit.landing} />

        {/* ── Furniture, as silhouettes ── */}
        <g fill={C.furn}>
          {/* living: sofa, floor lamp, TV on a low console */}
          <path d="M156 790 V744 Q156 734 166 734 H172 V712 Q172 704 180 704 H292 Q300 704 300 712 V734 H306 Q316 734 316 744 V790 H306 V782 H166 V790 Z" />
          <rect x="104" y="786" width="16" height="4" rx="1.5" />
          <rect x="111" y="646" width="2.4" height="142" />
          <rect x="330" y="766" width="100" height="24" rx="2" />
          <rect x="340" y="684" width="88" height="54" rx="2" fill="#0B0608" />
          {/* kitchen: island and stools */}
          <rect x="488" y="734" width="176" height="56" rx="2" />
          <rect x="482" y="728" width="188" height="8" rx="2" />
          <rect x="684" y="606" width="24" height="184" rx="2" />
          {/* bedroom: bed, side table */}
          <rect x="80" y="414" width="12" height="91" rx="3" />
          <rect x="92" y="470" width="226" height="22" rx="6" />
          <rect x="92" y="492" width="226" height="13" />
          <rect x="102" y="458" width="58" height="16" rx="7" />
          <rect x="334" y="474" width="34" height="31" rx="2" />
          {/* study: shelves, desk, chair */}
          <rect x="574" y="318" width="34" height="187" rx="2" />
          <rect x="626" y="444" width="150" height="8" rx="2" />
          <rect x="636" y="452" width="6" height="53" />
          <rect x="762" y="452" width="6" height="53" />
          <path d="M676 505 V474 H708 V430 H716 V482 H684 V505 Z" />
          {/* landing: a rail at the stairwell */}
          <rect x="905" y="462" width="3" height="43" />
          <rect x="905" y="460" width="55" height="4" />
        </g>
        {/* shelves' books catch the study light */}
        <g fill={C.travertine} opacity={lit.study ? 0.32 : 0.08} style={t("opacity")}>
          {[340, 380, 420, 460].map((y) => (
            <rect key={y} x="578" y={y} width="26" height="22" rx="1" />
          ))}
        </g>
        {/* TV screen: an abstract warm field when on (not a UI) */}
        <g opacity={tv ? 1 : 0} style={t("opacity")}>
          <rect x="343" y="687" width="82" height="48" fill="#8A3B2C" />
          <circle cx="398" cy="712" r="16" fill={C.gold} opacity="0.75" />
          <path d="M343 735 V722 Q370 712 392 722 T425 718 V735 Z" fill="#3A1820" />
        </g>
        {/* floor lamp shade */}
        <path d="M94 612 H130 L140 646 H84 Z" fill={lit.living ? "#E9C796" : "#33221F"} style={t("fill")} />
        {/* pendants */}
        <Pendant x={540} top={520} drop={62} lit={lit.kitchen} fade={fade} />
        <Pendant x={620} top={520} drop={62} lit={lit.kitchen} fade={fade} />
        <Pendant x={842} top={520} drop={20} lit={lit.hall} fade={fade} />
        <Pendant x={680} top={284} drop={42} lit={lit.study} fade={fade} />
        <Pendant x={884} top={284} drop={26} lit={lit.landing} fade={fade} />
        {/* bedroom: ceiling fan from the ridge, with its light */}
        <line x1="300" y1="102" x2="300" y2="176" stroke={C.furn} strokeWidth="2.4" />
        <rect x="290" y="172" width="20" height="10" rx="3" fill={C.furn} />
        {/* (the blades are drawn in their own layer, below, so their spin never repaints the house) */}
        <ellipse cx="300" cy="188" rx="11" ry="6" fill={lit.bedroom ? C.gold : "#2E1C1E"} style={t("fill")} />

        {/* ── The cut: walls, slabs, roof, stairs ── */}
        <g fill={C.poche}>
          <polygon points={ROOF} />
          <rect x="540" y="262" width="455" height="22" />
          <rect x="975" y="248" width="20" height="16" />
          <rect x="40" y="258" width="20" height="547" />
          <rect x="960" y="262" width="20" height="543" />
          <rect x="540" y="262" width="20" height="243" />
          <rect x="40" y="505" width="865" height="15" />
          <rect x="955" y="505" width="25" height="15" />
          <rect x="436" y="520" width="8" height="270" />
          <rect x="716" y="520" width="8" height="270" />
          <rect x="800" y="284" width="8" height="221" />
          <rect x="24" y="790" width="972" height="15" />
          <path d={STAIRS} />
        </g>
        {/* Hairline edge of the cut, so the drawing reads against the sky */}
        <polyline points={`-14,${roofOuter(-14)} 300,72 586,${roofOuter(586)}`} fill="none" stroke={C.terracotta} strokeOpacity="0.45" strokeWidth="1.4" />
        <path d="M540 262 H995 V248 H975" fill="none" stroke={C.terracotta} strokeOpacity="0.35" strokeWidth="1.2" />

        {/* ── Wiring: the runs inside the slabs (faint), and the pulses that travel them ── */}
        <g fill="none" stroke={C.verdigris} strokeWidth="1.4" strokeOpacity="0.3" strokeDasharray="5 6" strokeLinejoin="round">
          {ROOMS.map((r) => (
            <path key={r} d={RUN[r]} />
          ))}
        </g>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {ROOMS.map((r) => (
            <path key={r} data-pulse={r} d={RUN[r]} pathLength={1} stroke={C.gold} strokeWidth="4" strokeDasharray="0.12 2" strokeDashoffset="0.16" opacity="0" />
          ))}
        </g>

        {/* ── The controller on the hall wall: board, two relays, status LED ── */}
        <g>
          <rect x="744" y="600" width="52" height="52" rx="5" fill="#2A1A1D" stroke={C.verdigris} strokeOpacity="0.55" strokeWidth="1.4" />
          <rect x="752" y="626" width="14" height="16" rx="2" fill="#3E2A28" />
          <rect x="772" y="626" width="14" height="16" rx="2" fill="#3E2A28" />
          <rect x="752" y="608" width="22" height="9" rx="1.5" fill="#1A1013" />
          <circle data-led cx="785" cy="612" r="3.6" fill={C.verdigris} />
        </g>

        {/* ── The command, written in the sky ── */}
        {caption !== undefined && (
          <g transform="translate(640 150)">
            <text x="0" y="0" fill={C.verdigris} style={{ fontFamily: "var(--font-mono)", fontSize: 15, letterSpacing: "0.14em" }}>
              SAY ›{captionState === "sent" ? " SENT" : ""}
            </text>
            <text x="0" y="40" fill={C.gold} style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 500, letterSpacing: "-0.01em" }}>
              {caption ? `“${caption}${captionState === "typing" ? "" : "”"}` : ""}
              {captionState === "typing" && <tspan fill={C.apricot}>▍</tspan>}
            </text>
          </g>
        )}
      </svg>
      {/* The fan's blades, alone in a second <svg> of the same framing, so their spin is a
          compositor transform and never repaints the house. Nothing in the house is drawn over them. */}
      <svg ref={blades} viewBox={vb} preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 block h-full w-full" aria-hidden="true" focusable="false">
        <g data-blades>
          <rect x="226" y="175" width="148" height="4" rx="2" fill={C.furn} />
        </g>
      </svg>
    </>
  );
}
