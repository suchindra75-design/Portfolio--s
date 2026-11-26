import { memo } from "react";
import { COLD_MAX, SESSIONS, Y_HI, Y_LO, Y_TICKS, areaPath, gapX, tracePath, yAt } from "./data";

/** Shared colours (DESIGN.md palette; verdigris = data, apricot = hot / out of range). */
export const C = {
  /** Field 1 (the one the app reads as the cold compartment) */
  one: "#D8C7B0",
  /** Field 2 */
  two: "#5FB8A0",
  hot: "#FFB26B",
  grid: "#F2E9DD",
};

const W = 1000;
const H = 400;

/** Precomputed once per module: the two recorded traces in a 1000 × 400 box. */
export const PATHS = { f1: tracePath("f1", W, H), f2: tracePath("f2", W, H), f2Area: areaPath("f2", W, H) };
/** The Mini's tighter range, so the small trace has some shape. */
export const MINI_RANGE = { lo: 4, hi: 30 };
export const MINI_PATHS = {
  f1: tracePath("f1", W, H, MINI_RANGE.lo, MINI_RANGE.hi),
  f2: tracePath("f2", W, H, MINI_RANGE.lo, MINI_RANGE.hi),
  f2Area: areaPath("f2", W, H, MINI_RANGE.lo, MINI_RANGE.hi),
};

/**
 * The instrument field: a fine grid, gap breaks between recording sessions and the cold-max
 * hairline. Stretches to its box (preserveAspectRatio none) with strokes kept at screen width.
 */
export const Grid = memo(function Grid({
  cols = 24,
  strong = 0.09,
  faint = 0.045,
  threshold = true,
  lo = Y_LO,
  hi = Y_HI,
  ticks = Y_TICKS,
}: {
  cols?: number;
  strong?: number;
  faint?: number;
  threshold?: boolean;
  lo?: number;
  hi?: number;
  ticks?: number[];
}) {
  const y = (v: number) => yAt(v, lo, hi) * H;
  const ty = y(COLD_MAX);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <g stroke={C.grid} vectorEffect="non-scaling-stroke">
        {Array.from({ length: cols + 1 }, (_, i) => (
          <line key={`v${i}`} x1={(i / cols) * W} x2={(i / cols) * W} y1={0} y2={H} strokeOpacity={faint} vectorEffect="non-scaling-stroke" />
        ))}
        {ticks.map((t) => (
          <line key={`h${t}`} x1={0} x2={W} y1={y(t)} y2={y(t)} strokeOpacity={t === ticks[0] ? strong * 2 : strong} vectorEffect="non-scaling-stroke" />
        ))}
        {/* minor rows between the labelled ones */}
        {ticks.slice(0, -1).map((t, k) => (
          <line key={`m${t}`} x1={0} x2={W} y1={y((t + ticks[k + 1]) / 2)} y2={y((t + ticks[k + 1]) / 2)} strokeOpacity={faint} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {/* breaks between recording sessions: a pair of short slashes on the baseline */}
      {SESSIONS.slice(1).map((_, k) => {
        const x = gapX(k + 1) * W;
        return (
          <g key={`g${k}`} stroke={C.grid} strokeOpacity={0.35} vectorEffect="non-scaling-stroke">
            <line x1={x} x2={x} y1={0} y2={H} strokeOpacity={0.22} strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
      {threshold && <line x1={0} x2={W} y1={ty} y2={ty} stroke={C.hot} strokeOpacity={0.75} strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
});

/** One recorded trace, stretched to its box. Memoised: the replay re-renders on every reading. */
export const Trace = memo(function Trace({ d, color, width = 1.5, opacity = 1 }: { d: string; color: string; width?: number; opacity?: number }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
});

/** A soft wash under a trace, fading out downwards (a CSS mask, so no SVG gradient ids). */
export function Area({ d, color, opacity = 0.14 }: { d: string; color: string; opacity?: number }) {
  const mask = "linear-gradient(to bottom, #000 12%, transparent 78%)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true" style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <path d={d} fill={color} fillOpacity={opacity} />
    </svg>
  );
}
