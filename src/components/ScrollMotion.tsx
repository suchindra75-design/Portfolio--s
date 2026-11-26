"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DIMENSION_EVENT } from "./Dimension";

gsap.registerPlugin(ScrollTrigger);

/**
 * SCROLL MOTION, built from the classes the pages already use (no markup changes): slow and weighty.
 * Headings rise; screens drift inside their lit windows. Since Phase 3 the Verse only re-inks the
 * hero, so this is the one choreography for the rest of the site. The hero (#top) is left alone:
 * its portrait and the 3D web must stay registered. Rebuilt on every page; nothing runs under
 * reduced motion.
 */
/** hand the element back to its CSS (the Verse lifts towers and tilts captions with its own transforms) */
const DONE = { clearProps: "transform,opacity" };

function prime(main: HTMLElement) {
  main.querySelectorAll<HTMLElement>("section h2.display, header h1.display").forEach((h) => {
    if (h.closest("#top")) return;
    gsap.from(h, { y: 56, opacity: 0, duration: 1.3, ease: "power3.out", ...DONE, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
  });
  main.querySelectorAll<HTMLElement>(".lit-window").forEach((w) => {
    const img = w.querySelector("img");
    if (!img) return;
    gsap.fromTo(img, { yPercent: -4, scale: 1.1 }, { yPercent: 4, scale: 1.1, ease: "none", scrollTrigger: { trigger: w, start: "top bottom", end: "bottom top", scrub: 1 } });
  });
  // the rooftops' list items, not the towers: a tower's own transform belongs to its CSS
  const roofs = gsap.utils.toArray<HTMLElement>("#work ul > li");
  if (roofs.length && matchMedia("(min-width: 1024px)").matches) {
    gsap.from(roofs, { y: 70, opacity: 0, duration: 1.2, ease: "power3.out", stagger: 0.09, ...DONE, scrollTrigger: { trigger: "#work ul", start: "top 85%", once: true } });
  }
}

export function ScrollMotion() {
  const path = usePathname();
  useEffect(() => {
    let ctx: gsap.Context | null = null;
    const build = () => {
      ctx?.revert();
      ctx = null;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const main = document.getElementById("main");
      if (!main) return;
      // the Verse only re-inks the hero (Phase 3), so the rest of the page always moves the Prime way
      ctx = gsap.context(() => prime(main));
      ScrollTrigger.refresh();
    };
    // after the page has painted (and after a dimension jump has swapped the styles)
    const id = requestAnimationFrame(build);
    let t = 0;
    const onDim = () => {
      window.clearTimeout(t);
      t = window.setTimeout(build, 60);
    };
    addEventListener(DIMENSION_EVENT, onDim);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(t);
      removeEventListener(DIMENSION_EVENT, onDim);
      ctx?.revert();
    };
  }, [path]);
  return null;
}
