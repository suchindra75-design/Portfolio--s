"use client";

import { useEffect, useRef } from "react";
import { isVerse } from "../Dimension";

/**
 * THE WEB: the dimensional web behind the portrait. Decorative: the canvas is aria-hidden and
 * never takes pointer events; it listens on the hero instead, so every existing control works.
 * three.js is loaded only after the page has painted, so the hero never waits for WebGL; if WebGL
 * is unavailable the hero simply stays as it was.
 */
/** Module state lives as long as the document: client navigation keeps it, a reload resets it. */
let builtThisLoad = false;

export function HeroWeb({ host }: { host: React.RefObject<HTMLElement | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let live = true;
    let handle: { dispose: () => void } | null = null;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // the construction plays once per page load; coming back to the home page from another page
    // of the site shows the finished web (a reload plays it again)
    const seen = builtThisLoad;
    // start building once the portrait has mostly arrived (about 0.9 s into the page)
    const startAt = Math.max(performance.now() + 120, 900);
    const go = () =>
      import("./scene").then(({ createHeroWeb }) => {
        if (!live || !canvas.current || !host.current) return;
        handle = createHeroWeb(canvas.current, host.current, { reducedMotion, built: seen, verse: isVerse, startAt });
        if (handle) {
          canvas.current.dataset.ready = "true";
          builtThisLoad = true;
        }
      });
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const id = idle ? idle(go, { timeout: 600 }) : window.setTimeout(go, 200);
    return () => {
      live = false;
      if (!idle) window.clearTimeout(id);
      handle?.dispose();
    };
  }, [host]);
  return <canvas ref={canvas} aria-hidden="true" className="hero-web pointer-events-none absolute inset-0 z-[1] h-full w-full" />;
}
