"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { projects } from "@/content/projects";
import { FrameMedia, NOTES } from "./frames";
import { railNode } from "./thread";

/**
 * THE DARKROOM LINE (Phase 4, docs/interactive/PHASE4-DARKROOM-LINE.md): a cinematic gallery.
 *
 * Six projects hang from one fine rail, each on a single wire, the way framed work hangs in a
 * gallery. The web's crimson thread lands on the rail's centre and always holds the project in
 * front, which takes 60% of the width; its neighbours wait half-lit. The darkroom is one moment
 * only: a frame develops from dark crimson to true colour as it reaches the centre.
 *
 * Motion is physical and interruptible: one spring moves every frame along the rail, the frames
 * swing from their wires with the rail's acceleration, and the rail sags under the moving weight.
 * It all runs only while something moves; nothing is pinned and the page always scrolls.
 *
 * Input: drag or swipe (7 px tells a drag from a click; release uses your speed), click a
 * neighbour, a clear horizontal trackpad swipe, ← → Home End on the stage or the strip, Enter or a
 * click on the front frame to open its case study (the existing shot-<slug> morph). Reduced
 * motion: instant switches, no swing, sag or develop. The same structure serves both editions;
 * the Verse changes three tokens in CSS.
 */
const N = projects.length;
const LAST = N - 1;
const CLIP = projects.findIndex((q) => q.slug === "infinos"); // the frame with a video
const RAIL_Y = 64; // the rail's height inside the stage
const DROP = 30; // the wire
// spring (rail travel) and pendulum (swing), in project units and degrees
const K = 150, C = 22, SK = 62, SC = 4.2, SG = 0.95;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
type IdleWin = { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
/** Run when the browser is idle (or after `timeout` ms at the latest). Returns a cancel function. */
function whenIdle(fn: () => void, timeout: number) {
  const w = window as unknown as IdleWin;
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, Math.min(timeout, 200));
  return () => window.clearTimeout(id);
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sm = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const two = (n: number) => String(n).padStart(2, "0");

type Anchors = { X: number[]; S: number[] };
/** Where frames sit (centre offset and scale) at 0, 1, 2… slots from the centre. */
function anchorsFor(w: number, s1: number, s2: number, gap: number, gap2: number): Anchors {
  const x1 = w / 2 + gap + (w * s1) / 2;
  const x2 = x1 + (w * s1) / 2 + gap2 + (w * s2) / 2;
  const x3 = x2 + w * s2 + gap2;
  const x4 = x3 + w * s2 + gap2;
  return { X: [0, x1, x2, x3, x4, x4 + w * s2 + gap2], S: [1, s1, s2, s2, s2, s2] };
}
/** A frame at k slots from the centre (k is fractional while moving). */
function place(k: number, A: Anchors) {
  const a = Math.min(Math.abs(k), 4.999), i = Math.floor(a), f = a - i;
  return { x: Math.sign(k) * lerp(A.X[i], A.X[i + 1], f), s: lerp(A.S[i], A.S[i + 1], f), d: Math.abs(k) };
}

/** The project in front, kept while you move around the site: Back from a case study returns to it. */
let remembered = 0;

type Els = { frame: HTMLDivElement | null; swing: HTMLDivElement | null; media: HTMLDivElement | null; tint: HTMLSpanElement | null };

export function Rail() {
  const router = useRouter();
  const [shown, setShown] = useState(() => remembered);
  // which frame's mini animates: handed over only once the rail has settled, so starting and
  // stopping an animation (a restyle of hundreds of SVG elements) never lands mid-motion
  const [settled, setSettled] = useState(() => remembered);
  // the animated minis start on the first scroll (the gallery is still a screen away), never while
  // the hero is loading: their styles would repaint the hero during its first paint
  // which minis have started (a bit per frame): one per idle moment, nearest the front first; once
  // started, a mini stays
  const [mounted, setMounted] = useState(0);
  const handover = useRef<() => void>(() => {});
  const stage = useRef<HTMLDivElement>(null);
  const rail = useRef<SVGPathElement>(null);
  const fallback = useRef<SVGPathElement>(null);
  const knots = useRef<(SVGCircleElement | null)[]>([]);
  const els = useRef<Els[]>(projects.map(() => ({ frame: null, swing: null, media: null, tint: null })));
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const strip = useRef<(HTMLButtonElement | null)[]>([]);
  // physics and layout live outside React: the rail repaints without re-rendering
  const st = useRef({
    pos: remembered, target: remembered, vel: 0, swing: 0, swingV: 0, last: 0, raf: 0, hover: -1, shown: remembered,
    develop: 1, inView: false, reduce: false, mobile: false,
    W: 1, printW: 1, A: anchorsFor(1, 0.34, 0.22, 50, 36),
    drag: null as null | { x: number; y: number; id: number; moved: boolean; start: number; lastT: number },
  });

  const paint = useCallback(() => {
    const s = st.current;
    const { W, printW, A } = s;
    const sag = s.reduce ? 0 : 6 + Math.min(12, Math.abs(s.vel) * 7);
    const sagAt = (x: number) => sag * Math.exp(-(((x - W / 2 + s.vel * 22) / 100) ** 2));
    const g = s.develop;
    els.current.forEach((o, i) => {
      if (!o.frame || !o.swing || !o.media || !o.tint) return;
      const pl = place(i - s.pos, A);
      const cx = W / 2 + pl.x, ny = RAIL_Y + sagAt(cx);
      const lift = s.hover === i && pl.d > 0.4 && !s.mobile ? -6 : 0;
      o.frame.style.width = `${printW}px`;
      o.frame.style.transform = `translate3d(${(cx - printW / 2).toFixed(2)}px, ${(ny + DROP + lift).toFixed(2)}px, 0) scale(${pl.s.toFixed(4)})`;
      o.frame.style.opacity = pl.d > 3.1 ? "0" : "1";
      o.frame.style.visibility = pl.d > 3.4 ? "hidden" : "";
      o.frame.style.zIndex = String(20 - Math.round(pl.d * 3));
      o.swing.style.transform = s.swing ? `rotate(${s.swing.toFixed(3)}deg)` : "";
      // develop: brightness, saturation and the crimson tint follow the distance from the centre
      const dev = g * Math.max(0, 1 - pl.d);
      const base = lerp(0.22, 0.5, g);
      const boost = s.hover === i && pl.d > 0.4 ? 0.22 : 0;
      const b = Math.min(1, base + (1 - base) * dev + boost), sat = Math.min(1, 0.55 + 0.45 * dev + boost);
      o.media.style.filter = b > 0.999 && sat > 0.999 ? "" : `brightness(${b.toFixed(3)}) saturate(${sat.toFixed(3)})`;
      const tint = Math.max(0, lerp(0.72, 0.38, g) * (1 - dev) - boost);
      o.tint.style.opacity = tint.toFixed(3);
      o.tint.style.visibility = tint < 0.002 ? "hidden" : ""; // no blend layer over the front frame
      o.frame.toggleAttribute("data-on", pl.d < 0.5);
      o.frame.toggleAttribute("data-peek", s.hover === i && pl.d > 0.5 && !s.mobile);
    });
    // the rail: from 150 px before the first frame to 150 px after the last, sagging at the centre
    const x0 = W / 2 + place(0 - s.pos, A).x - 150, x1 = W / 2 + place(LAST - s.pos, A).x + 150;
    let d = "";
    for (let x = Math.max(-10, x0); x <= Math.min(W + 10, x1); x += 6) d += `${d ? "L" : "M"}${x.toFixed(1)} ${(RAIL_Y + sagAt(x)).toFixed(2)}`;
    rail.current?.setAttribute("d", d);
    const nodeY = RAIL_Y + sagAt(W / 2);
    fallback.current?.setAttribute("d", `M${W / 2} 0 L${W / 2} ${nodeY.toFixed(2)}`);
    // knots: one per frame on screen (the front one crimson), and one at each end of the rail
    for (let i = 0; i < N + 2; i++) {
      const c = knots.current[i];
      if (!c) continue;
      const end = i >= N;
      const x = end ? (i === N ? x0 : x1) : W / 2 + place(i - s.pos, A).x;
      const far = end ? x < 0 || x > W : place(i - s.pos, A).d > 3.1 || x < -10 || x > W + 10;
      c.style.display = far ? "none" : "";
      if (far) continue;
      const on = !end && Math.abs(i - s.pos) < 0.5;
      c.setAttribute("cx", x.toFixed(1));
      c.setAttribute("cy", (RAIL_Y + sagAt(x)).toFixed(2));
      c.setAttribute("r", on ? "3.4" : end ? "2.6" : "2.2");
      c.toggleAttribute("data-on", on);
    }
    if (bar.current) bar.current.style.transform = `translateX(${(clamp(s.pos, 0, LAST) * 100).toFixed(2)}%)`;
    // the web's thread lands here
    if (stage.current) railNode.set({ el: stage.current, x: W / 2, y: nodeY });
    // the INFINOS clip plays only while it is the project in front and on screen
    const v = video.current;
    if (v) {
      const play = !s.reduce && s.inView && Math.abs(CLIP - s.pos) < 0.35;
      if (play && v.paused) v.play().catch(() => {});
      else if (!play && !v.paused) v.pause();
    }
    const ai = clamp(Math.round(s.pos), 0, LAST);
    if (ai !== s.shown) {
      s.shown = ai;
      remembered = ai;
      setShown(ai);
    }
  }, []);

  // the loop re-schedules itself through a ref (a callback can't name itself)
  const loop = useRef<FrameRequestCallback>(() => {});
  const tick = useCallback(
    (t: number) => {
      const s = st.current;
      const dt = Math.min(0.033, Math.max(0.001, (t - s.last) / 1000));
      s.last = t;
      const v0 = s.vel;
      if (!s.drag?.moved) {
        s.vel += (K * (s.target - s.pos) - C * s.vel) * dt;
        s.pos += s.vel * dt;
      }
      const acc = (s.vel - v0) / dt;
      s.swingV += (-SK * s.swing - SC * s.swingV - acc * SG) * dt;
      s.swing = clamp(s.swing + s.swingV * dt, -5, 5);
      paint();
      const moving = !!s.drag?.moved || Math.abs(s.target - s.pos) > 0.0008 || Math.abs(s.vel) > 0.002 || Math.abs(s.swing) > 0.02 || Math.abs(s.swingV) > 0.05;
      if (moving) s.raf = requestAnimationFrame(loop.current);
      else {
        s.raf = 0;
        s.pos = s.target;
        s.vel = s.swing = s.swingV = 0;
        paint();
        // hand the animation to the new front frame in idle time, unless the rail moves again first
        handover.current();
        const k = Math.round(s.target);
        handover.current = whenIdle(() => { if (!st.current.raf) setSettled(k); }, 500);
      }
    },
    [paint],
  );

  useEffect(() => {
    loop.current = tick;
  }, [tick]);

  const kick = useCallback(() => {
    const s = st.current;
    if (!s.raf) {
      s.last = performance.now();
      s.raf = requestAnimationFrame(tick);
    }
  }, [tick]);

  const go = useCallback(
    (i: number) => {
      const s = st.current;
      s.target = clamp(i, 0, LAST);
      if (s.reduce) {
        s.pos = s.target;
        s.vel = 0;
        paint();
        setSettled(Math.round(s.target));
        return;
      }
      kick();
    },
    [kick, paint],
  );

  const open = useCallback(() => {
    router.push(`/work/${projects[clamp(Math.round(st.current.target), 0, LAST)].slug}`);
  }, [router]);

  const hover = (i: number) => {
    st.current.hover = i;
    paint();
  };

  // layout, input and the develop-on-arrival, wired once
  useEffect(() => {
    const el = stage.current!;
    const s = st.current;
    s.reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const geometry = () => {
      const W = el.clientWidth;
      s.W = W;
      s.mobile = W < 720;
      if (W < 720) {
        s.printW = W * 0.82;
        s.A = anchorsFor(s.printW, 0.52, 0.34, 16, 12);
      } else if (W < 1024) {
        s.printW = W * 0.7;
        s.A = anchorsFor(s.printW, 0.4, 0.26, 28, 20);
      } else {
        // 60% of the width, up to 900 px, and short screens keep the caption in view
        s.printW = Math.min(W * 0.6, 900, Math.max(440, (window.innerHeight - 400) / 0.625));
        s.A = anchorsFor(s.printW, 0.34, 0.22, 50, 36);
      }
      el.style.height = `${Math.round(RAIL_Y + DROP + s.printW * 0.625 + (s.mobile ? 52 : 58))}px`;
    };

    // the darkroom moment: the frames arrive as dark exposures and develop as the rail rises.
    // The stage's page position is measured on resize only, never per scroll frame.
    let stageTop = 0;
    const measure = () => { stageTop = el.getBoundingClientRect().top + window.scrollY; };
    const develop = () => {
      if (s.reduce) return 1;
      const vh = window.innerHeight;
      return sm(0.66 * vh, 0.22 * vh, stageTop - window.scrollY + RAIL_Y);
    };
    let sraf = 0;
    const onScroll = () => {
      if (sraf) return;
      sraf = requestAnimationFrame(() => {
        sraf = 0;
        const g = develop();
        if (Math.abs(g - s.develop) > 0.002 || (g !== s.develop && (g === 0 || g === 1))) {
          s.develop = g;
          paint();
        }
      });
    };

    geometry();
    measure();
    s.develop = develop();
    paint();
    el.dataset.live = "true";
    const ro = new ResizeObserver(() => { geometry(); measure(); s.develop = develop(); paint(); });
    ro.observe(el);
    ro.observe(document.body); // content above the gallery changing height moves it
    const io = new IntersectionObserver(([e]) => { s.inView = e.isIntersecting; paint(); });
    io.observe(el);
    let cancelMount = () => {};
    let bits = 0;
    const next = () => {
      const here = Math.round(st.current.pos);
      let pick = -1;
      for (let i = 0; i < N; i++) if (!(bits & (1 << i)) && (pick < 0 || Math.abs(i - here) < Math.abs(pick - here))) pick = i;
      if (pick < 0) return;
      bits |= 1 << pick;
      setMounted(bits);
      cancelMount = whenIdle(next, 1200);
    };
    const mountLater = () => { cancelMount = whenIdle(next, 1200); };
    if (window.scrollY > 0) mountLater();
    else window.addEventListener("scroll", mountLater, { once: true, passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    // drag / swipe
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      s.drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, start: s.pos, lastT: performance.now() };
    };
    const move = (e: PointerEvent) => {
      const d = s.drag;
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x;
      if (!d.moved) {
        if (Math.abs(e.clientY - d.y) > 10 && Math.abs(e.clientY - d.y) > Math.abs(dx)) { s.drag = null; return; } // a vertical scroll
        if (Math.abs(dx) <= 7) return;
        d.moved = true;
        d.x = e.clientX;
        d.start = s.pos;
        el.dataset.dragging = "true";
        try { el.setPointerCapture(e.pointerId); } catch {}
        kick();
        return;
      }
      if (s.reduce) return;
      let np = d.start - (e.clientX - d.x) / s.A.X[1];
      if (np < 0) np *= 0.3; // rubber-band at the ends
      if (np > LAST) np = LAST + (np - LAST) * 0.3;
      const now = performance.now(), dt = Math.max(1, now - d.lastT) / 1000;
      s.vel = lerp(s.vel, (np - s.pos) / dt, 0.4);
      s.pos = np;
      d.lastT = now;
    };
    const up = (e: PointerEvent) => {
      const d = s.drag;
      if (!d || e.pointerId !== d.id) return;
      s.drag = null;
      delete el.dataset.dragging;
      if (d.moved) {
        if (s.reduce) go(Math.round(s.target) + (e.clientX < d.x ? 1 : -1));
        else {
          // release uses your speed. A swipe on a touch screen moves one project; a mouse drag can
          // travel further, and its flick carries at most one project past where you let go.
          const here = e.pointerType === "mouse" ? Math.round(s.pos) : Math.round(d.start);
          go(clamp(Math.round(s.pos + s.vel * 0.18), here - 1, here + 1));
        }
        return;
      }
      const hit = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
      if (!hit) return;
      const i = Number(hit.dataset.i);
      if (Math.abs(i - s.target) < 0.5) open();
      else go(i);
    };
    const cancel = () => {
      if (!s.drag) return;
      const moved = s.drag.moved;
      s.drag = null;
      delete el.dataset.dragging;
      if (moved) go(Math.round(s.pos));
    };
    // a clear horizontal two-finger swipe moves one project; vertical always scrolls the page
    let lastWheel = 0;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < 24 || Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.4) return;
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheel < 600) return;
      lastWheel = now;
      go(Math.round(s.target) + (e.deltaX > 0 ? 1 : -1));
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", mountLater);
      cancelMount();
      handover.current();
      cancelAnimationFrame(s.raf);
      cancelAnimationFrame(sraf);
      s.raf = 0;
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
      el.removeEventListener("wheel", wheel);
      railNode.set(null);
    };
  }, [go, kick, open, paint]);

  const keys = (e: React.KeyboardEvent, focusStrip: boolean) => {
    const t = Math.round(st.current.target);
    const map: Record<string, number> = { ArrowRight: t + 1, ArrowLeft: t - 1, Home: 0, End: LAST };
    if (e.key in map) {
      e.preventDefault();
      const k = clamp(map[e.key], 0, LAST);
      go(k);
      if (focusStrip) strip.current[k]?.focus();
    } else if (e.key === "Enter" && !focusStrip) {
      e.preventDefault();
      open();
    }
  };

  const p = projects[shown];
  const more = p.stack.length - 4;

  return (
    <div className="dl-gallery" role="region" aria-roledescription="carousel" aria-label="Selected work: six projects">
      <div
        ref={stage}
        className="dl-stage"
        tabIndex={0}
        aria-label="Project frames. Left and right arrow keys move between projects; Enter opens the case study."
        onKeyDown={(e) => keys(e, false)}
      >
        <svg aria-hidden="true" className="dl-lines">
          <defs>
            <linearGradient id="dl-fallback-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--color-red)" stopOpacity="0" />
              <stop offset="1" stopColor="var(--color-red)" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {/* without WebGL the thread is drawn here instead of by the web */}
          <path ref={fallback} className="dl-thread-fallback" />
          <path ref={rail} className="dl-rail" />
          {Array.from({ length: N + 2 }, (_, i) => (
            <circle key={i} ref={(c) => { knots.current[i] = c; }} className="dl-knot" r="2.2" />
          ))}
        </svg>
        {projects.map((q, i) => {
          const on = i === shown;
          return (
            <div
              key={q.slug}
              ref={(f) => { els.current[i].frame = f; }}
              data-i={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${q.index} of ${two(N)}: ${q.title}`}
              aria-hidden={!on}
              className={`dl-frame ${q.evidence.includes("concept") ? "is-concept" : ""}`}
            >
              <div ref={(w) => { els.current[i].swing = w; }} className="dl-swing">
                <span aria-hidden="true" className="dl-wire" />
                <div className="dl-media">
                  <div ref={(m) => { els.current[i].media = m; }} className="dl-media__fx">
                    <FrameMedia p={q} eager={i < 3} live={i === settled} mount={!!(mounted & (1 << i))} video={q.slug === "infinos" ? video : undefined} />
                  </div>
                  <span ref={(t) => { els.current[i].tint = t; }} aria-hidden="true" className="dl-tint" />
                </div>
                <span aria-hidden="true" className="dl-ticks"><i /><i /><i /><i /></span>
                <p className="dl-note">
                  <span className="dl-note__n">{q.index}</span> <b>{NOTES[q.slug].lead}</b> · {NOTES[q.slug].rest}
                </p>
                <span aria-hidden="true" className="dl-name">{q.title}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {`Project ${shown + 1} of ${N}, ${p.title}, ${p.status}.`}
      </p>

      {/* the caption: rises when a project lands */}
      <div key={p.slug} className="dl-cap">
        <div>
          <p className="dl-kicker"><b>{p.index}</b> {p.category}</p>
          <h3 className="dl-title">{p.title}</h3>
          <p className="dl-tag">{p.tagline}</p>
        </div>
        <div>
          <p className="dl-one">{p.oneLine}</p>
          <dl className="dl-spec">
            <dt>Status</dt>
            <dd>{p.status}</dd>
            <dt>My part</dt>
            <dd>{p.eight.did}</dd>
            <dt>Stack</dt>
            <dd>
              {p.stack.slice(0, 4).join(" · ")}
              {more > 0 && <span className="text-dim"> · +{more} more</span>}
            </dd>
          </dl>
        </div>
        <div className="dl-cap__go">
          <Link href={`/work/${p.slug}`} className="dl-cta">
            Explore the case study<span className="sr-only">: {p.title}</span> <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* the strip: six names, and a crimson bar that slides with the rail */}
      <div className="dl-nav">
        <ol className="dl-strip" aria-label="Projects" onKeyDown={(e) => keys(e, true)}>
          <span ref={bar} aria-hidden="true" className="dl-bar" />
          {projects.map((q, i) => (
            <li key={q.slug}>
              <button
                ref={(b) => { strip.current[i] = b; }}
                type="button"
                aria-current={i === shown ? "true" : undefined}
                aria-label={`${q.index} ${q.title}`}
                onClick={() => go(i)}
                onPointerEnter={() => hover(i)}
                onPointerLeave={() => hover(-1)}
              >
                <span className="dl-strip__n">{q.index}</span>
                <span className="dl-strip__t">{q.title}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="dl-pager">
          <button type="button" onClick={() => go(Math.round(st.current.target) - 1)} disabled={shown === 0} aria-label={shown > 0 ? `Previous project: ${projects[shown - 1].title}` : "Previous project"}>
            <span aria-hidden="true">←</span>
          </button>
          <span className="dl-pager__count" aria-hidden="true">
            <span className="text-text">{p.index}</span> / {two(N)}
          </span>
          <button type="button" onClick={() => go(Math.round(st.current.target) + 1)} disabled={shown === LAST} aria-label={shown < LAST ? `Next project: ${projects[shown + 1].title}` : "Next project"}>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <p className="dl-how" aria-hidden="true">
        Drag, swipe or use <kbd>←</kbd> <kbd>→</kbd> · click the front frame to open
      </p>
    </div>
  );
}
