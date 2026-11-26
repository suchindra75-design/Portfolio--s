"use client";

import { useRef } from "react";
import { HeroWeb } from "./hero-web/HeroWeb";

/**
 * ONE CONTINUOUS NIGHT (Phase 3, docs/interactive/PHASE3-CONTINUOUS.md). The hero and the work
 * share one environment: the Phase 1 web is drawn on a single one-screen canvas that sticks behind
 * both sections, and the camera descends through it as the page scrolls. Neither section paints a
 * background of its own, so there is no boundary to see. The layer is decorative and never takes
 * pointer events; without WebGL the page is simply black and everything still works.
 */
export function Continuum({ children }: { children: React.ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  return (
    <div ref={host} className="continuum relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <HeroWeb host={host} />
      </div>
      {children}
    </div>
  );
}
