/** What a mini needs to know about its project: its name and its own colour world. */
export type World = { bg: string; ink: string; muted: string; accent: string; accent2: string; ground: "dark" | "light" };
export type WorldProps = { project: { title: string; world: World } };
