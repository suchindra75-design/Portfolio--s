"use client";

import { useRef } from "react";
import type { WorldProps } from "../types";
import { Area, C, Grid, MINI_PATHS, MINI_RANGE, Trace } from "./Plot";
import { WorldStyles } from "./styles";
import { useInView } from "./useInView";
import { useMiniLive } from "../lib";
import { COLD_MAX, yAt } from "./data";

/**
 * Mini: the bag's recorded trace drawing itself across a dark instrument grid, with the
 * cold-max hairline. Pure CSS animation that runs only while on screen; off screen, without JS
 * and under reduced motion it rests as the complete trace.
 */
export function Mini({ project }: WorldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useMiniLive();
  const run = useInView(ref) && live;
  return (
    <div ref={ref} aria-hidden="true" className={`@container absolute inset-0 overflow-hidden ${run ? "inf-run" : ""}`} style={{ background: project.world.bg }}>
      <WorldStyles />
      {/* a faint warm falloff so the field has depth, not a flat fill */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 78% 18%, rgba(90,30,36,0.42), transparent 62%)" }} />
      <div className="absolute inset-0 rounded-[inherit] border border-[#F2E9DD]/[0.07]" />
      <div className="absolute inset-x-[7%] top-[22%] bottom-[16%]">
        <Grid cols={20} lo={MINI_RANGE.lo} hi={MINI_RANGE.hi} ticks={[4, 12, 20, 28]} />
        <div className="inf-mini-draw absolute inset-0">
          <Area d={MINI_PATHS.f2Area} color={C.two} opacity={0.16} />
          <Trace d={MINI_PATHS.f1} color={C.one} width={1.1} opacity={0.5} />
          <Trace d={MINI_PATHS.f2} color={C.two} width={1.8} />
        </div>
        <div className="inf-mini-head pointer-events-none absolute inset-0">
          <div className="absolute inset-y-[-6%] right-0 w-px" style={{ background: C.grid, opacity: 0.55 }} />
        </div>
        <span className="t-label absolute right-0 -translate-y-[130%] text-[0.55rem] text-[#FFB26B]/80 @max-[15rem]:hidden" style={{ top: `${yAt(COLD_MAX, MINI_RANGE.lo, MINI_RANGE.hi) * 100}%` }}>
          {COLD_MAX.toFixed(1)}
        </span>
      </div>
      <div className="t-label absolute left-[7%] right-[7%] top-[8%] flex items-center justify-between gap-3 text-[0.58rem] text-[var(--w-muted,#A8968C)] @max-[15rem]:hidden">
        <span className="flex items-center gap-2">
          <span className="inline-block size-1.5 rounded-full" style={{ background: C.two }} />
          Recorded data · replayed
        </span>
        <span>11–17 Sep 2026</span>
      </div>
    </div>
  );
}
