"use client";

import { useRef, useState } from "react";
import type { WorldProps } from "../types";
import { useCanvasLoop } from "./canvas";
import { useMiniLive } from "../lib";
import { APRICOT, SILVER, bandsAt, drawRibbon, rgba, speechLevel, type RibbonState } from "./ribbon";

/** The app's own state captions (ui_stage.py STATE_TEXT). */
const CYCLE: { state: RibbonState; word: string; caption: string; dur: number }[] = [
  { state: "listening", word: "Listening", caption: "Go ahead — I’m listening.", dur: 3.4 },
  { state: "processing", word: "Thinking", caption: "Working on it…", dur: 1.5 },
  { state: "speaking", word: "Speaking", caption: "", dur: 2.8 }, // the app shows no caption while it speaks
  { state: "ready", word: "Ready", caption: "Speak or type a message.", dur: 1.2 },
];
const PERIOD = CYCLE.reduce((s, c) => s + c.dur, 0);

function phaseAt(t: number) {
  let x = t % PERIOD;
  for (let i = 0; i < CYCLE.length; i++) {
    if (x < CYCLE[i].dur) return { i, local: x };
    x -= CYCLE[i].dur;
  }
  return { i: 0, local: 0 };
}

/** MINI: the voice ribbon cycling through the real UI states, apricot over graphite with silver hairlines. */
export function Mini({ project }: WorldProps) {
  const [idx, setIdx] = useState(0);
  const shown = useRef(0);
  const lvl = useRef(0);
  const live = useMiniLive();

  const { ref } = useCanvasLoop(({ ctx, w, h, t, reduced }) => {
    const tt = reduced ? 1.25 : t + 0.4;
    const { i, local } = reduced ? { i: 0, local: 1 } : phaseAt(tt);
    if (i !== shown.current) {
      shown.current = i;
      setIdx(i);
    }
    const st = CYCLE[i].state;
    const x0 = w * 0.06;
    const x1 = w * 0.94;
    const cy = h * 0.47;
    const amp = h * 0.4;

    // warm light behind the voice
    const glow = ctx.createRadialGradient(w * 0.5, cy, 0, w * 0.5, cy, w * 0.42);
    glow.addColorStop(0, rgba(st === "speaking" ? SILVER : APRICOT, st === "ready" ? 0.05 : 0.09));
    glow.addColorStop(1, rgba(APRICOT, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // silver hairlines: the baseline with 24 band ticks, and the amplitude guides
    ctx.strokeStyle = rgba(SILVER, 0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const y of [cy - amp * 0.72, cy + amp * 0.72]) {
      ctx.moveTo(x0, Math.round(y) + 0.5);
      ctx.lineTo(x1, Math.round(y) + 0.5);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(SILVER, 0.22);
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / 24) + 0.5;
      const tall = k % 6 === 0 ? 7 : 3;
      ctx.moveTo(x, cy + amp * 0.72 - tall);
      ctx.lineTo(x, cy + amp * 0.72);
    }
    ctx.stroke();

    // level follows a speech-like envelope while listening/speaking (smoothed like the app: fast up, slow down)
    const target = st === "listening" ? speechLevel(tt, 0.3) : st === "speaking" ? speechLevel(tt * 1.1, 2.1) * 0.85 : 0;
    lvl.current = reduced ? target : lvl.current + (target - lvl.current) * (target > lvl.current ? 0.45 : 0.12);
    const fadeIn = Math.min(1, local / 0.25);
    drawRibbon(ctx, {
      x0,
      x1,
      cy,
      amp,
      level: lvl.current * (st === "listening" || st === "speaking" ? fadeIn : 1),
      t: tt,
      state: st,
      width: Math.max(1.6, w / 420),
      band: bandsAt(tt),
      color: st === "speaking" ? SILVER : APRICOT,
    });
  }, 30, live);

  const c = CYCLE[idx];
  return (
    <div aria-hidden="true" className="@container absolute inset-0 overflow-hidden" style={{ background: project.world.bg }}>
      <canvas ref={ref} className="absolute inset-0 size-full" />
      <div className="absolute inset-x-[6%] top-[7%] flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] @sm:text-[10.5px]" style={{ color: project.world.muted }}>
        <span>{project.title}</span>
        <span className="hidden @xs:inline">Voice · live</span>
      </div>
      <div className="absolute inset-x-[6%] bottom-[8%] flex items-baseline gap-3 font-mono text-[9px] uppercase tracking-[0.16em] @sm:text-[11px]">
        <span className="inline-flex items-center gap-2" style={{ color: c.state === "speaking" ? "#C9C6CC" : c.state === "processing" ? "#FFD9A0" : project.world.accent }}>
          <span className="inline-block size-[5px] rounded-full bg-current" />
          {c.word}
        </span>
        <span className="hidden truncate normal-case tracking-normal @md:inline" style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: project.world.muted }}>
          {c.caption}
        </span>
      </div>
    </div>
  );
}
