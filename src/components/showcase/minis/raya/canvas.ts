"use client";

import { useEffect, useRef } from "react";
import { isScrolling } from "../lib";

/**
 * A 2D canvas loop that only runs while the canvas is on screen (DESIGN.md §5):
 * IntersectionObserver-gated rAF, DPR capped at 1.5, throttled to `fps`, cleaned up on unmount.
 * Under reduced motion it paints single frames (on resize, on becoming visible, on `invalidate`).
 */
export type Frame = { ctx: CanvasRenderingContext2D; w: number; h: number; t: number; reduced: boolean };

export function useCanvasLoop(draw: (f: Frame) => void, fps = 30, live = true) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const fpsRef = useRef(fps);
  const paintRef = useRef<() => void>(() => {});
  const liveRef = useRef(live);
  const kickRef = useRef<() => void>(() => {});

  useEffect(() => {
    drawRef.current = draw;
    fpsRef.current = fps;
  });
  useEffect(() => {
    liveRef.current = live;
    kickRef.current();
  }, [live]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const t0 = performance.now();
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let visible = false;

    const paint = (now = performance.now()) => {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      drawRef.current({ ctx, w, h, t: (now - t0) / 1000, reduced: mq.matches });
    };
    const tick = (now: number) => {
      raf = 0;
      if (!visible || mq.matches || !liveRef.current) return;
      if (now - last >= 1000 / fpsRef.current - 2 && !isScrolling()) {
        last = now;
        paint(now);
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      paint();
      if (!raf && visible && !mq.matches && liveRef.current) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const resize = () => {
      // layout size, not getBoundingClientRect: the gallery scales frames with transforms
      const r = { width: canvas.offsetWidth, height: canvas.offsetHeight };
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };

    paintRef.current = () => paint();
    kickRef.current = () => (liveRef.current ? start() : stop());
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);
    const onMotion = () => (mq.matches ? (stop(), paint()) : start());
    mq.addEventListener("change", onMotion);
    resize();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      mq.removeEventListener("change", onMotion);
      paintRef.current = () => {};
      kickRef.current = () => {};
    };
  }, []);

  return { ref, invalidate: () => paintRef.current() };
}
