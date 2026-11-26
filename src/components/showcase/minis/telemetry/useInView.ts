"use client";

import { useEffect, useState, type RefObject } from "react";

/** True while the element is on screen (IntersectionObserver). Every loop in this world is gated on it. */
export function useInView(ref: RefObject<Element | null>, threshold = 0, rootMargin = "0px") {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, rootMargin]);
  return inView;
}
