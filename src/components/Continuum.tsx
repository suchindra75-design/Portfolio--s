"use client";

import { useEffect, useRef } from "react";
import { HeroWeb } from "./hero-web/HeroWeb";

/**
 * ONE ENVIRONMENT (Phase 4, docs/interactive/PHASE4-DARKROOM-LINE.md). The hero and the work share
 * one night: the 3D web is drawn on a single one-screen canvas that sticks behind both, so it is
 * never cut by a section edge. Neither section paints a background of its own.
 *
 * As the page scrolls, the portrait layer leaves at page speed and fades out (it is fully gone by
 * about two thirds of a screen), while the web tilts back and dims (scene.ts). Nothing is pinned and
 * nothing plays on its own: every value follows the scroll position. Decorative and pointer-free;
 * without WebGL the page is simply black and everything still works.
 */
const sm = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function Continuum({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = scope.current?.querySelector<HTMLElement>("#top");
    if (!hero) return;
    let raf = 0, last = -1;
    const apply = () => {
      raf = 0;
      const p = window.scrollY / Math.max(1, hero.offsetHeight);
      const a = 1 - sm(0.36, 0.68, p);
      if (Math.abs(a - last) < 0.002) return;
      last = a;
      hero.style.opacity = a < 1 ? a.toFixed(3) : "";
      // gone: let clicks fall through to whatever is under it
      hero.style.visibility = a <= 0.001 ? "hidden" : "";
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      hero.style.opacity = "";
      hero.style.visibility = "";
    };
  }, []);

  return (
    <div ref={scope} className="continuum relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <HeroWeb scope={scope} />
      </div>
      {children}
    </div>
  );
}
