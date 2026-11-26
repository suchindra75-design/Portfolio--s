/*
 * SIMPLEIN SCHOOL: the plan shared by the 2D drawing (Mini, HeroVisual, the no-WebGL fallback),
 * the walkthrough copy and the 3D model (world/acts/SimpleinScene.tsx reads ROLES, SEG and
 * simpleinLink from here).
 */

/**
 * The four role portals and their modules, from the project's own routes (app/admin, app/teacher,
 * app/parent, app/student) and README. Order = order around the plan (Admin S, Teacher W,
 * Parent N, Student E, clockwise from above).
 */
export const ROLES = [
  { name: "Admin", code: "A", line: "Sets the school up and keeps it running.", modules: ["People & Excel import", "Fee records", "Notices", "Timetable", "Exams"] },
  { name: "Teacher", code: "T", line: "Records the school day, class by class.", modules: ["Attendance", "Marks & grades", "Homework", "Notices"] },
  { name: "Parent", code: "P", line: "Follows their child’s progress from home.", modules: ["Report cards (PDF)", "Notices", "Fee records", "Attendance"] },
  { name: "Student", code: "S", line: "Sees their own timetable, work and results.", modules: ["Timetable", "Homework", "Past papers (PYQs)", "Report cards"] },
] as const;

/**
 * Scroll segments of the walkthrough (progress 0…1 across its pinned section). The camera, the
 * light and the copy all follow these. On the project page the walk ends at the core, where the
 * isolation demo holds: the "whole plan" segment sits past the end and is never reached (the
 * hero already shows the whole plan).
 */
export const SEG = {
  intro: [0, 0.04],
  door: [0.04, 0.1],
  wings: [0.1, 0.54],
  api: [0.54, 0.64],
  core: [0.64, 1],
  plan: [1.5, 1.6],
} as const;

/** Which school the visitor is "signed in to" in the tenant demo. Read by the 3D scene each frame. */
export const simpleinLink = { tenant: 0 as 0 | 1 };
export function setLinkedTenant(t: 0 | 1) {
  simpleinLink.tenant = t;
}
