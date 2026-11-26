"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";
import { site } from "@/content/site";
import { Clock } from "./Clock";

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
 * Reel #10: click the dark to fire a web. The line hangs from just under the header (never across
 * the links); Delete or Backspace clears them. Clicks on the figure itself are left to the reveal.
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
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("a,button") || onFigure(e.clientX, e.clientY)) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const nav = document.querySelector("[data-site-nav]");
      const ay = (nav ? nav.getBoundingClientRect().bottom : 64) - r.top + 6;
      if (y < ay + 24) return;
      const ax = Math.min(r.width - 8, Math.max(8, x + (x < r.width / 2 ? -1 : 1) * Math.min(160, r.width * 0.12)));
      setWebs((w) => [...w.slice(-7), { id: ++id, x, y, ax, ay }]);
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
  const spokes = 8;
  const rings = [14, 28, 44, 60];
  const pt = (k: number, rad: number) => {
    const a = (k / spokes) * Math.PI * 2 + 0.25;
    const wob = 0.9 + (((k * 37 + rad) % 7) / 7) * 0.2;
    return [w.x + Math.cos(a) * rad * wob, w.y + Math.sin(a) * rad * wob];
  };
  return (
    <g>
      <path className="web-strand" pathLength={1} d={`M${w.ax} ${w.ay} Q${(w.ax + w.x) / 2} ${w.ay + (w.y - w.ay) * 0.62} ${w.x} ${w.y}`} stroke="#e9e6e2" strokeOpacity="0.8" strokeWidth="1" fill="none" />
      <circle cx={w.ax} cy={w.ay} r="1.6" fill="#e9e6e2" fillOpacity="0.8" />
      <g className="web-net" style={{ transformOrigin: `${w.x}px ${w.y}px` }} stroke="#e9e6e2" strokeOpacity="0.75" strokeWidth="0.9" fill="none">
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
  const webs = useWebs(section, portrait);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the pointer type is only known in the browser
    setTouch(matchMedia("(pointer: coarse)").matches);
  }, []);

  return (
    <section ref={section} id="top" aria-labelledby="name" className="relative h-[100svh] min-h-[620px] overflow-hidden bg-void">
      {/* The portrait: the two supplied images, registered, bottom-centred */}
      <div ref={portrait} className="portrait-in absolute bottom-0 left-1/2 z-[2] aspect-[771/1018] h-[84svh] -translate-x-1/2 md:h-[96svh]">
        <Reveal className="absolute inset-0" />
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
          <p className="rise absolute bottom-full left-[0.4vw] mb-[0.2em] font-serif text-[clamp(20px,2.1vw,32px)] italic leading-none text-text [text-shadow:0_1px_10px_rgba(0,0,0,0.95)]" style={{ animationDelay: "2.1s" }}>
            Full-stack developer<span className="text-text md:text-red-text">.</span>
          </p>
          <h1 id="name" aria-label={site.name} className="text-[min(16.6vw,22svh)] md:text-[min(16.2vw,30svh)]">
            <span aria-hidden="true" className="rise inline-block whitespace-nowrap" style={{ animationDelay: "0.6s" }}>
              {chars.map((c, i) => {
                const cw = cells?.cells[i];
                const sx = cw && cells.glyph[c] ? Math.min(1, cw / cells.glyph[c]) : 1;
                return (
                  <span key={i} className="inline-block text-center" style={cw ? { width: `${cw.toFixed(4)}em` } : undefined}>
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

      {/* Left: the statement */}
      <div className="rise absolute bottom-8 left-10 z-[5] hidden max-w-[22rem] md:block" style={{ animationDelay: "1.6s" }}>
        <p className="text-[17px] leading-[1.4] text-text">{site.line[1]}</p>
        <p className="label mt-5 text-dim">
          {site.location} · {site.company}
        </p>
      </div>

      {/* Right edge: the edition, set vertically */}
      <p aria-hidden="true" className="label absolute right-10 top-1/2 z-[5] hidden -translate-y-1/2 rotate-180 text-dim [writing-mode:vertical-rl] md:block">
        Swing Shift <span className="text-red-text">/</span> the night edition
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

      {/* How to use it: under the header on phones, bottom-right on desktop */}
      <div className="rise absolute left-5 top-[72px] z-[5] md:bottom-8 md:left-auto md:right-10 md:top-auto md:text-right" style={{ animationDelay: "2s" }}>
        <p className="label flex items-center gap-2 text-silver md:justify-end">
          <span aria-hidden="true" className="pulse size-1.5 rounded-full bg-red" />
          {touch ? "Tap the mask" : "Move over the mask"}
        </p>
        <p className="label mt-2 hidden text-dim md:block">Click the dark to fire a web · Del clears</p>
      </div>
    </section>
  );
}
