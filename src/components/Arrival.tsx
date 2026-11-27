"use client";

import { useEffect, useState } from "react";

/**
 * THE ARRIVAL: who decides, and the two small controls (docs/interactive/ARRIVAL.md).
 *
 * The sequence itself lives in the hero's three.js scene (hero-web/arrival.ts). Whether it plays is
 * decided before the first paint by a tiny inline script, so the portrait never flashes up first:
 *   - only on a full load of the home page (a case study opened directly never plays it);
 *   - once per browser session (Back from a case study, a reload or a dimension jump never replay it);
 *   - never under prefers-reduced-motion, on a very small CPU, or with ?intro=0;
 *   - ?intro=1 forces it (for review).
 * The decision is html[data-arrival="play"]; the scene moves it on to "reveal" and "done". If the
 * scene can't start (no WebGL: "off"), or never does (a script failure: the boot script's own timer
 * sets "off"), the portrait simply comes up, and there is nothing to replay. A CSS
 * failsafe brings the portrait up regardless (globals.css), so nobody is ever left in the dark.
 */
const KEY = "swing-shift:arrived";
export const arrivalBootScript = `try{var d=document.documentElement,q=location.search,f=/[?&]intro=1/.test(q);if(location.pathname==="/"&&!/[?&]intro=0/.test(q)&&(f||!sessionStorage.getItem("${KEY}"))&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&(navigator.hardwareConcurrency||4)>2){d.dataset.arrival="play";sessionStorage.setItem("${KEY}","1");setTimeout(function(){if(d.dataset.arrival==="play"&&!window.__arrivalStarted){d.dataset.arrival="off";dispatchEvent(new CustomEvent("swing-shift:arrival-state",{detail:"off"}))}},5000)}}catch(e){}`;

type State = "" | "play" | "reveal" | "done" | "off"; // off: it couldn't play here (no WebGL)
const send = (cmd: "skip" | "replay") => window.dispatchEvent(new CustomEvent("swing-shift:arrival", { detail: cmd }));

/** Skip while it plays (also Esc); Replay, quietly, once it has finished. */
export function ArrivalControls() {
  const [state, setState] = useState<State>("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the boot script's decision is only known in the browser
    setState((document.documentElement.dataset.arrival as State) ?? "");
    const on = (e: Event) => setState((e as CustomEvent<State>).detail);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.documentElement.dataset.arrival === "play") send("skip");
    };
    window.addEventListener("swing-shift:arrival-state", on);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("swing-shift:arrival-state", on);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  if (!state || state === "off") return null;
  const playing = state === "play";
  return (
    <div className="arrival-controls absolute right-5 top-[118px] z-[6] md:right-10 md:top-[100px]">
      <button
        type="button"
        onClick={() => send(playing ? "skip" : "replay")}
        disabled={state === "reveal"}
        className={`label flex min-h-11 items-center gap-2 transition-[color,opacity] duration-500 ${playing ? "text-silver hover:text-text" : "text-dim hover:text-silver"} ${state === "reveal" ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        {playing ? (
          <>
            Skip intro <span aria-hidden="true" className="hidden text-dim md:inline">Esc</span>
          </>
        ) : (
          <>
            <span aria-hidden="true">↺</span> Replay intro
          </>
        )}
      </button>
    </div>
  );
}
