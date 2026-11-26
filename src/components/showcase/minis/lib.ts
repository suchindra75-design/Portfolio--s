"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

/**
 * Only the project in front animates (Phase 4b). Its neighbours rest on a still frame, so the
 * gallery never runs several animations under its develop filter at once.
 */
export const MiniLive = createContext(true);
export const useMiniLive = () => useContext(MiniLive);

/**
 * The two helpers the gallery's animated minis need (in the orange portfolio they come from its
 * own lib; the two sites stay separate, so they are restated here).
 */
let lastScroll = -1e9;
if (typeof window !== "undefined") {
  window.addEventListener("scroll", () => (lastScroll = performance.now()), { passive: true, capture: true });
}
/** True for 150 ms after any scroll: canvas loops skip frames then, so scrolling stays smooth. */
export const isScrolling = () => performance.now() - lastScroll < 150;

const reduced = {
  subscribe(cb: () => void) {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  },
  get: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};
export function useReducedMotion() {
  return useSyncExternalStore(reduced.subscribe, reduced.get, () => false);
}
