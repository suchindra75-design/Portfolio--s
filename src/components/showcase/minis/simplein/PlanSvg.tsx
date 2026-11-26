import { useId, type CSSProperties, type Ref } from "react";
import { ROLES } from "./plan";
import { CORE, GATES, GATE_NAMES, LIDS, PL, RLS, VAULTS, WING_ROT, WINGS, rot, twoLines, type R } from "./geometry";
import { PLAN_CSS } from "./planCss";

/** Class names (see planCss.ts). */
const css = {
  svg: "sps-svg",
  anim: "sps-anim",
  s: "sps-s",
  f: "sps-f",
  sf: "sps-sf",
  t: "sps-t",
  mini: "sps-mini",
  pulse: "sps-pulse",
  dot: "sps-dot",
  hl: "sps-hl",
  fallback: "sps-fallback",
};

export type PlanColors = {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
};

/** A rectangle as a closed path (pathLength works on <path> everywhere, unlike on <rect>). */
const d = (r: R) => `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}Z`;

// Model palette, inside the DESIGN.md family: travertine board, bone walls, terracotta core.
const PLINTH = "#DED0BB";
const WALL = "#F4ECE1";
const ROOM = "#E9DDCB";

type Variant = "hero" | "mini" | "fallback";

/**
 * SIMPLEIN's system plan as an architect's line drawing (the same plan as the 3D model).
 *   hero      draws itself wing by wing on mount (≤ 1.2 s), then rests; full annotation.
 *   mini      draws itself on first sight, then one wing at a time lights while a request walks in.
 *   fallback  static, for the walkthrough without WebGL; the current wing is set by data-wing.
 * Always decorative (aria-hidden): the page says everything it shows in text.
 */
