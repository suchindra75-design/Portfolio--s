/**
 * Comic SFX lettering for the Verse ("THWIP!"). Imperative and tiny: one element per pop,
 * removed when its animation ends. Only ever called on a user action.
 */
export function sfx(word: string, x: number, y: number, opts: { tilt?: number; size?: number } = {}) {
  if (typeof document === "undefined") return;
  const el = document.createElement("span");
  el.className = "sfx";
  el.setAttribute("aria-hidden", "true");
  el.textContent = word;
  const tilt = opts.tilt ?? (Math.random() * 16 - 8);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.setProperty("--tilt", `${tilt.toFixed(1)}deg`);
  if (opts.size) el.style.fontSize = `${opts.size}px`;
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
  window.setTimeout(() => el.remove(), 1600);
}
