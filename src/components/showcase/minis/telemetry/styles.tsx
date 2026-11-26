/**
 * This world's few keyframes, as a React 19 hoisted <style> (deduplicated by href), so no shared
 * stylesheet is touched. Compositor-only: clip-path, transform, opacity.
 */
const CSS = `
.inf-mini-draw,.inf-mini-head{animation-duration:10s;animation-timing-function:cubic-bezier(.65,0,.35,1);animation-iteration-count:infinite}
.inf-mini-head{opacity:0}
.inf-run .inf-mini-draw{animation-name:inf-mini-draw}
.inf-run .inf-mini-head{animation-name:inf-mini-head}
@keyframes inf-mini-draw{0%{clip-path:inset(0 100% 0 0);opacity:1}42%{clip-path:inset(0 0 0 0)}86%{clip-path:inset(0 0 0 0);opacity:1}96%{clip-path:inset(0 0 0 0);opacity:0}100%{clip-path:inset(0 100% 0 0);opacity:0}}
@keyframes inf-mini-head{0%{transform:translateX(-100%);opacity:1}42%{transform:translateX(0);opacity:1}52%,100%{transform:translateX(0);opacity:0}}
.inf-sweep{animation:inf-sweep 1.15s cubic-bezier(.16,1,.3,1) both}
@keyframes inf-sweep{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 -2% 0 0)}}
.inf-late{animation:inf-late .7s ease-out .9s both}
@keyframes inf-late{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.inf-run .inf-mini-draw,.inf-run .inf-mini-head,.inf-sweep,.inf-late{animation:none}}
`;

export function WorldStyles() {
  return (
    <style href="infinos-app-world" precedence="default">
      {CSS}
    </style>
  );
}
