"use client";

import { useEffect, useState } from "react";

/**
 * TWO EARTHS. The site exists in two dimensions with the same content:
 *   The Verse:   the pages inked as a comic book (halftone, misregistered plates, caption
 *                boxes, SFX, motion on twos). The default, by the owner's choice (2026-11-26).
 *   Earth-Prime: the approved cinematic night edition. See docs/interactive/PLAN.md.
 *
 * The dimension lives on <html data-verse>. A tiny inline script in the layout sets the Verse before
 * paint on every full load, so every link to the site shows the same thing first. A jump to
 * Earth-Prime holds while you move around the site (client navigation keeps the attribute) and is
 * not remembered across reloads. Without JavaScript the page stays in Earth-Prime.
 */
const HINTED = "swing-shift:hinted";
export const DIMENSION_EVENT = "swing-shift:dimension";

export const isVerse = () => typeof document !== "undefined" && document.documentElement.dataset.verse === "1";

/** Inline, pre-paint: every full load opens in the Verse. */
export const dimensionBootScript = `document.documentElement.dataset.verse="1"`;

function set(on: boolean) {
  const html = document.documentElement;
  if (on) html.dataset.verse = "1";
  else delete html.dataset.verse;
  window.dispatchEvent(new CustomEvent(DIMENSION_EVENT, { detail: on }));
}

let busy = false;
/** The jump: the page glitches out of its dimension (RGB-split slices, on twos) and re-forms. */
export function jump(to = !isVerse()) {
  if (busy) return;
  const html = document.documentElement;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    set(to);
    return;
  }
  busy = true;
  html.dataset.glitch = "1";
  window.setTimeout(() => set(to), 280);
  window.setTimeout(() => {
    delete html.dataset.glitch;
    busy = false;
  }, 640);
}

/** The control in the bar: two plates, one per Earth. */
export function DimensionSwitch() {
  const [verse, setVerse] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the dimension is only known in the browser
    setVerse(isVerse());
    const on = (e: Event) => setVerse((e as CustomEvent<boolean>).detail);
    window.addEventListener(DIMENSION_EVENT, on);
    return () => window.removeEventListener(DIMENSION_EVENT, on);
  }, []);
  return (
    <button
      type="button"
      onClick={() => jump()}
      aria-pressed={verse}
      title="Jump dimension (V)"
      className="dimension-switch label group relative -my-3 flex items-center gap-2.5 py-3 text-silver transition-colors hover:text-text"
    >
      <span aria-hidden="true" className="dimension-plates relative block h-3.5 w-6">
        <span className="plate plate--c" />
        <span className="plate plate--m" />
        <span className="plate plate--k" />
      </span>
      <span className="hidden sm:inline">{verse ? "Verse" : "Prime"}</span>
      <span className="sr-only">: switch to {verse ? "Earth-Prime, the night edition" : "the Verse, the comic-book edition"}</span>
    </button>
  );
}

/**
 * Mounted once. Owns the V shortcut, the glitch overlay and the one-time hint: after the hero's
 * intro, a first-time visitor sees a two-frame glitch and a caption box pointing to Earth-Prime.
 */
export function DimensionRoot() {
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable]")) return;
      if (e.key === "v" || e.key === "V") {
        jump();
        setHint(false);
      }
    };
    window.addEventListener("keydown", onKey);
    let t1 = 0, t2 = 0, t3 = 0;
    let seen = true;
    try {
      seen = sessionStorage.getItem(HINTED) === "1";
    } catch {}
    if (!seen && location.pathname === "/") {
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      t1 = window.setTimeout(() => {
        if (!reduce) {
          // two frames of the other Earth
          document.documentElement.dataset.flicker = "1";
          t3 = window.setTimeout(() => delete document.documentElement.dataset.flicker, 170);
        }
        setHint(true);
        try {
          sessionStorage.setItem(HINTED, "1");
        } catch {}
      }, 3600);
      t2 = window.setTimeout(() => setHint(false), 3600 + 7000);
    }
    const close = () => setHint(false);
    window.addEventListener(DIMENSION_EVENT, close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(DIMENSION_EVENT, close);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  return (
    <>
      {/* The glitch: coloured plates and torn bands, only while jumping */}
      <div aria-hidden="true" className="glitch-veil pointer-events-none fixed inset-0 z-[80]">
        <span className="glitch-band glitch-band--1" />
        <span className="glitch-band glitch-band--2" />
        <span className="glitch-band glitch-band--3" />
        <span className="glitch-band glitch-band--4" />
      </div>
      <p role="status" className={`dimension-hint caption-box fixed right-5 top-[64px] z-[60] max-w-[17rem] md:right-10 md:top-[78px] ${hint ? "is-on" : ""}`}>
        {hint && (
          <>
            Psst. There’s a cinematic night edition too. <button type="button" onClick={() => jump(false)} className="underline decoration-2 underline-offset-2">Jump</button> or press <kbd>V</kbd>.
          </>
        )}
      </p>
    </>
  );
}
