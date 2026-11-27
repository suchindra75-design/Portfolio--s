"use client";

import { useEffect, useRef } from "react";
import { isVerse } from "../Dimension";

/**
 * THE WEB: the dimensional web behind the portrait, carried on behind the project gallery (one
 * sticky canvas inside <Continuum>). Decorative: the canvas is aria-hidden and never takes pointer
 * events; it listens on the hero instead, so every existing control works.
 * three.js is loaded only after the page has painted, so the hero never waits for WebGL; if WebGL
 * is unavailable the hero simply stays as it was.
 */
/** Module state lives as long as the document: client navigation keeps it, a reload resets it. */
let builtThisLoad = false;

export function HeroWeb({ scope }: { scope: React.RefObject<HTMLElement | null> }) {
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
        const host = scope.current?.querySelector<HTMLElement>("#top");
        if (!live || !canvas.current || !host) return;
        // the Arrival (docs/interactive/ARRIVAL.md): the layout's boot script decided whether it plays
        const arrival = document.documentElement.dataset.arrival === "play";
        handle = createHeroWeb(canvas.current, host, { reducedMotion, built: seen, verse: isVerse, startAt, arrival });
        if (!handle && arrival) {
          // no WebGL: the portrait simply comes up out of the dark, the hero as it always was
          document.documentElement.dataset.arrival = "off";
          window.dispatchEvent(new CustomEvent("swing-shift:arrival-state", { detail: "off" }));
        }
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
  }, [scope]);
  // one screen tall and sticky: it stays behind whatever part of the hero or the gallery is on screen
  return <canvas ref={canvas} aria-hidden="true" className="hero-web pointer-events-none sticky top-0 block h-[100svh] w-full" />;
}
