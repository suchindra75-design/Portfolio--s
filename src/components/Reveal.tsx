"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { site } from "@/content/site";

/**
 * Two-image cursor reveal. Both images are the owner's own files:
 *   base  = spiderman_masked_portrait.png (771 x 1018, always visible)
 *   face  = suit-portrait.webp (1091 x 1442, his professional portrait; shown only inside a soft
 *           circle under the cursor)
 * Both are served unoptimised, so these are the exact pixels of his files. The portrait is 0.1%
 * taller in proportion than the box, so it is fitted with object-cover (about 1.5 px trimmed top and
 * bottom, never stretched); at that fit his eyes, chin and hairline land within a few pixels of the
 * mask's. The circle uncovers the whole portrait wherever it goes (face, hair, suit and tie), and
 * the portrait is the exact photo in both dimensions: the Verse re-inks only the Spider-Man layer.
 *
 * No React state: pointer input sets CSS variables, and a rAF loop runs only while the circle moves.
 */
const BASE = "/portrait/spiderman_masked_portrait.png";
const FACE = "/portrait/suit-portrait.webp";
const VERSE_BASE = "/portrait/verse/base.jpg";
const FACE_AT = { x: 0.5, y: 0.38 }; // centre of his face, as fractions of the box
const TAP_MOVE = 10; // px: more than this is a scroll or a drag, not a tap
const HOLD_MS = 260; // press and hold to drag the reveal on a touch screen

