"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";
import { site } from "@/content/site";
import { Clock } from "./Clock";
import { isVerse } from "./Dimension";
import { sfx } from "./Sfx";

const NAME = "SUCHINDRA";
const FROM = "SPIDERMAN"; // same length: the persona resolves, letter by letter, into the person
const LETTERS = "ABCDEFGHIKLMNOPRSTUVWXYZ";

/**
 * Reel #1's opening (one word morphing into another on a steady baseline), told as reel #3's
 * idea (one identity, two states): SPIDERMAN scrambles into SUCHINDRA, left to right.
 */
function useScramble(delay = 900, duration = 1500) {
  const [chars, setChars] = useState<string[]>(NAME.split(""));
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const n = NAME.length;
    const start = performance.now() + delay;
    const step = (t: number) => {
      const p = Math.max(0, (t - start) / duration);
      if (p >= 1) { setChars(NAME.split("")); return; }
      setChars(
        NAME.split("").map((c, i) => {
          const done = (i + 1) / (n + 1);
          if (p >= done) return c;
          if (p < done - 0.3) return FROM[i];
          return LETTERS[(Math.floor(t / 55) + i * 5) % LETTERS.length];
        }),
      );
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [delay, duration]);
  return chars;
}

/**
 * Each letter sits in a cell as wide as the final letter, so the word never wobbles. A wider letter
 * passing through a narrow cell during the scramble is squeezed to fit (a brief condensed glitch).
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function useCellWidths(measure: React.RefObject<HTMLSpanElement | null>) {
  const [m, setM] = useState<{ cells: number[]; glyph: Record<string, number> } | null>(null);
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      const el = measure.current;
      if (!live || !el) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const w = [...el.children].map((c) => (c as HTMLElement).getBoundingClientRect().width / fs);
      const glyph: Record<string, number> = {};
      ALPHABET.split("").forEach((c, i) => (glyph[c] = w[NAME.length + i]));
      setM({ cells: w.slice(0, NAME.length), glyph });
    });
    return () => { live = false; };
  }, [measure]);
  return m;
}

type Web = { id: number; x: number; y: number; ax: number; ay: number };

/**
 * Reel #10, done properly: click the dark to fire a web, and it sticks to something real. The
 * strand runs from where you clicked to the nearest edge of a real element (a letter of the name,
 * the role line, the statement, the nav), flies out slack and settles with a damped wobble. In the
 * Verse it lands with a THWIP. Delete or Backspace clears them. Clicks on the figure are left to
 * the reveal.
 */
function useWebs(section: React.RefObject<HTMLElement | null>, portrait: React.RefObject<HTMLDivElement | null>) {
  const [webs, setWebs] = useState<Web[]>([]);
  useEffect(() => {
    const el = section.current!;
    let id = 0;
    const onFigure = (cx: number, cy: number) => {
      const b = portrait.current!.getBoundingClientRect();
      if (cx < b.left || cx > b.right || cy < b.top) return false;
      const fx = (cx - b.left) / b.width, fy = (cy - b.top) / b.height;
      const head = ((fx - 0.5) / 0.26) ** 2 + ((fy - 0.38) / 0.3) ** 2 <= 1;
      return head || fy > 0.55;
    };
    /** The nearest point on a real element's outline, at least 50 px away. */
    const anchorFor = (cx: number, cy: number) => {
      let best: { x: number; y: number; d: number } | null = null;
      document.querySelectorAll<HTMLElement>("[data-anchor]").forEach((n) => {
        const r = n.getBoundingClientRect();
        if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
        const inside = cx > r.left && cx < r.right && cy > r.top && cy < r.bottom;
        const x = Math.min(r.right, Math.max(r.left, cx));
        let y = Math.min(r.bottom, Math.max(r.top, cy));
        if (inside) y = r.top; // from inside a letter, catch its roof
        const d = Math.hypot(x - cx, y - cy);
        if (d < 50) return;
        if (!best || d < best.d) best = { x, y, d };
      });
      return best as { x: number; y: number; d: number } | null;
    };
    const onClick = (e: MouseEvent) => {
      // an anchor of the 3D web took this click (it pulses instead)
      if (e.defaultPrevented) return;
      if ((e.target as HTMLElement).closest("a,button") || onFigure(e.clientX, e.clientY)) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const nav = document.querySelector("[data-site-nav]");
      const top = (nav ? nav.getBoundingClientRect().bottom : 64) - r.top + 6;
      if (y < top + 24) return;
      const a = anchorFor(e.clientX, e.clientY);
      const ax = a ? a.x - r.left : Math.min(r.width - 8, Math.max(8, x + (x < r.width / 2 ? -1 : 1) * Math.min(160, r.width * 0.12)));
      const ay = a ? a.y - r.top : top;
      setWebs((w) => [...w.slice(-7), { id: ++id, x, y, ax, ay }]);
      if (isVerse()) sfx("THWIP!", e.clientX + 14, e.clientY - 46);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && !(e.target as HTMLElement).closest("input,textarea,[contenteditable]")) setWebs([]);
    };
    el.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [section, portrait]);
  return webs;
}

