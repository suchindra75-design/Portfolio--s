"use client";

import { useEffect, useRef } from "react";
import { useMiniLive, useReducedMotion } from "../lib";
import { PAPER, drawPaper, drawPen, eeg, eog, eyeMovements, hash, runCanvas } from "./signal";

/**
 * Mini: a polygraph strip. Three ink traces (EEG, EOG, the eye-movement count) written by
 * pens on a moving bone chart, with a red event pen ticking along the top margin.
 * Synthetic signal, decorative (aria-hidden). Static frame under reduced motion.
 */
export function Mini() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const live = useMiniLive();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let paper = 1800; // px of paper already run out (a calm, full frame from the first paint)
    return runCanvas(canvas, {
      animate: !reduced && live,
      fps: 30,
      draw: ({ ctx, w, h, dt }) => {
        // Full-bleed plates (home "full" layout, next-project band) put text bottom-left:
        // there the traces keep to the upper part of the sheet, at a calmer size.
        const big = h > 520;
        const s = big ? 1 : Math.min(1.25, Math.max(0.5, h / 380));
        paper += dt * 46 * s;
        const margin = 16 * s;
        const pxPerSec = 190 * s;
        drawPaper(ctx, 0, 0, w, h, { shift: paper, cell: 11 * s, margin });

        const penX = w * 0.8;
        // Big plates: lanes in the top ~45% only (the title starts just below half height on phones).
        const top = big ? h * 0.09 : margin + 14 * s;
        const laneH = big ? (h * 0.36) / 3 : (h - 2 * margin - 22 * s) / 3;
        const lanes = [
          { f: eeg, color: PAPER.ink, amp: 0.36, width: 1.15 },
          { f: eog, color: PAPER.verdigris, amp: 0.34, width: 1.3 },
          { f: (t: number) => eyeMovements(t, 2.2), color: PAPER.ink, amp: 0.3, width: 1 },
        ];
        // Event pen: short red ticks on the top margin, one per ~1.6 s of signal.
        ctx.strokeStyle = PAPER.oxblood;
        ctx.lineWidth = 1.4 * s;
        const tick = 1.6 * pxPerSec;
        const k0 = Math.floor((paper - penX) / tick);
        for (let k = k0; k * tick <= paper; k++) {
          if (hash(k + 11) < 0.35) continue;
          const x = penX - (paper - k * tick);
          if (x < 0) continue;
          ctx.beginPath();
          ctx.moveTo(x, margin + 2 * s);
          ctx.lineTo(x, margin + 9 * s);
          ctx.stroke();
        }

        lanes.forEach((ln, i) => {
          const cy = top + laneH * (i + 0.5);
          ctx.strokeStyle = ln.color;
          ctx.lineWidth = ln.width * s;
          ctx.lineJoin = "round";
          ctx.beginPath();
          for (let x = 0; x <= penX; x += 1.25) {
            const t = (paper - (penX - x)) / pxPerSec;
            const y = cy - ln.f(t) * laneH * ln.amp;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          const tipY = cy - ln.f(paper / pxPerSec) * laneH * ln.amp;
          drawPen(ctx, penX, tipY, w - 12 * s, cy, s);
        });

        // The red pen tick: the line where ink meets paper.
        ctx.strokeStyle = "rgba(122,36,48,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(penX) + 0.5, margin);
        ctx.lineTo(Math.round(penX) + 0.5, h - margin);
        ctx.stroke();
      },
    });
  }, [reduced, live]);

  return (
    <div aria-hidden="true" className="absolute inset-0" style={{ background: PAPER.bg }}>
      <canvas ref={ref} className="absolute inset-0 block size-full" />
    </div>
  );
}
