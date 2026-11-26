"use client";

import { useEffect, useRef } from "react";
import { DIMENSION_EVENT, isVerse } from "./Dimension";

/**
 * THE NIGHT-SHIFT FOOTER (a scene, not a link dump). The name stands as a row of buildings, as on
 * the approved f5 comp. Moving across it switches office lights on; they go out again after a
 * while. In the Verse the towers are inked and screen-printed. One strand from the top anchors on
 * the last letter. The loop runs only while lights are fading.
 */
const NAME = "SUCHINDRA";
const CW = 12, CH = 17; // window cell (css px)

export function NightShift() {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = wrap.current!, canvas = cv.current!;
    const g = canvas.getContext("2d")!;
    let W = 0, H = 0, dpr = 1;
    let base: HTMLCanvasElement | null = null;
    let cells: { x: number; y: number; lit: number; keep: boolean }[] = [];
    let raf = 0, prev = 0;
    let family = "sans-serif";
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    const build = () => {
      const r = box.getBoundingClientRect();
      dpr = Math.min(2, devicePixelRatio || 1);
      W = Math.round(r.width); H = Math.round(r.height);
      if (!W || !H) return;
      canvas.width = W * dpr; canvas.height = H * dpr;
      const verse = isVerse();
      const red = "#e3262b";

      // the letters, sized to the width, standing on the bottom edge
      const size = Math.min(H * 0.92, W * 0.2);
      const off = document.createElement("canvas");
      off.width = W * dpr; off.height = H * dpr;
      const o = off.getContext("2d")!;
      o.scale(dpr, dpr);
      o.font = `900 ${size}px ${family}`;
      const tw = o.measureText(NAME).width;
      const sx = (W * 0.98) / tw;
      const left = W * 0.01, baseY = H + size * 0.02;

      o.save();
      o.translate(left, baseY);
      o.scale(sx, 1);
      o.fillStyle = verse ? "#101010" : "#0c0c0e";
      o.fillText(NAME, 0, 0);
      o.restore();

      // mask copy for window placement
      const m = o.getImageData(0, 0, W * dpr, H * dpr).data;
      const solid = (x: number, y: number) => m[((Math.round(y * dpr) * W * dpr + Math.round(x * dpr)) * 4) + 3] > 200;

      o.globalCompositeOperation = "source-atop";
      if (verse) {
        // screen-print: red halftone climbing the towers from the street
        const grd = o.createLinearGradient(0, H, 0, H - size);
        grd.addColorStop(0, "rgba(227,38,43,0.9)"); grd.addColorStop(1, "rgba(227,38,43,0)");
        for (let y = H; y > H - size; y -= 7) {
          for (let x = (y / 7) % 2 ? 3.5 : 0; x < W; x += 7) {
            const t = (H - y) / size;
            const rad = 3.2 * (1 - t);
            if (rad < 0.3) continue;
            o.fillStyle = red;
            o.beginPath(); o.arc(x, y, rad, 0, 7); o.fill();
          }
        }
      } else {
        // warm rim light on the roofs
        const rim = o.createLinearGradient(0, baseY - size * 0.74, 0, baseY - size * 0.6);
        rim.addColorStop(0, "rgba(227,38,43,0.28)"); rim.addColorStop(1, "rgba(227,38,43,0)");
        o.fillStyle = rim;
        o.fillRect(0, 0, W, H);
      }
      // windows: a few always on (the late shift)
      cells = [];
      seed = 7;
      for (let y = H - size * 0.7; y < H - 10; y += CH) {
        for (let x = left + 4; x < W - 6; x += CW) {
          if (!solid(x + 3, y + 4) || !solid(x + 3, y + 10) || !solid(x - 3, y + 4) || !solid(x + 9, y + 10)) continue;
          const keep = rnd() < 0.07;
          cells.push({ x, y, lit: keep ? 0.55 : 0, keep });
          o.fillStyle = verse ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.035)";
          o.fillRect(x, y, 5, 8);
        }
      }
      o.globalCompositeOperation = "source-over";
      if (verse) {
        o.save();
        o.translate(left, baseY);
        o.scale(sx, 1);
        o.lineWidth = 2.5 / sx;
        o.strokeStyle = "#f4efe6";
        o.strokeText(NAME, 0, 0);
        o.restore();
      }
      // one strand from the top, anchored on the last letter's roof
      const ax = left + tw * sx * 0.955;
      o.strokeStyle = verse ? "#f4efe6" : "rgba(236,231,226,0.7)";
      o.lineWidth = verse ? 2 : 1;
      o.beginPath(); o.moveTo(ax - 18, 0); o.lineTo(ax, baseY - size * 0.72); o.stroke();
      base = off;
      draw();
    };

    const draw = () => {
      if (!base) return;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.drawImage(base, 0, 0);
      g.scale(dpr, dpr);
      const verse = isVerse();
      for (const c of cells) {
        if (c.lit <= 0.01) continue;
        g.fillStyle = verse ? `rgba(255,230,0,${c.lit})` : `rgba(255,${200 + 30 * c.lit | 0},${130 + 40 * c.lit | 0},${c.lit * 0.9})`;
        g.fillRect(c.x, c.y, 5, 8);
      }
    };

    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - (prev || t)) / 1000);
      prev = t;
      let moving = false;
      for (const c of cells) {
        const floor = c.keep ? 0.55 : 0;
        if (c.lit > floor) {
          c.lit = Math.max(floor, c.lit - dt * 0.16);
          moving = true;
        }
      }
      draw();
      if (moving) raf = requestAnimationFrame(tick);
      else { raf = 0; prev = 0; }
    };
    const light = (cx: number, cy: number, rad: number) => {
      const r = canvas.getBoundingClientRect();
      const x = cx - r.left, y = cy - r.top;
      let any = false;
      for (const c of cells) {
        const d = Math.hypot(c.x + 2.5 - x, c.y + 4 - y);
        if (d < rad) {
          const v = 1 - (d / rad) * 0.35;
          if (v > c.lit) { c.lit = v; any = true; }
        }
      }
      if (any && !raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => light(e.clientX, e.clientY, e.pointerType === "touch" ? 70 : 46);
    const onDown = (e: PointerEvent) => light(e.clientX, e.clientY, 80);

    let ro: ResizeObserver | null = null;
    let live = true;
    document.fonts.ready.then(() => {
      if (!live) return;
      family = getComputedStyle(document.body).fontFamily || "sans-serif";
      build();
      ro = new ResizeObserver(() => build());
      ro.observe(box);
    });
    const onDim = () => build();
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerdown", onDown);
    addEventListener(DIMENSION_EVENT, onDim);
    return () => {
      live = false;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerdown", onDown);
      removeEventListener(DIMENSION_EVENT, onDim);
    };
  }, []);

  return (
    <div ref={wrap} className="night-shift relative h-[clamp(150px,22vw,330px)] w-full" style={{ touchAction: "pan-y" }}>
      <canvas ref={cv} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <p className="label pointer-events-none absolute left-5 top-4 text-dim md:left-10">
        <span className="text-red-text">●</span> The night shift · move across the windows
      </p>
    </div>
  );
}
