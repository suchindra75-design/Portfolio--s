"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { ViewTransition } from "react";
import type { Project } from "@/content/projects";

// the minis' code loads after the page, so the hero never waits for it
const ProjectMini = dynamic(() => import("./minis").then((m) => m.ProjectMini), { ssr: false });
const MINI = new Set(["raya", "infinos-telemetry", "brain-matrix", "simplein-school", "esp32-home-automation"]);

/**
 * What hangs in each frame of the gallery (Phase 4, docs/interactive/PHASE4-DARKROOM-LINE.md).
 * INFINOS is a short clip of the real website recording. Every other project shows its animated
 * mini, the same live miniature as the orange portfolio's cards (./minis, the owner's choice on
 * 27 Nov 2026). The honest note for each frame sits under it (NOTES below) and says what the
 * picture is: an animation, a replay of recorded data, or an illustration.
 */

/** The one line under the active frame: what a reviewer must know before trusting the picture. */
export const NOTES: Record<string, { lead: string; rest: string }> = {
  raya: { lead: "Built on MARK XLIX · FatihMakes", rest: "an animation of its voice states" },
  infinos: { lead: "Provisional 3D model", rest: "awaiting INFINOS Tech’s approval · © INFINOS Tech" },
  "infinos-telemetry": { lead: "Hosted demo offline", rest: "recorded data, replayed · © INFINOS Tech" },
  "brain-matrix": { lead: "Research use only", rest: "an illustration with a synthetic signal" },
  "simplein-school": { lead: "Staging demo", rest: "an illustration of its system plan" },
  "esp32-home-automation": { lead: "Concept", rest: "an illustration, not a build · the firmware isn’t available" },
};

/** INFINOS: 20–27 s of the owner's desktop recording of the website (the inner box lifting out). */
export const INFINOS_CLIP = { src: "/work/infinos-clip.mp4", poster: "/work/infinos-clip-poster.jpg" };

const SIZES = "(min-width:1024px) 60vw, (min-width:720px) 70vw, 82vw";

/**
 * The frame's picture, named `shot-<slug>`: when its case study opens, it morphs into that page's
 * lit window (each slug appears once on the page, so each name is unique).
 */
export function FrameMedia({ p, eager, video, live = true, mount = true }: { p: Project; eager?: boolean; video?: React.Ref<HTMLVideoElement>; live?: boolean; mount?: boolean }) {
  let media: React.ReactNode;
  if (MINI.has(p.slug)) {
    media = mount ? <ProjectMini slug={p.slug} title={p.title} live={live} /> : null;
  } else if (p.slug === "infinos") {
    media = (
      <video
        ref={video}
        src={INFINOS_CLIP.src}
        poster={INFINOS_CLIP.poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="INFINOS website screen recording: the provisional 3D bag model, its inner box lifting out"
        className="dl-media__el"
      />
    );
  } else if (p.screen) {
    media = <Image src={p.screen.src} alt={p.screen.alt} fill sizes={SIZES} draggable={false} loading={eager ? "eager" : "lazy"} className="dl-media__el" />;
  }
  return (
    <ViewTransition name={`shot-${p.slug}`} share="morph" default="none">
      <div className="dl-media__in">{media}</div>
    </ViewTransition>
  );
}
