import type { ComponentType } from "react";
import type { WorldProps, World } from "./types";
import { MiniLive } from "./lib";
import { Mini as Raya } from "./raya/Mini";
import { Mini as Esp32 } from "./esp32/Mini";
import { Mini as Telemetry } from "./telemetry/Mini";
import { Mini as Brain } from "./brain/Mini";
import { Mini as Simplein } from "./simplein/Mini";

/**
 * THE ANIMATED MINIS (Phase 4b, 27 Nov 2026). At the owner's request the gallery shows the same
 * live miniatures as the orange portfolio's project cards instead of screenshots (INFINOS keeps its
 * website clip). The code is copied from orange-portfolio/src/components/worlds/<slug>/Mini.tsx
 * with its helpers; the two sites stay separate projects. Each mini keeps its own colour world,
 * animates only while on screen, rests on a still frame under reduced motion, and is aria-hidden
 * (the frame's honest note says what it is).
 */
const W: Record<string, World> = {
  raya: { bg: "#17151A", ink: "#ECE8EE", muted: "#9C97A2", accent: "#FFB26B", accent2: "#C9C6CC", ground: "dark" },
  "esp32-home-automation": { bg: "#1E1117", ink: "#F2E9DD", muted: "#A8968C", accent: "#FFD9A0", accent2: "#5FB8A0", ground: "dark" },
  "infinos-telemetry": { bg: "#120A0F", ink: "#F2E9DD", muted: "#A8968C", accent: "#5FB8A0", accent2: "#FFB26B", ground: "dark" },
  "brain-matrix": { bg: "#EFE6D6", ink: "#1A1216", muted: "#6E625C", accent: "#7A2430", accent2: "#3F8F7C", ground: "light" },
  "simplein-school": { bg: "#E8DFD0", ink: "#1A1216", muted: "#6E625C", accent: "#B5573A", accent2: "#3F8F7C", ground: "light" },
};
const C: Record<string, ComponentType<WorldProps>> = {
  raya: Raya,
  "esp32-home-automation": Esp32 as ComponentType<WorldProps>,
  "infinos-telemetry": Telemetry,
  "brain-matrix": Brain as ComponentType<WorldProps>,
  "simplein-school": Simplein,
};

export function ProjectMini({ slug, title, live }: { slug: string; title: string; live: boolean }) {
  const M = C[slug];
  if (!M) return null;
  return (
    <MiniLive.Provider value={live}>
      <div className="absolute inset-0" style={{ background: W[slug].bg }}>
        <M project={{ title, world: W[slug] }} />
      </div>
    </MiniLive.Provider>
  );
}