function WebMark({ w }: { w: Web }) {
  const path = useRef<SVGPathElement>(null);
  const len = Math.hypot(w.x - w.ax, w.y - w.ay);
  const at = (sag: number) => {
    const mx = (w.ax + w.x) / 2, my = (w.ay + w.y) / 2;
    return `M${w.ax.toFixed(1)} ${w.ay.toFixed(1)} Q${mx.toFixed(1)} ${(my + sag).toFixed(1)} ${w.x.toFixed(1)} ${w.y.toFixed(1)}`;
  };
  // flies out slack, then pulls taut with a damped wobble; then stops for good
  useEffect(() => {
    const p = path.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rest = len * 0.1, slack = len * 0.34;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const s = (t - t0) / 1000;
      const sag = rest + (slack - rest) * Math.exp(-s * 5) * Math.cos(s * 17);
      p.setAttribute("d", at(sag));
      if (s < 1.1) raf = requestAnimationFrame(step);
      else p.setAttribute("d", at(rest));
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one web, one settle
  }, []);
  const spokes = 8;
  const rings = [14, 28, 44, 60];
  const pt = (k: number, rad: number) => {
    const a = (k / spokes) * Math.PI * 2 + 0.25;
    const wob = 0.9 + (((k * 37 + rad) % 7) / 7) * 0.2;
    return [w.x + Math.cos(a) * rad * wob, w.y + Math.sin(a) * rad * wob];
  };
  return (
    <g className="web">
      <path ref={path} className="web-strand" pathLength={1} d={at(len * 0.1)} fill="none" />
      <circle className="web-anchor" cx={w.ax} cy={w.ay} r="2" />
      <g className="web-net" style={{ transformOrigin: `${w.x}px ${w.y}px` }} fill="none">
        {Array.from({ length: spokes }, (_, k) => {
          const [ex, ey] = pt(k, 68);
          return <line key={k} x1={w.x} y1={w.y} x2={ex} y2={ey} />;
        })}
        {rings.map((rad) => (
          <polygon key={rad} points={Array.from({ length: spokes }, (_, k) => pt(k, rad).join(",")).join(" ")} />
        ))}
      </g>
    </g>
  );
}

/**
 * Spider-sense: a fast cursor heading for the masked head makes tingle lines flicker round it,
 * before the reveal. A short cooldown keeps it a surprise, not a strobe.
 */
function useSpiderSense(section: React.RefObject<HTMLElement | null>, portrait: React.RefObject<HTMLDivElement | null>, sense: React.RefObject<SVGSVGElement | null>) {
  useEffect(() => {
    if (matchMedia("(pointer: coarse)").matches) return;
    const el = section.current!;
    let lx = 0, ly = 0, lt = 0, cool = 0, off = 0;
    const onMove = (e: PointerEvent) => {
      const t = performance.now();
      const dt = t - lt;
      const vx = (e.clientX - lx) / Math.max(1, dt), vy = (e.clientY - ly) / Math.max(1, dt);
      lx = e.clientX; ly = e.clientY; lt = t;
      if (dt > 80 || t < cool) return;
      const b = portrait.current!.getBoundingClientRect();
      const hx = b.left + b.width * 0.5, hy = b.top + b.height * 0.36;
      const dx = hx - e.clientX, dy = hy - e.clientY, dist = Math.hypot(dx, dy);
      const speed = Math.hypot(vx, vy);
      if (dist < b.width * 0.22 || dist > b.width * 0.75 || speed < 1.5) return;
      if ((vx * dx + vy * dy) / (speed * dist) < 0.8) return; // not heading for the head
      cool = t + 2600;
      const s = sense.current!;
      s.dataset.on = "true";
      window.clearTimeout(off);
      off = window.setTimeout(() => delete s.dataset.on, 720);
    };
    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      window.clearTimeout(off);
    };
  }, [section, portrait, sense]);
}

