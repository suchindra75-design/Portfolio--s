"use client";

import { useEffect, useRef } from "react";
import { isVerse } from "./Dimension";
import { sfx } from "./Sfx";
import { scrollToY } from "@/lib/scroll";

/**
 * THE DROP LINE. One strand hangs from the top-right corner. Its length is how far down the page
 * you are; scrolling swings it like a pendulum (fast scrolls kick harder). Click the weight at its
 * end to zip back up. Mouse screens only; the loop runs only while it is moving.
 */
export function DropLine() {
  const svg = useRef<SVGSVGElement>(null);
  const line = useRef<SVGLineElement>(null);
  const bob = useRef<SVGGElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!matchMedia("(pointer: fine) and (min-width: 768px)").matches) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = svg.current!, ln = line.current!, b = bob.current!, button = btn.current!;
    s.style.display = "block";
    button.style.display = "block";

    let L = 48, Lt = 48; // length now and target (px)
    let th = 0, w = 0; // angle (rad) and angular velocity
    let lastY = scrollY, lastT = performance.now();
    let raf = 0, prev = 0;
    const AX = () => innerWidth - 22;

    const target = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, scrollY / max) : 0;
      Lt = 48 + p * (innerHeight * 0.62);
      button.tabIndex = p > 0.04 ? 0 : -1;
      button.style.visibility = p > 0.04 ? "visible" : "hidden";
    };
    const paint = () => {
      const ax = AX();
      const x = ax + Math.sin(th) * L, y = Math.cos(th) * L;
      ln.setAttribute("x1", String(ax));
      ln.setAttribute("x2", x.toFixed(1));
      ln.setAttribute("y2", y.toFixed(1));
      b.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((-th * 180) / Math.PI).toFixed(1)})`);
      button.style.transform = `translate(${(x - 20).toFixed(1)}px, ${(y - 20).toFixed(1)}px)`;
    };
    const tick = (t: number) => {
      const dt = Math.min(0.033, (t - (prev || t)) / 1000);
      prev = t;
      L += (Lt - L) * (1 - Math.exp(-dt * (reduce ? 60 : 7)));
      if (!reduce) {
        const g = 2400; // px/s², tuned for a lively but heavy swing
        w += (-(g / Math.max(60, L)) * Math.sin(th) - 1.6 * w) * dt;
        th += w * dt;
      } else { th = 0; w = 0; }
      paint();
      if (Math.abs(Lt - L) < 0.3 && Math.abs(th) < 0.002 && Math.abs(w) < 0.002) {
        L = Lt; th = 0; w = 0; paint();
        raf = 0; prev = 0;
      } else raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      const now = performance.now();
      const v = (scrollY - lastY) / Math.max(8, now - lastT); // px per ms
      lastY = scrollY; lastT = now;
      // scrolling down drags the weight back (it lags), up flicks it forward
      w += Math.max(-1.2, Math.min(1.2, v * 0.55));
      target();
      kick();
    };
    const onResize = () => { target(); kick(); };
    const onClick = () => {
      if (isVerse()) {
        const r = button.getBoundingClientRect();
        sfx("THWIP!", r.left - 40, r.top + 24);
      }
      w -= 1.6;
      scrollToY(0, { immediate: reduce });
      document.getElementById("main")?.focus({ preventScroll: true });
    };

    target();
    L = Lt;
    paint();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize);
    button.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onResize);
      button.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <>
      <svg ref={svg} aria-hidden="true" className="drop-line pointer-events-none fixed inset-0 z-[45] hidden h-full w-full overflow-visible">
        <line ref={line} x1="0" y1="0" x2="0" y2="48" className="drop-line__strand" />
        <g ref={bob} className="drop-line__bob">
          <circle r="9" className="drop-line__ring" />
          <line x1="-14" y1="0" x2="-11" y2="0" />
          <line x1="11" y1="0" x2="14" y2="0" />
          <line x1="0" y1="11" x2="0" y2="14" />
          <circle r="2.2" className="drop-line__dot" />
        </g>
      </svg>
      <button ref={btn} type="button" aria-label="Back to top" className="drop-line__hit fixed left-0 top-0 z-[46] hidden size-10 rounded-full" />
    </>
  );
}