export function PlanSvg({
  variant,
  colors,
  className,
  style,
  svgRef,
  grid = true,
}: {
  variant: Variant;
  colors: PlanColors;
  className?: string;
  style?: CSSProperties;
  svgRef?: Ref<SVGSVGElement>;
  /** Draw the drafting grid past the drawing (off when the host paints its own). */
  grid?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const full = variant !== "mini";
  const anim = variant !== "fallback";
  const { ink, accent, accent2, muted } = colors;
  const hair = full ? 0.07 : 0.11;
  const delay = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;
  const wingDelay = (k: number) => 0.14 + k * 0.15;
  const vb = variant === "mini" ? "-36 -29.4 72 58.8" : "-31 -31 62 62";

  const cls = [css.svg, anim ? css.anim : "", variant === "mini" ? css.mini : "", variant === "fallback" ? css.fallback : "", className ?? ""].filter(Boolean).join(" ");

  return (
    <>
      <style href="simplein-plan" precedence="medium">
        {PLAN_CSS}
      </style>
      <svg ref={svgRef} viewBox={vb} preserveAspectRatio="xMidYMid meet" className={cls} style={style} aria-hidden="true" focusable="false">
        <defs>
          <pattern id={`g${uid}`} width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M4 0H0V4" fill="none" stroke={ink} strokeOpacity="0.07" strokeWidth={full ? 0.04 : 0.07} />
          </pattern>
        </defs>

        {/* Drafting grid, running past the drawing to the edges of any box */}
        {grid && <rect x="-300" y="-300" width="600" height="600" fill={`url(#g${uid})`} />}

        {/* The plinth: its shadow, its recessed base, its board */}
        <g style={delay(0)}>
          <path d={d({ x: -PL + 0.9, y: -PL + 1.3, w: PL * 2, h: PL * 2 })} fill={ink} fillOpacity="0.09" className={css.f} />
          <path d={d({ x: -PL, y: -PL, w: PL * 2, h: PL * 2 })} pathLength={1} fill={PLINTH} stroke={ink} strokeOpacity="0.55" strokeWidth={hair * 1.4} className={css.sf} />
          {full && (
            <path
              d={d({ x: -PL + 1, y: -PL + 1, w: PL * 2 - 2, h: PL * 2 - 2 })}
              pathLength={1}
              fill="none"
              stroke={ink}
              strokeOpacity="0.25"
              strokeWidth={hair * 0.7}
              className={css.s}
            />
          )}
        </g>

        {/* Four wings, drawn one after another */}
        {WINGS.map((w, k) => {
          const deg = WING_ROT[k];
          const solids = [...w.walls, ...w.partitions, ...w.passage, ...w.piers, ...w.courtyard];
          return (
            <g key={k} transform={`rotate(${deg})`} style={{ ...delay(wingDelay(k)), "--k": k } as CSSProperties}>
              {w.rooms.map((r, i) => (
                <path key={i} d={d(r.r)} fill={ROOM} className={css.f} />
              ))}
              {/* Lit rooms: the mini's idle pulse, or the fallback's current wing */}
              {variant === "mini" && (
                <g className={css.pulse}>
                  {w.rooms.map((r, i) => (
                    <path key={i} d={d(r.r)} fill={accent} fillOpacity="0.3" />
                  ))}
                </g>
              )}
              {variant === "fallback" && (
                <g className={css.hl} data-k={k}>
                  {w.rooms.map((r, i) => (
                    <path key={i} d={d(r.r)} fill={accent} fillOpacity="0.26" />
                  ))}
                </g>
              )}
              {/* Cast shadow of the walls (the model is lit from the north-west) */}
              <g transform="translate(0.16 0.22)" className={css.t}>
                {solids.map((r, i) => (
                  <path key={i} d={d(r)} fill={ink} fillOpacity="0.16" />
                ))}
              </g>
              {solids.map((r, i) => (
                <path key={i} d={d(r)} pathLength={1} fill={WALL} stroke={ink} strokeOpacity="0.8" strokeWidth={hair} className={css.sf} />
              ))}
              {/* Gate lintels: overhead, so dashed */}
              {full &&
                w.lintels.map((g) => (
                  <path key={g} d={`M-1.42 ${g}H1.42`} stroke={ink} strokeOpacity="0.55" strokeWidth={hair * 0.8} strokeDasharray="0.22 0.16" className={css.t} />
                ))}
              {/* The request's path (verdigris inlay): portway → passage → core */}
              <path
                d={`M0 ${w.path[1]}V${w.path[0]}`}
                pathLength={1}
                stroke={accent2}
                strokeWidth={full ? 0.1 : 0.16}
                fill="none"
                className={css.s}
                style={delay(wingDelay(k) + 0.12)}
              />
              {variant === "mini" && <circle r="0.55" fill={accent2} className={css.dot} />}
            </g>
          );
        })}

        {/* The core: two tenant vaults and the policy wall between them */}
        <g style={delay(0.62)}>
          {VAULTS.map((r, i) => (
            <path key={i} d={d(r)} pathLength={1} fill={WALL} stroke={ink} strokeOpacity="0.8" strokeWidth={hair} className={css.sf} />
          ))}
          {LIDS.map((r, i) => (
            <path key={i} d={d(r)} fill="none" stroke={ink} strokeOpacity="0.4" strokeWidth={hair * 0.8} strokeDasharray="0.3 0.2" className={css.t} />
          ))}
          <path d={d(RLS)} fill={accent} className={css.f} />
          <path d={`M0 ${RLS.y - 0.9}V${RLS.y + RLS.h + 0.9}`} stroke={accent} strokeWidth={hair} strokeDasharray="0.5 0.25" className={css.t} />
          <g className={css.t} fill={ink} fontFamily="var(--font-display), Georgia, serif" fontStyle="italic" fontWeight="300" textAnchor="middle">
            <text x={-1.59} y={0.5} fontSize={1.5}>
              A
            </text>
            <text x={1.59} y={0.5} fontSize={1.5}>
              B
            </text>
          </g>
          {full && (
            <g className={css.t} fill={ink} fillOpacity="0.7" fontFamily="var(--font-mono), monospace" fontSize={0.3} letterSpacing={0.06}>
              <text x={-0.4} y={3.62} textAnchor="end">
                POSTGRES
              </text>
              <text x={0.4} y={3.62}>
                ROW-LEVEL SECURITY
              </text>
              <text x={-1.59} y={-2.85} textAnchor="middle" fillOpacity="0.55">
                TENANT
              </text>
              <text x={1.59} y={-2.85} textAnchor="middle" fillOpacity="0.55">
                TENANT
              </text>
            </g>
          )}
        </g>

        {/* Wing names, cut into the board beyond each portway */}
        <g fill={ink} fontFamily="var(--font-display), Georgia, serif" fontWeight="300" textAnchor="middle">
          {ROLES.map((r, k) => {
            const p = rot(0, 26.55, WING_ROT[k]);
            const turn = k === 1 ? -90 : k === 3 ? 90 : 0;
            return (
              <text
                key={r.name}
                x={p.x}
                y={p.y}
                dominantBaseline="central"
                fontSize={full ? 1.55 : 2.1}
                fontStyle={k === 0 ? "normal" : "italic"}
                transform={turn ? `rotate(${turn} ${p.x} ${p.y})` : undefined}
                className={css.t}
                style={delay(wingDelay(k))}
              >
                {r.name}
              </text>
            );
          })}
        </g>

        {/* Room labels: one per genuine module */}
        {full && (
          <g fontFamily="var(--font-mono), monospace" textAnchor="middle">
            {WINGS.map((w, k) => {
              const turn = k === 1 ? -90 : k === 3 ? 90 : 0;
              return (
                <g key={k} className={css.t} style={delay(wingDelay(k) + 0.1)}>
                  {w.rooms.map((r) => {
                    const p = rot(r.cx, r.cy, WING_ROT[k]);
                    const lines = twoLines(r.label.toUpperCase(), 15);
                    const y0 = p.y - (lines.length - 1) * 0.33 + 0.2;
                    return (
                      <g key={r.code} transform={turn ? `rotate(${turn} ${p.x} ${p.y})` : undefined}>
                        <text x={p.x} y={y0 - 0.78} fontSize={0.34} letterSpacing={0.08} fill={muted}>
                          {r.code}
                        </text>
                        {lines.map((l, i) => (
                          <text key={l} x={p.x} y={y0 + i * 0.66} fontSize={0.5} letterSpacing={0.05} fill={ink} fillOpacity="0.78">
                            {l}
                          </text>
                        ))}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        )}

        {/* The passage's three gates, named on the Student side (a request meets Auth first) */}
        {full && (
          <g fontFamily="var(--font-mono), monospace" fontSize={0.36} letterSpacing={0.08} fill={ink} fillOpacity="0.72" className={css.t} style={delay(0.7)}>
            {GATES.map((g, i) => (
              <text key={g} x={g + 0.12} y={-1.75} transform={`rotate(-90 ${g + 0.12} -1.75)`}>
                {GATE_NAMES[i].toUpperCase()}
              </text>
            ))}
            <text x={CORE + 0.6} y={2.25} fontSize={0.32} fillOpacity="0.55">
              /API/V1
            </text>
          </g>
        )}

        {/* Title block and north point, as on a drawing */}
        <g className={css.t} style={delay(0.5)} fontFamily="var(--font-mono), monospace" fill={ink}>
          {full ? (
            <g className="sps-tb">
              <path d={`M${PL - 14.6} ${-PL + 1.9}H${PL - 1.4}`} stroke={ink} strokeOpacity="0.35" strokeWidth={hair * 0.8} />
              <text x={PL - 1.4} y={-PL + 3.05} textAnchor="end" fontSize={0.62} letterSpacing={0.12} fillOpacity="0.8">
                SIMPLEIN SCHOOL — SYSTEM PLAN
              </text>
              <text x={PL - 1.4} y={-PL + 3.85} textAnchor="end" fontSize={0.36} letterSpacing={0.09} fillOpacity="0.55">
                DIAGRAM · A MODEL OF THE SYSTEM, NOT A SCREEN
              </text>
              <text x={PL - 1.4} y={-PL + 4.45} textAnchor="end" fontSize={0.36} letterSpacing={0.09} fillOpacity="0.55">
                4 PORTALS · 1 API · TENANTS SEALED BY ROW-LEVEL SECURITY
              </text>
            </g>
          ) : (
            <text x={PL - 1.6} y={-PL + 3} textAnchor="end" fontSize={0.95} letterSpacing={0.16} fillOpacity="0.7">
              SYSTEM PLAN
            </text>
          )}
          <g transform={`translate(${PL - 3.2} ${PL - 3.2})`} fillOpacity="0.6">
            <circle r="1.1" fill="none" stroke={ink} strokeOpacity="0.55" strokeWidth={hair * 0.8} />
            <path d="M0 -1.1L0.3 0.4L0 0.15L-0.3 0.4Z" />
            <text y={-1.45} textAnchor="middle" fontSize={0.55}>
              N
            </text>
          </g>
        </g>
      </svg>
    </>
  );
}