/** Tingle marks: three pairs of short zig-zags either side of the head (portrait coordinates). */
const TINGLES = [-38, -8, 22].flatMap((deg) =>
  [1, -1].map((side) => {
    const a = (deg * Math.PI) / 180;
    const cx = 385.5, cy = 330, r0 = 196, r1 = 262;
    const pts: string[] = [];
    for (let k = 0; k <= 6; k++) {
      const r = r0 + ((r1 - r0) * k) / 6;
      const n = (k % 2 ? 1 : -1) * 7;
      const x = cx + side * (Math.cos(a) * r - Math.sin(a) * n);
      const y = cy + Math.sin(a) * r + Math.cos(a) * n;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(" ");
  }),
);

/**
 * SWING SHIFT hero. Black studio. The owner's two images stacked as one portrait (mask on top,
 * his own face revealed under the cursor), a thin red reticle round him that passes behind his
 * shoulders (Spider Noir reference), the persona resolving into his name in front of the suit
 * (Developer-flex reference), and webs to fire into the dark ("found" reference).
 */
export function Hero() {
  const section = useRef<HTMLElement>(null);
  const portrait = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const chars = useScramble();
  const cells = useCellWidths(measure);
  const sense = useRef<SVGSVGElement>(null);
  const webs = useWebs(section, portrait);
  useSpiderSense(section, portrait, sense);
  const [touch, setTouch] = useState(false);
  const [found, setFound] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the pointer type is only known in the browser
    setTouch(matchMedia("(pointer: coarse)").matches);
    const el = section.current!;
    const onFound = () => setFound(true);
    el.addEventListener("reveal-found", onFound);
    return () => {
      el.removeEventListener("reveal-found", onFound);
    };
  }, []);

  // transparent: the web behind the hero is drawn by <Continuum>, shared with the work below
  return (
    <section ref={section} id="top" aria-labelledby="name" className="relative h-[100svh] min-h-[620px] overflow-hidden">
      {/* The portrait: the two supplied images, registered, bottom-centred */}
      <div ref={portrait} className="portrait-in absolute bottom-0 left-1/2 z-[2] aspect-[771/1018] h-[84svh] -translate-x-1/2 md:h-[96svh]">
        <Reveal className="portrait-frame absolute inset-0" />
        {/* Reticle: a thin ring that passes behind his shoulders (masked where it meets the body) */}
        <svg aria-hidden="true" viewBox="0 0 771 1018" className="reticle pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="ring-fade" x1="0" y1="0" x2="0" y2="1018" gradientUnits="userSpaceOnUse">
              <stop offset={500 / 1018} stopColor="#fff" />
              <stop offset={548 / 1018} stopColor="#000" />
            </linearGradient>
            <mask id="ring-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="771" height="1018">
              <rect width="771" height="1018" fill="url(#ring-fade)" />
            </mask>
          </defs>
          <g className="reticle-ring" mask="url(#ring-mask)" stroke="var(--color-red)" strokeOpacity="0.9" strokeWidth="1.2" fill="none">
            <circle pathLength={1} cx="385.5" cy="372" r="318" vectorEffect="non-scaling-stroke" transform="rotate(-90 385.5 372)" />
            <g className="rise" style={{ animationDelay: "2.4s" }}>
              <line x1="385.5" y1="46" x2="385.5" y2="62" vectorEffect="non-scaling-stroke" />
              <line x1="59" y1="372" x2="75" y2="372" vectorEffect="non-scaling-stroke" />
              <line x1="696" y1="372" x2="712" y2="372" vectorEffect="non-scaling-stroke" />
            </g>
          </g>
        </svg>
        {/* Spider-sense: flickers round the head when a fast cursor heads for it */}
        <svg ref={sense} aria-hidden="true" viewBox="0 0 771 1018" className="spider-sense pointer-events-none absolute inset-0 h-full w-full">
          {TINGLES.map((pts, k) => (
            <polyline key={k} points={pts} style={{ animationDelay: `${(k % 3) * 40}ms` }} />
          ))}
        </svg>
        {/* The Verse: once you find him, the comic says so */}
        <p aria-hidden={!found} className={`found-caption caption-box absolute left-[64%] top-[12%] max-w-[13rem] ${found ? "is-on" : ""}`}>
          Yeah. It’s me. The guy who builds things after hours.
        </p>
      </div>

      {/* Opening static, full-bleed, settling into the portrait (reel #1) */}
      <div aria-hidden="true" className="static absolute inset-0 z-[3]" />

      {/* Webs the visitor has fired */}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3] h-full w-full overflow-visible">
        {webs.map((w) => (
          <WebMark key={w.id} w={w} />
        ))}
      </svg>

      {/* Role + name, as one unit, in front of the suit */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[13svh] z-[4] flex justify-center md:bottom-[3svh]">
        <div className="relative">
          {/* The Verse: a spray-painted tag under the name (Miles's touch) */}
          <svg aria-hidden="true" viewBox="0 0 1000 260" preserveAspectRatio="none" className="spray-tag verse-only rise absolute -left-[3%] bottom-[10%] h-[52%] w-[106%]" style={{ animationDelay: "2.3s" }}>
            <defs>
              <filter id="spray" x="-10%" y="-30%" width="120%" height="160%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="16" />
              </filter>
            </defs>
            <g filter="url(#spray)" fill="none" strokeLinecap="round">
              <path d="M40 190 C 210 120, 380 230, 560 160 S 860 120, 965 170" stroke="#e3262b" strokeWidth="58" strokeOpacity="0.92" />
              <path d="M150 218 C 320 196, 520 226, 840 200" stroke="#ff2e88" strokeWidth="9" strokeOpacity="0.85" />
              <path d="M300 205 l 0 30 M 640 190 l 0 38 M 820 176 l 0 24" stroke="#e3262b" strokeWidth="7" />
            </g>
          </svg>
          <p data-anchor className="rise verse-caption absolute bottom-full left-[0.4vw] mb-[0.2em] font-serif text-[clamp(20px,2.1vw,32px)] italic leading-none text-text [text-shadow:0_1px_10px_rgba(0,0,0,0.95)]" style={{ animationDelay: "2.1s" }}>
            Full-stack developer<span className="text-text md:text-red-text">.</span>
          </p>
          <h1 id="name" aria-label={site.name} className="text-[min(16.6vw,22svh)] md:text-[min(16.2vw,30svh)]">
            <span aria-hidden="true" className="rise inline-block whitespace-nowrap" style={{ animationDelay: "0.6s" }}>
              {chars.map((c, i) => {
                const cw = cells?.cells[i];
                const sx = cw && cells.glyph[c] ? Math.min(1, cw / cells.glyph[c]) : 1;
                return (
                  <span key={i} data-anchor className="inline-block text-center" style={cw ? { width: `${cw.toFixed(4)}em` } : undefined}>
                    <span className="wordmark inline-block pb-[0.06em]" style={sx < 1 ? { transform: `scaleX(${sx.toFixed(3)})` } : undefined}>
                      {c}
                    </span>
                  </span>
                );
              })}
            </span>
            {/* hidden ruler for the final letter widths */}
            <span ref={measure} aria-hidden="true" className="wordmark invisible absolute left-0 top-0 whitespace-nowrap">
              {(NAME + ALPHABET).split("").map((c, i) => (
                <span key={i} className="inline-block">
                  {c}
                </span>
              ))}
            </span>
          </h1>
        </div>
      </div>

      {/* Left: the statement. Roomy screens only (1280 × 860 and up): below that the name fills the bottom edge */}
      <div className="rise absolute bottom-8 left-10 z-[5] hidden max-w-[22rem] roomy:block" style={{ animationDelay: "1.6s" }}>
        <p data-anchor className="verse-caption text-[17px] leading-[1.4] text-text">{site.line[1]}</p>
        <p className="label mt-5 text-dim">
          {site.location} · {site.company}
        </p>
      </div>

      {/* Right edge: the edition, set vertically */}
      <p aria-hidden="true" className="label absolute right-10 top-1/2 z-[5] hidden -translate-y-1/2 rotate-180 text-dim [writing-mode:vertical-rl] md:block">
        <span className="prime-only">Swing Shift <span className="text-red-text">/</span> the night edition</span>
        <span className="verse-only">The Verse <span className="text-red-text">/</span> comic edition</span>
      </p>

      {/* Phones: a way forward and the local time, under the name */}
      <div className="absolute inset-x-5 bottom-5 z-[5] flex items-baseline justify-between md:hidden">
        <a href="#work" className="label whitespace-nowrap border-b border-red pb-1 text-text">
          See the work <span aria-hidden="true">↓</span>
        </a>
        <span className="label whitespace-nowrap text-dim">
          <Clock short />
        </span>
      </div>

      {/* How to use it: under the header on phones and tablets, bottom-right on roomy screens */}
      <div className="rise absolute left-5 top-[72px] z-[5] md:left-10 md:top-[96px] roomy:bottom-8 roomy:left-auto roomy:right-10 roomy:top-auto roomy:text-right" style={{ animationDelay: "2s" }}>
        <p className="label flex items-center gap-2 text-silver roomy:justify-end">
          <span aria-hidden="true" className="pulse size-1.5 rounded-full bg-red" />
          {touch ? "Tap the mask" : "Move over the mask"}
        </p>
        <p className="label mt-2 hidden text-dim md:block">Click the dark to fire a web · Del clears · V jumps dimension</p>
      </div>
    </section>
  );
}
