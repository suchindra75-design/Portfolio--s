import type Lenis from "lenis";

/**
 * One place to scroll the page from code. When Lenis is running (motion allowed) it glides there on
 * the same clock as ScrollTrigger; otherwise the browser jumps (or scrolls smoothly if asked).
 */
let lenis: Lenis | null = null;
export const setLenis = (l: Lenis | null) => (lenis = l);
export const getLenis = () => lenis;

export function scrollToY(y: number, { immediate = false } = {}) {
  if (lenis) lenis.scrollTo(y, { immediate, duration: 1.2 });
  else window.scrollTo({ top: y, behavior: immediate ? "auto" : "smooth" });
}
