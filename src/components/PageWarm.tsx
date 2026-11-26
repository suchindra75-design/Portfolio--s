"use client";

import { useEffect } from "react";
import { getImageProps } from "next/image";
import { projectBySlug } from "@/content/projects";

/**
 * NO VISIBLE LOAD (the Active Theory lesson). The moment a pointer or keyboard focus reaches a link
 * to a project, the page's main screenshot starts downloading and decoding, with the same srcset and
 * sizes the project page asks for, so the browser's cache already holds the exact file. By the time
 * the page transition reveals the new page, its lit window is already lit. Next's own <Link>
 * prefetch covers the page data.
 */
const warmed = new Set<string>();

function warm(slug: string) {
  if (warmed.has(slug)) return;
  warmed.add(slug);
  const p = projectBySlug(slug);
  if (!p?.screen) return;
  const { props } = getImageProps({ src: p.screen.src, alt: "", fill: true, sizes: "(min-width:1024px) 52vw, 100vw" });
  const img = new Image();
  img.decoding = "async";
  if (props.sizes) img.sizes = props.sizes;
  if (props.srcSet) img.srcset = props.srcSet;
  img.src = props.src;
  img.decode?.().catch(() => {});
}

export function PageWarm() {
  useEffect(() => {
    const on = (e: Event) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href^='/work/']");
      const slug = a?.getAttribute("href")?.split("/")[2]?.split(/[?#]/)[0];
      if (slug) warm(slug);
    };
    document.addEventListener("pointerover", on, { passive: true });
    document.addEventListener("focusin", on);
    document.addEventListener("touchstart", on, { passive: true });
    return () => {
      document.removeEventListener("pointerover", on);
      document.removeEventListener("focusin", on);
      document.removeEventListener("touchstart", on);
    };
  }, []);
  return null;
}
