"use client";

import { useEffect, useRef, useState } from "react";
import { useMiniLive, useReducedMotion } from "../lib";
import { House, ROOMS, allLit, blinkLed, sendPulse, useInView, type Lit } from "./house";

type Frame = { lit: Lit; tv: boolean; fan: boolean; caption: string; state: "typing" | "sent" | "idle" };
const DARK: Frame = { lit: allLit(false), tv: false, fan: false, caption: "", state: "typing" };
const LIT: Frame = { lit: allLit(true), tv: true, fan: true, caption: "turn on the lights", state: "sent" };
/** The lit house with no command in the sky: what it rests on as a neighbour, and where it starts. */
const REST: Frame = { ...LIT, caption: "", state: "idle" };

const ON = "turn on the lights";
const OFF = "turn everything off";
const TYPE_MS = 46;
const STAGGER = 170;
const TRAVEL = 640;

/**
 * MINI: the house at dusk is told "turn on the lights": the command is typed in the sky, the
 * controller blinks, a pulse runs to each room and the rooms light one by one. It holds, is
 * told "turn everything off", and goes dark again. Loops only while on screen and in front
 * (Swing Shift starts it from the lit house, the frame it rests on); a calm lit frame otherwise
 * and under reduced motion.
 */
export function Mini() {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(box);
  const live = useMiniLive();
  const [f, setF] = useState<Frame>(REST);

  useEffect(() => {
    if (reduced || !inView || !live) return;
    const timers: number[] = [];
    const anims: Animation[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const pulse = (room: (typeof ROOMS)[number]) => {
      const a = sendPulse(svg.current, room, TRAVEL);
      if (a) anims.push(a);
    };

    // Starts from the lit house (the frame it rests on as a neighbour), so arriving at the front
    // never snaps the lights off: the first command is "turn everything off", then the loop.
    const cycle = (fromLit: boolean) => {
      let off = 900;
      if (!fromLit) {
        setF(DARK);
        // "turn on the lights"
        for (let i = 1; i <= ON.length; i++) at(400 + i * TYPE_MS, () => setF((s) => ({ ...s, caption: ON.slice(0, i), state: "typing" })));
        const sent = 400 + ON.length * TYPE_MS + 260;
        at(sent, () => {
          setF((s) => ({ ...s, state: "sent" }));
          const a = blinkLed(svg.current);
          if (a) anims.push(a);
        });
        ROOMS.forEach((r, i) => {
          at(sent + 200 + i * STAGGER, () => pulse(r));
          at(sent + 200 + i * STAGGER + TRAVEL - 80, () =>
            setF((s) => ({ ...s, lit: { ...s.lit, [r]: true }, tv: s.tv || r === "living", fan: s.fan || r === "bedroom" })),
          );
        });
        // hold, then "turn everything off"
        off = sent + 200 + ROOMS.length * STAGGER + TRAVEL + 3400;
      }
      at(off, () => setF((s) => ({ ...s, caption: "", state: "typing" })));
      for (let i = 1; i <= OFF.length; i++) at(off + 120 + i * TYPE_MS, () => setF((s) => ({ ...s, caption: OFF.slice(0, i), state: "typing" })));
      const sent2 = off + 120 + OFF.length * TYPE_MS + 260;
      at(sent2, () => {
        setF((s) => ({ ...s, state: "sent" }));
        const a = blinkLed(svg.current);
        if (a) anims.push(a);
      });
      [...ROOMS].reverse().forEach((r, i) => {
        at(sent2 + 200 + i * STAGGER, () => pulse(r));
        at(sent2 + 200 + i * STAGGER + TRAVEL - 80, () =>
          setF((s) => ({ ...s, lit: { ...s.lit, [r]: false }, tv: r === "living" ? false : s.tv, fan: r === "bedroom" ? false : s.fan })),
        );
      });
      at(sent2 + 200 + ROOMS.length * STAGGER + TRAVEL + 1500, () => cycle(false));
    };
    cycle(true);
    return () => {
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
      setF(REST);
    };
  }, [reduced, inView, live]);

  const frame = reduced ? LIT : !live ? REST : f;
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden" style={{ background: "#120A0F" }} aria-hidden="true">
      <House svgRef={svg} lit={frame.lit} tv={frame.tv} fan={frame.fan} caption={frame.caption} captionState={frame.state} live={inView && live} fade={520} />
    </div>
  );
}
