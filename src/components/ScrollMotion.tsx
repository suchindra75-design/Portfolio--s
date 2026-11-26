"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DIMENSION_EVENT, isVerse } from "./Dimension";

gsap.registerPlugin(ScrollTrigger);

/**
 * SCROLL MOTION, one set per Earth, built from the classes the pages already use (no markup changes).
 *   Earth-Prime: slow and weighty. Headings rise, screens drift inside their lit windows.
 *   The Verse:   motion on twos. Caption boxes slap on, headings stutter in, the work's panels drop
 *                onto the skyline one after another.
 * The hero (#top) is left alone: its portrait and the 3D web behind it must stay registered.
 * Rebuilt on every page and every dimension jump. Nothing runs under reduced motion.
 */
const ON_TWOS = "steps(4)";
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

function verse(main: HTMLElement) {
  main.querySelectorAll<HTMLElement>(".verse-caption").forEach((c) => {
    if (c.closest("#top")) return;
    gsap.from(c, { scale: 0.35, rotate: -9, opacity: 0, duration: 0.3, ease: ON_TWOS, ...DONE, scrollTrigger: { trigger: c, start: "top 90%", once: true } });
  });
  main.querySelectorAll<HTMLElement>("section h2.display, header h1.display").forEach((h) => {
    if (h.closest("#top")) return;
    gsap.from(h, { x: -36, opacity: 0, duration: 0.42, ease: "steps(5)", ...DONE, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
  });
  main.querySelectorAll<HTMLElement>(".lit-window").forEach((w) => {
    gsap.from(w, { x: -28, y: 18, rotate: -2.5, opacity: 0, duration: 0.36, ease: ON_TWOS, ...DONE, scrollTrigger: { trigger: w, start: "top 85%", once: true } });
  });
  // the work: six panels drop onto the skyline, one after another, when the row comes into view
  const roofs = gsap.utils.toArray<HTMLElement>("#work ul > li");
  if (roofs.length && matchMedia("(min-width: 1024px)").matches) {
    gsap.from(roofs, { yPercent: -14, rotate: (k: number) => (k % 2 ? 3 : -3), opacity: 0, duration: 0.3, ease: "steps(3)", stagger: 0.12, ...DONE, scrollTrigger: { trigger: "#work ul", start: "top 80%", once: true } });
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
      ctx = gsap.context(() => (isVerse() ? verse(main) : prime(main)));
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
