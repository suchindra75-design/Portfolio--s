"use client";

import { projects } from "@/content/projects";

/**
 * THE ATLAS: the six projects as destinations on one web, in the same silk as the hero's 3D web
 * but drawn as plain SVG (no second WebGL context). A hub; six project strands; an irregular
 * capture spiral; sagging threads between neighbours. The selected strand carries a crimson pulse
 * from the hub. Pointer-only by design: the numbered index beside it is the keyboard and
 * screen-reader route to the same choice, so the drawing itself is aria-hidden.
 */
const C = { x: 200, y: 196 };
// angle (deg, clockwise from up) and radius for each project node: an uneven ring, like a real web
const NODES = [
  { a: -58, r: 150 },
  { a: -8, r: 162 },
  { a: 44, r: 146 },
  { a: 104, r: 158 },
  { a: 160, r: 140 },
  { a: 218, r: 166 },
];
const pt = (a: number, r: number) => {
  const t = ((a - 90) * Math.PI) / 180;
  // rounded: server and browser trigonometry differ in the last digits, which breaks hydration
  return { x: Math.round((C.x + Math.cos(t) * r) * 100) / 100, y: Math.round((C.y + Math.sin(t) * r) * 100) / 100 };
};
const NODE_PT = NODES.map((n) => pt(n.a, n.r));
// twelve radials: the six project strands and one between each pair
const RADIALS = Array.from({ length: 12 }, (_, k) => {
  const i = Math.floor(k / 2);
  const a = k % 2 === 0 ? NODES[i].a : (NODES[i].a + (NODES[(i + 1) % 6].a + (i === 5 ? 360 : 0))) / 2;
  const r = k % 2 === 0 ? NODES[i].r : 176;
  return { a, r };
});
/** Capture spiral as a few irregular rings, each span sagging a little toward the hub. */
const RINGS = [46, 74, 100, 124].map((f, ri) => {
  const pts = RADIALS.map((rad, k) => pt(rad.a, Math.min(rad.r, f * (0.94 + (((k * 7 + ri * 3) % 5) / 5) * 0.12))));
  return pts
    .map((p, k) => {
      const q = pts[(k + 1) % pts.length];
      const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      const sag = 0.06;
      const c = { x: m.x + (C.x - m.x) * sag, y: m.y + (C.y - m.y) * sag + 2 };
      return `${k ? "" : `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    })
    .join(" ");
});
/** Frame threads between neighbouring project nodes, sagging under gravity. */
const FRAME = NODE_PT.map((p, k) => {
  const q = NODE_PT[(k + 1) % 6];
  const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 + 14 };
  return `M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${m.x.toFixed(1)} ${m.y.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
});

/** Short names for the drawing (the index beside it carries the full ones). */
const SHORT: Record<string, string> = { "infinos-telemetry": "Telemetry", "brain-matrix": "Brain Matrix", "simplein-school": "SIMPLEIN", "esp32-home-automation": "ESP32" };

export function Atlas({ active, hover, onHover, onSelect }: { active: number; hover: number; onHover: (i: number) => void; onSelect: (i: number) => void }) {
  return (
    <svg viewBox="-70 0 540 400" aria-hidden="true" className="atlas block w-full" onPointerLeave={() => onHover(-1)}>
      <g className="atlas-silk">
        {RADIALS.map((r, k) => {
          const e = pt(r.a, r.r + 26);
          return <line key={k} x1={C.x} y1={C.y} x2={e.x} y2={e.y} className={k % 2 ? "atlas-radial" : "atlas-radial atlas-radial--main"} />;
        })}
        {RINGS.map((d, k) => (
          <path key={k} d={d} className="atlas-ring" />
        ))}
        {FRAME.map((d, k) => (
          <path key={k} d={d} className={`atlas-frame ${projects[k].evidence.includes("concept") || projects[(k + 1) % 6].evidence.includes("concept") ? "is-dashed" : ""}`} />
        ))}
      </g>

      {/* the selected strand, with a pulse that runs out from the hub each time it changes */}
      <line key={`a${active}`} x1={C.x} y1={C.y} x2={NODE_PT[active].x} y2={NODE_PT[active].y} pathLength={1} className={`atlas-active ${projects[active].evidence.includes("concept") ? "is-dashed" : ""}`} />
      {hover >= 0 && hover !== active && <line x1={C.x} y1={C.y} x2={NODE_PT[hover].x} y2={NODE_PT[hover].y} className="atlas-preview" />}
      <circle cx={C.x} cy={C.y} r="3.2" className="atlas-hub" />

      {projects.map((q, k) => {
        const p = NODE_PT[k];
        const concept = q.evidence.includes("concept");
        const right = p.x >= C.x;
        return (
          <g
            key={q.slug}
            className={`atlas-node ${k === active ? "is-active" : ""} ${k === hover ? "is-hover" : ""} ${concept ? "is-concept" : ""}`}
            onPointerEnter={() => onHover(k)}
            onClick={() => onSelect(k)}
          >
            <circle cx={p.x} cy={p.y} r="22" className="atlas-hit" />
            <circle cx={p.x} cy={p.y} r="11" className="atlas-halo" />
            <circle cx={p.x} cy={p.y} r="4.5" className="atlas-dot" />
            <text x={p.x + (right ? 16 : -16)} y={p.y + 4} textAnchor={right ? "start" : "end"} className="atlas-label">
              <tspan className="atlas-num">{q.index}</tspan> {SHORT[q.slug] ?? q.title}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
