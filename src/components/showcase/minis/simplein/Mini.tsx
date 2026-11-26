"use client";

import { useEffect, useRef } from "react";
import { useMiniLive } from "../lib";
import type { WorldProps } from "../types";
import { PlanSvg } from "./PlanSvg";

/**
 * MINI: the system plan as a line drawing that draws itself wing by wing, then lights one wing
 * at a time while a request walks in to the terracotta core. Animates only while visible
 * (data-live); static under reduced motion. 2D SVG, aria-hidden.
 */
export function Mini({ project }: WorldProps) {
  const ref = useRef<SVGSVGElement>(null);
  const live = useMiniLive();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-live", e.isIntersecting && live), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [live]);
  const w = project.world;
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ background: w.bg }}>
      <PlanSvg variant="mini" svgRef={ref} colors={w} className="absolute inset-0 h-full w-full" />
      {/* A warm wash of daylight from the upper left, as on the model */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 18% 0%, rgba(255,217,160,0.22), transparent 60%)" }} />
    </div>
  );
}
