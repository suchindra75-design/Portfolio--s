/* The plan drawing's styles. Inline (React hoists and dedupes it by href) because this project's
   turbopack rule treats every .css file as global, so CSS modules are not hashed. Classes are
   prefixed sps- (SIMPLEIN plan). */
export const PLAN_CSS = `
/* SIMPLEIN plan drawing: the line drawing draws itself wing by wing (≤ 1.2 s), then rests.
   Every stroked shape carries pathLength="1", so a dash of 1 is the whole outline.
   --d is each group's start (seconds). Compositor-cheap: stroke-dashoffset and opacity only. Fades and fills run 'backwards'
   (not 'both'), so once done they hand back to the resting style and drop their layers. */

.sps-svg {
  display: block;
  overflow: visible;
}

.sps-anim .sps-s {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: sps-draw 0.5s cubic-bezier(0.65, 0, 0.35, 1) var(--d, 0s) both;
}
.sps-anim .sps-f {
  animation: sps-fill 0.45s ease-out calc(var(--d, 0s) + 0.18s) backwards;
}
.sps-anim .sps-sf {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation:
    sps-draw 0.5s cubic-bezier(0.65, 0, 0.35, 1) var(--d, 0s) both,
    sps-fill 0.45s ease-out calc(var(--d, 0s) + 0.18s) backwards;
}
.sps-anim .sps-t {
  animation: sps-fade 0.35s ease-out calc(var(--d, 0s) + 0.22s) backwards;
}

@keyframes sps-draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes sps-fill {
  from {
    fill-opacity: 0;
  }
}
@keyframes sps-fade {
  from {
    opacity: 0;
  }
}

/* ── Mini: waits for its first sight, then idles only while visible. ── */
.sps-mini:not([data-live]) * {
  animation-play-state: paused !important;
}

/* One wing at a time: its rooms warm up while a request (the verdigris dot) walks from the
   portway down the passage to the core. 8 s for the four wings. */
.sps-pulse {
  opacity: 0;
}
.sps-dot {
  opacity: 0;
}
.sps-mini .sps-pulse {
  animation: sps-pulse 8s linear calc(1.4s + var(--k) * 2s) infinite;
}
.sps-mini .sps-dot {
  animation: sps-travel 8s cubic-bezier(0.65, 0, 0.35, 1) calc(1.4s + var(--k) * 2s) infinite;
}
@keyframes sps-pulse {
  0% {
    opacity: 0;
  }
  4% {
    opacity: 1;
  }
  21% {
    opacity: 1;
  }
  27% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}
@keyframes sps-travel {
  0% {
    opacity: 0;
    transform: translateY(25.4px);
  }
  3% {
    opacity: 1;
    transform: translateY(25.4px);
  }
  20% {
    opacity: 1;
    transform: translateY(3.8px);
  }
  25% {
    opacity: 0;
    transform: translateY(3.8px);
  }
  100% {
    opacity: 0;
    transform: translateY(3.8px);
  }
}

/* ── Fallback (no WebGL): the walkthrough's current wing lights up. ── */
.sps-hl {
  opacity: 0;
  transition: opacity 0.5s ease;
}
.sps-fallback[data-wing="0"] .sps-hl[data-k="0"],
.sps-fallback[data-wing="1"] .sps-hl[data-k="1"],
.sps-fallback[data-wing="2"] .sps-hl[data-k="2"],
.sps-fallback[data-wing="3"] .sps-hl[data-k="3"] {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .sps-anim .sps-s,
  .sps-anim .sps-f,
  .sps-anim .sps-sf,
  .sps-anim .sps-t {
    animation: none;
    stroke-dasharray: none;
    stroke-dashoffset: 0;
  }
  .sps-mini .sps-pulse,
  .sps-mini .sps-dot {
    animation: none;
    opacity: 0;
  }
}

/* ── Hero placement: the plan sits top/right; the bottom-left stays calm for the title. ── */
.sps-heroPlan {
  --S: 140vw;
  position: absolute;
  width: var(--S);
  height: var(--S);
  left: calc(52% - var(--S) / 2);
  top: calc(43svh - var(--S) / 2);
  -webkit-mask-image: linear-gradient(to bottom, #000 54%, transparent 90%);
  mask-image: linear-gradient(to bottom, #000 54%, transparent 90%);
}
/* On phones the title block would sit under the menu and off the edge; the page says it in text. */
@media (max-width: 767px) {
  .sps-heroPlan .sps-tb {
    display: none;
  }
}
@media (min-width: 768px) {
  .sps-heroPlan {
    --S: min(98svh, 70vw);
    left: calc(66% - var(--S) / 2);
    top: calc(52% - var(--S) / 2);
    -webkit-mask-image: linear-gradient(to bottom, #000 66%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 66%, transparent 100%);
  }
}
`;