export function Reveal({ className = "" }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = box.current!;
    const layer = face.current!;
    const button = btn.current!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = matchMedia("(pointer: coarse)").matches;

    // Everything in fractions of the box, so a resize never shifts the reveal off the face.
    let rect = el.getBoundingClientRect();
    let tx = FACE_AT.x, ty = FACE_AT.y, x = tx, y = ty; // target and current centre
    let tr = 0, r = 0; // target and current radius, as a fraction of the box width
    let raf = 0, last = 0;
    let pinned = false; // keyboard or tap reveal is showing
    let found = false, foundSince = 0;

    const RADIUS = coarse ? 0.3 : 0.24;
    const paint = () => {
      layer.style.setProperty("--x", `${(x * 100).toFixed(2)}%`);
      layer.style.setProperty("--y", `${(y * 100).toFixed(2)}%`);
      layer.style.setProperty("--r", `${(r * rect.width).toFixed(1)}px`);
    };
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - (last || t)) / 1000);
      last = t;
      // Subtle follow: the circle trails the cursor slightly; reduced motion snaps.
      const k = reduce ? 1 : 1 - Math.exp(-dt * 12);
      const kr = reduce ? 1 : 1 - Math.exp(-dt * 8);
      x += (tx - x) * k;
      y += (ty - y) * k;
      r += (tr - r) * kr;
      paint();
      if (!found && r > RADIUS * 0.8 && Math.hypot((x - FACE_AT.x) * rect.width, (y - FACE_AT.y) * rect.height) < rect.width * 0.16) {
        foundSince ||= t;
        if (t - foundSince > 700) { found = true; el.dataset.found = "true"; el.dispatchEvent(new CustomEvent("reveal-found", { bubbles: true })); }
      } else foundSince = 0;
      const settled = Math.abs(tx - x) < 1e-4 && Math.abs(ty - y) < 1e-4 && Math.abs(tr - r) < 1e-4;
      if (settled) {
        x = tx; y = ty; r = tr; paint();
        raf = 0; last = 0;
      } else raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const aim = (cx: number, cy: number) => {
      tx = Math.min(1, Math.max(0, (cx - rect.left) / rect.width));
      ty = Math.min(1, Math.max(0, (cy - rect.top) / rect.height));
    };
    const show = (snap: boolean) => {
      if (snap || r < 0.01) { x = tx; y = ty; }
      tr = RADIUS;
      kick();
    };
    const hide = () => {
      tr = 0;
      pinned = false;
      button.setAttribute("aria-pressed", "false");
      kick();
    };
    const refresh = () => {
      rect = el.getBoundingClientRect();
      paint();
    };

    // Mouse and pen
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      refresh();
      aim(e.clientX, e.clientY);
      show(true);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      aim(e.clientX, e.clientY);
      if (tr === 0) show(true);
      kick();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      hide();
    };

    // Touch: a tap reveals at that spot (tap inside the circle again to close it);
    // press and hold, then drag, to move it. A normal swipe still scrolls the page.
    let downX = 0, downY = 0, downT = 0, holdTimer = 0, dragging = false;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      refresh();
      downX = t.clientX; downY = t.clientY; downT = performance.now();
      holdTimer = window.setTimeout(() => {
        dragging = true;
        aim(downX, downY);
        show(true);
      }, HOLD_MS);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!dragging) {
        if (Math.hypot(t.clientX - downX, t.clientY - downY) > TAP_MOVE) window.clearTimeout(holdTimer);
        return;
      }
      e.preventDefault();
      aim(t.clientX, t.clientY);
      kick();
    };
    const onTouchEnd = (e: TouchEvent) => {
      window.clearTimeout(holdTimer);
      if (dragging) { dragging = false; pinned = true; return; }
      const t = e.changedTouches[0];
      const moved = Math.hypot(t.clientX - downX, t.clientY - downY);
      if (moved > TAP_MOVE || performance.now() - downT > 600) return;
      const fx = (t.clientX - rect.left) / rect.width, fy = (t.clientY - rect.top) / rect.height;
      const inside = tr > 0 && Math.hypot((fx - x) * rect.width, (fy - y) * rect.height) < RADIUS * rect.width * 0.6;
      if (inside) hide();
      else { aim(t.clientX, t.clientY); show(false); pinned = true; }
    };

    // Keyboard and assistive tech: a toggle that shows the whole face.
    const onButton = () => {
      if (pinned || tr > 0) { hide(); return; }
      tx = FACE_AT.x; ty = FACE_AT.y; tr = 0.62; pinned = true;
      button.setAttribute("aria-pressed", "true");
      x = tx; y = ty; kick();
      found = true; el.dataset.found = "true";
    };

    // Stop when off screen; reset the reveal so it comes back masked.
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && tr > 0) { tr = r = 0; pinned = false; button.setAttribute("aria-pressed", "false"); paint(); }
    });
    const ro = new ResizeObserver(refresh);

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    button.addEventListener("click", onButton);
    window.addEventListener("scroll", refresh, { passive: true });
    io.observe(el);
    ro.observe(el);
    paint();

    // Test hook (local only): ?reveal=fx,fy shows the reveal at that point.
    const at = new URLSearchParams(location.search).get("reveal");
    if (at && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      const [a, b] = at.split(",").map(Number);
      tx = x = a; ty = y = b; tr = r = RADIUS; paint();
    }

    // Earth-Prime's base, fetched quietly after the first paint has settled
    const warm = window.setTimeout(() => {
      const img = new window.Image();
      img.fetchPriority = "low";
      img.src = BASE;
    }, 4500);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(holdTimer);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      button.removeEventListener("click", onButton);
      window.clearTimeout(warm);
      window.removeEventListener("scroll", refresh);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={box} className={`reveal ${className}`}>
      <div role="img" aria-label={`${site.name} in a Spider-Man suit with the mask on; underneath, his own portrait in a black suit and burgundy tie.`} className="absolute inset-0">
        {/* Every load opens in the Verse, so its base is the one to fetch first. Earth-Prime's base
            (1.1 MB) is lazy: hidden, it isn't fetched at all, and it is warmed once the page is idle
            (below), so a jump to Prime still finds it ready. */}
        <Image src={BASE} alt="" fill unoptimized loading="lazy" draggable={false} className="prime-only object-fill" />
        {/* The Verse: the same two files, re-inked offline (tools/verse-portrait), same registration */}
        <Image src={VERSE_BASE} alt="" fill unoptimized preload draggable={false} className="verse-only object-fill" />
        <div ref={face} className="reveal__face" aria-hidden="true">
          <Image src={FACE} alt="" fill unoptimized draggable={false} className="object-cover" />
        </div>
      </div>
      <button
        ref={btn}
        type="button"
        aria-pressed="false"
        className="label rounded-full border border-red/60 bg-black px-4 py-2 text-text sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:bottom-4 focus-visible:left-1/2 focus-visible:z-10 focus-visible:-translate-x-1/2"
      >
        Reveal face
      </button>
    </div>
  );
}
