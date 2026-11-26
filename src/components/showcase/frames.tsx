import Image from "next/image";
import { ViewTransition } from "react";
import type { Project } from "@/content/projects";

/**
 * What hangs in each frame of the gallery (Phase 4, docs/interactive/PHASE4-DARKROOM-LINE.md).
 * Every screen is the project's real capture; INFINOS is a short clip of the real website recording;
 * ESP32 has no hardware photo, so it is a drawing, stamped CONCEPT. Nothing is redrawn as if it were
 * the product. The honest note for each frame sits under it, in the gallery (NOTES below).
 */

/** The one line under the active frame: what a reviewer must know before trusting the picture. */
export const NOTES: Record<string, { lead: string; rest: string }> = {
  raya: { lead: "Built on MARK XLIX · FatihMakes", rest: "screenshot predates the rename" },
  infinos: { lead: "Provisional 3D model", rest: "awaiting INFINOS Tech’s approval · © INFINOS Tech" },
  "infinos-telemetry": { lead: "Hosted demo offline", rest: "© INFINOS Tech" },
  "brain-matrix": { lead: "Research use only", rest: "not for diagnosis" },
  "simplein-school": { lead: "Staging demo", rest: "a fictional school" },
  "esp32-home-automation": { lead: "Concept", rest: "a drawing, not a build · the firmware isn’t available" },
};

/** INFINOS: 20–27 s of the owner's desktop recording of the website (the inner box lifting out). */
export const INFINOS_CLIP = { src: "/work/infinos-clip.mp4", poster: "/work/infinos-clip-poster.jpg" };

const SIZES = "(min-width:1024px) 60vw, (min-width:720px) 70vw, 82vw";

/**
 * The frame's picture, named `shot-<slug>`: when its case study opens, it morphs into that page's
 * lit window (each slug appears once on the page, so each name is unique).
 */
export function FrameMedia({ p, eager, video }: { p: Project; eager?: boolean; video?: React.Ref<HTMLVideoElement> }) {
  let media: React.ReactNode;
  if (p.slug === "infinos") {
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
  } else {
    media = <Esp32 />;
  }
  return (
    <ViewTransition name={`shot-${p.slug}`} share="morph" default="none">
      <div className="dl-media__in">{media}</div>
    </ViewTransition>
  );
}

/** ESP32 Home Automation: a concept drawing (no photo of the prototype exists). */
function Esp32() {
  return (
    <>
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="sc-esp dl-media__el">
        <defs>
          <pattern id="esp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" className="sc-esp__grid" />
          </pattern>
        </defs>
        <rect width="1600" height="1000" fill="url(#esp-grid)" />
        {/* the ESP32 module */}
        <rect x="250" y="330" width="380" height="300" className="sc-esp__part" />
        {Array.from({ length: 9 }, (_, k) => (
          <g key={k}>
            <line x1="250" y1={360 + k * 30} x2="220" y2={360 + k * 30} className="sc-esp__pin" />
            <line x1="630" y1={360 + k * 30} x2="660" y2={360 + k * 30} className="sc-esp__pin" />
          </g>
        ))}
        <text x="440" y="470" textAnchor="middle" className="sc-esp__name">ESP32</text>
        <text x="440" y="510" textAnchor="middle" className="sc-esp__sub">Embedded C</text>
        {/* two relay channels */}
        {[0, 1].map((k) => (
          <g key={k}>
            <path d={`M660 ${450 + k * 60} H760 V${300 + k * 340} H880`} className="sc-esp__wire" />
            <rect x="880" y={240 + k * 340} width="260" height="120" className="sc-esp__part" />
            <text x="1010" y={292 + k * 340} textAnchor="middle" className="sc-esp__name sc-esp__name--s">Relay {k + 1}</text>
            <text x="1010" y={326 + k * 340} textAnchor="middle" className="sc-esp__sub">channel {k + 1}</text>
            <path d={`M1140 ${300 + k * 340} H1260`} className="sc-esp__wire" />
            <circle cx="1340" cy={300 + k * 340} r="80" className="sc-esp__part" />
            <text x="1340" y={300 + k * 340} textAnchor="middle" className="sc-esp__sub" fontSize="17">
              <tspan x="1340" dy="-4">appliance</tspan>
              <tspan x="1340" dy="24">{k + 1}</tspan>
            </text>
          </g>
        ))}
        <text x="800" y="140" textAnchor="middle" className="sc-esp__stamp">CONCEPT</text>
      </svg>
      <p className="sr-only">Concept drawing: an ESP32 running Embedded C drives a two-channel relay module; each channel switches one household appliance.</p>
    </>
  );
}
