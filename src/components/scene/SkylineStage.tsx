"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState } from "react";
import { DIMENSION_EVENT, isVerse } from "../Dimension";

/**
 * Loads the 3D skyline only when it can pay for itself (the Bruno Simon lesson): a screen at least
 * 768 px wide, no data-saver, and the Work section within ~one screen of the viewport, then
 * waits for an idle moment. Until its first frames are drawn the section shows exactly what it
 * always did, so nothing pops; the scene fades in over it. There is no separate WebGL probe (a
 * throwaway context costs as much as the real one); if WebGL is missing, the error boundary just
 * leaves the section as it was.
 */
const Skyline = dynamic(() => import("./Skyline"), { ssr: false });

class Quiet extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function SkylineStage({ active }: { active: number }) {
  const box = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [verse, setVerse] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const el = box.current!;
    const section = el.parentElement as HTMLElement;
    if (!matchMedia("(min-width: 768px)").matches) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    /* eslint-disable react-hooks/set-state-in-effect -- dimension and motion are only known in the browser */
    setVerse(isVerse());
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onMq = () => setReduce(mq.matches);
    mq.addEventListener("change", onMq);
    const onDim = (e: Event) => setVerse((e as CustomEvent<boolean>).detail);
    addEventListener(DIMENSION_EVENT, onDim);

    // Create the canvas in a quiet moment: once the first load has settled (idle, plus a beat), or
    // as soon as the visitor heads for the work, whichever comes first, so the shaders are compiled
    // before anyone scrolls there. It draws nothing until the section is on screen.
    let idle = 0, beat = 0;
    const go = () => {
      near.disconnect();
      window.clearTimeout(beat);
      setHost(section);
    };
    const ric = "requestIdleCallback" in window;
    const settle = () => (beat = window.setTimeout(() => (ric ? (idle = requestIdleCallback(go, { timeout: 2000 })) : go()), 2500));
    if (document.readyState === "complete") settle();
    else addEventListener("load", settle, { once: true });
    // (only a real visit counts: at load the hero fills the screen and the work is just below it)
    const near = new IntersectionObserver(([e]) => e.isIntersecting && scrollY > 80 && go(), { rootMargin: "25% 0px" });
    const seen = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    near.observe(section);
    seen.observe(el);
    return () => {
      near.disconnect();
      seen.disconnect();
      removeEventListener("load", settle);
      window.clearTimeout(beat);
      if (ric) cancelIdleCallback(idle);
      mq.removeEventListener("change", onMq);
      removeEventListener(DIMENSION_EVENT, onDim);
    };
  }, []);

  return (
    <div ref={box} aria-hidden="true" data-ready={ready || undefined} className="skyline-stage pointer-events-none absolute inset-x-0 top-0 hidden h-[88%] md:block">
      {host && (
        <Quiet>
          <Skyline active={active} verse={verse} reduce={reduce} host={host} visible={visible} onReady={() => setReady(true)} />
        </Quiet>
      )}
    </div>
  );
}
