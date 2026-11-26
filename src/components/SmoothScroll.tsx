"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setLenis } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

/**
 * SMOOTH SCROLL. Lenis glides the page; GSAP's ticker is the only clock. Lenis advances inside the
 * ticker and tells ScrollTrigger on every scroll, so scroll-linked motion never runs a frame behind
 * the page (the "two smoothers fighting" problem). Off under reduced motion, where the page scrolls
 * natively and nothing is scrubbed. Same-page #links are left to the browser/Next (an instant jump),
 * so they still land under the fixed bar via scroll-padding-top.
 */
export function SmoothScroll() {
  const path = usePathname();

  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    const tick = (t: number) => lenis?.raf(t * 1000);
    const start = () => {
      if (mq.matches || lenis) return;
      lenis = new Lenis({ lerp: 0.11, stopInertiaOnNavigate: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      setLenis(lenis);
    };
    const stop = () => {
      if (!lenis) return;
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenis = null;
      setLenis(null);
    };
    const onChange = () => (mq.matches ? stop() : start());
    gsap.ticker.lagSmoothing(0);
    start();
    mq.addEventListener("change", onChange);
    // web fonts change line lengths, so trigger positions are measured again once they are in
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      mq.removeEventListener("change", onChange);
      stop();
    };
  }, []);

  // a new page: measure again once it has painted
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
    return () => cancelAnimationFrame(id);
  }, [path]);

  return null;
}
