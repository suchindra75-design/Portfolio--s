import { ROLES } from "./plan";

/*
 * The plan in 2D, in the same units as the 3D model (world/acts/SimpleinScene.tsx): plinth
 * half-size 28, a courtyard core, four wings from radius 10 to 25. North is up (−y).
 *
 * One wing is generated pointing south (x = lateral, y = radial); the drawing rotates it by
 * 0° / 90° / 180° / 270° for Admin (S), Teacher (W), Parent (N) and Student (E), which is
 * exactly how the 3D model lays them out.
 */

export const PL = 28;
export const CORE = 4.5;
export const W0 = 10;
export const W1 = 25;
export const WH = 3.5;
export const GATES = [6.0, 7.6, 9.2] as const; // inner → outer: tenant guard, RBAC, auth
export const GATE_NAMES = ["Tenant guard", "RBAC", "Auth"] as const;
export const WING_ROT = [0, 90, 180, 270] as const;

export type R = { x: number; y: number; w: number; h: number };

/** A box in (radial r, lateral s) for the south-pointing wing. */
const box = (r0: number, r1: number, s0: number, s1: number): R => ({ x: s0, y: r0, w: s1 - s0, h: r1 - r0 });

export type Wing = {
  walls: R[];
  partitions: R[];
  rooms: { r: R; cx: number; cy: number; label: string; code: string }[];
  passage: R[];
  piers: R[];
  lintels: number[]; // radial positions of the gate lintels (drawn dashed: overhead)
  courtyard: R[];
  path: [number, number]; // radial extent of the request path (verdigris)
};

export function buildWing(k: number): Wing {
  const role = ROLES[k];
  const n = role.modules.length;
  const L = (W1 - W0) / n;
  const walls = [
    box(W0, W1, WH - 0.3, WH),
    box(W0, W1, -WH, -WH + 0.3),
    box(W0, W0 + 0.3, -WH + 0.3, -1.25),
    box(W0, W0 + 0.3, 1.25, WH - 0.3),
    box(W1 - 0.3, W1, -WH + 0.3, -0.85), // the portway
    box(W1 - 0.3, W1, 0.85, WH - 0.3),
  ];
  const partitions: R[] = [];
  for (let i = 1; i < n; i++) {
    const r = W1 - i * L;
    partitions.push(box(r - 0.1, r + 0.1, -WH + 0.3, -0.65), box(r - 0.1, r + 0.1, 0.65, WH - 0.3));
  }
  const rooms = role.modules.map((m, i) => {
    const r = W1 - (i + 0.5) * L;
    return { r: box(r - L / 2 + 0.32, r + L / 2 - 0.32, -WH + 0.55, WH - 0.55), cx: 0, cy: r, label: m, code: `${role.code}·${String(i + 1).padStart(2, "0")}` };
  });
  const passage = [box(CORE + 0.3, W0, -1.25, -1.05), box(CORE + 0.3, W0, 1.05, 1.25)];
  const piers = GATES.flatMap((g) => [box(g - 0.16, g + 0.16, -1.42, -1.05), box(g - 0.16, g + 0.16, 1.05, 1.42)]);
  const courtyard = [box(CORE, CORE + 0.3, -CORE - 0.3, -1.1), box(CORE, CORE + 0.3, 1.1, CORE + 0.3)];
  return { walls, partitions, rooms, passage, piers, lintels: [...GATES], courtyard, path: [3.4, W1] };
}

export const WINGS = ROLES.map((_, k) => buildWing(k));

/** The core: two tenant vaults and the row-level-security wall between them. */
export const VAULTS: R[] = [-1, 1].flatMap((sgn) => [
  { x: sgn * 2.89 - 0.11, y: -2.4, w: 0.22, h: 4.8 },
  { x: sgn * 1.59 - 1.41, y: -2.4, w: 2.82, h: 0.22 },
  { x: sgn * 1.59 - 1.41, y: 2.18, w: 2.82, h: 0.22 },
]);
export const LIDS: R[] = [-1, 1].map((sgn) => ({ x: sgn * 1.59 - 1.5, y: -2.5, w: 3.0, h: 5.0 }));
export const RLS: R = { x: -0.18, y: -3.4, w: 0.36, h: 6.8 };

/** Rotate a point by one of the wing angles (degrees, SVG sense: +90 turns south into west). */
export function rot(x: number, y: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const c = Math.round(Math.cos(a));
  const s = Math.round(Math.sin(a));
  return { x: x * c - y * s, y: x * s + y * c };
}

/** Split a long label into at most two balanced lines. */
export function twoLines(t: string, max = 14): string[] {
  if (t.length <= max) return [t];
  const words = t.split(" ");
  let best: string[] = [t];
  let bestD = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const d = Math.abs(a.length - b.length);
    if (d < bestD) {
      bestD = d;
      best = [a, b];
    }
  }
  return best;
}
