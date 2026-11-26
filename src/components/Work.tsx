"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, ViewTransition } from "react";
import { projects } from "@/content/projects";
import { Chip } from "./Evidence";

/** Tower tops, stepping down to the right like a skyline (px from the top of the skyline). */
const TOPS = [0, 70, 140, 100, 180, 210];
/** Where each thumbnail is cropped. RAYA's capture still shows the old name in its header, so crop below it. */
const THUMB: Record<string, string> = { raya: "22% 50%" };
const CREDIT: Record<string, string> = { infinos: "© INFINOS Tech", "infinos-telemetry": "© INFINOS Tech" };

/**
 * THE WORK (comp f2): projects are lit windows on dark towers. Strands connect their roofs; the
 * one you are on catches the crimson light, the rest stay in shadow. The ESP32 concept sits last,
 * dashed, never next to RAYA. Hover, focus or ← → / Home / End selects; Enter swings in.
 * On phones the towers are a swipeable row and each carries its own tagline.
 */
export function Work() {
  const [i, setI] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const p = projects[i];

  const onKey = (e: React.KeyboardEvent) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const links = [...(list.current?.querySelectorAll("a") ?? [])];
    const cur = links.indexOf(document.activeElement as HTMLAnchorElement);
    const from = cur >= 0 ? cur : i;
    const n = e.key === "Home" ? 0 : e.key === "End" ? projects.length - 1 : (from + (e.key === "ArrowRight" ? 1 : -1) + projects.length) % projects.length;
    setI(n);
    links[n]?.focus();
  };

  return (
    <section id="work" aria-labelledby="work-title" className="relative overflow-hidden bg-void px-5 pb-24 pt-28 md:px-10 md:pb-32 md:pt-40">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(55% 45% at 62% 40%, rgba(122,21,18,0.28), transparent 70%)" }} />

      <div className="relative">
        <p className="label verse-caption text-dim">The work · five builds · one concept · one web</p>
        <h2 id="work-title" className="display mt-5 text-[clamp(52px,7.2vw,112px)] text-text">
          Every line <em>connects.</em>
        </h2>
      </div>

      <div className="relative mt-12 grid grid-cols-[minmax(0,1fr)] gap-12 lg:mt-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] lg:gap-10">
        {/* The selected project (desktop: hover / focus drives it) */}
        <div className="hidden lg:block lg:pt-6">
          <p className="label text-dim">
            <span className="text-red-text">{p.index} / 06</span> · {p.category}
          </p>
          <h3 className="display title-light mt-4 text-[clamp(48px,5.6vw,92px)]">{p.title}</h3>
          <p className="display mt-3 text-[clamp(24px,2.3vw,34px)] italic text-text">{p.tagline}</p>
          <p id="work-oneline" className="mt-6 max-w-[34rem] text-[17px] leading-[1.55] text-silver">
            {p.oneLine}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {p.evidence.map((k) => (
              <Chip key={k} kind={k}>
                {k === "upstream" && p.fork ? `Built on ${p.fork.of} · ${p.fork.by}` : undefined}
              </Chip>
            ))}
          </div>
          <Link href={`/work/${p.slug}`} className="label link-underline mt-9 inline-block text-text">
            Swing in<span className="sr-only"> to {p.title}</span> <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* The skyline */}
        <div className="relative">
          <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 hidden h-[300px] w-full overflow-visible lg:block" viewBox="0 0 600 300" preserveAspectRatio="none">
            {TOPS.slice(0, -1).map((t, k) => {
              const x1 = (k + 0.5) * 100, x2 = (k + 1.5) * 100, y1 = t, y2 = TOPS[k + 1];
              const lit = k === i || k + 1 === i;
              return <path key={k} className="strand" d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.max(y1, y2) + 46} ${x2} ${y2}`} fill="none" stroke={lit ? "var(--color-red)" : "#ffffff"} strokeOpacity={lit ? 0.8 : 0.16} strokeWidth="1" vectorEffect="non-scaling-stroke" />;
            })}
            <path className="strand" d={`M${(i + 0.5) * 100} -400 L${(i + 0.5) * 100} ${TOPS[i]}`} stroke="var(--color-red)" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>

          <ul
            ref={list}
            onKeyDown={onKey}
            aria-label="Projects"
            aria-describedby="work-hint"
            className="-mx-1.5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1.5 pb-4 pt-1.5 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-6 lg:items-start lg:overflow-visible lg:p-0"
          >
            {projects.map((q, k) => {
              const concept = q.evidence.includes("concept");
              return (
                <li key={q.slug} className="w-[70vw] max-w-[280px] flex-none snap-start sm:w-[40vw] lg:w-auto lg:max-w-none" style={{ ["--top" as string]: `${TOPS[k]}px` }}>
                  <Link
                    href={`/work/${q.slug}`}
                    data-active={k === i}
                    tabIndex={k === i ? 0 : -1}
                    aria-describedby={k === i ? "work-oneline" : undefined}
                    onMouseEnter={() => setI(k)}
                    onFocus={() => setI(k)}
                    className={`tower flex h-full flex-col border bg-[#070707] p-3 max-lg:focus-visible:outline-offset-[-4px] lg:mt-[var(--top)] lg:h-[calc(640px-var(--top))] lg:overflow-hidden lg:bg-[repeating-linear-gradient(0deg,transparent_0_26px,rgba(255,255,255,0.022)_26px_27px)] lg:[mask-image:linear-gradient(to_bottom,#000_80%,transparent)] ${concept ? "border-dashed border-white/25" : "border-white/10"}`}
                  >
                    <div className={`tower-shot relative aspect-[4/5] w-full flex-none overflow-hidden ${concept ? "border border-dashed border-white/20" : "bg-black"}`}>
                      {q.screen ? (
                        // Card to page: this thumbnail morphs into the project page's lit window
                        <ViewTransition name={`shot-${q.slug}`} share="morph" default="none">
                          <div className="absolute inset-0">
                            <Image src={q.screen.src} alt="" fill sizes="(min-width:1024px) 14vw, 70vw" className="object-cover" style={{ objectPosition: THUMB[q.slug] ?? "left top" }} />
                          </div>
                        </ViewTransition>
                      ) : (
                        <span className="label absolute inset-0 grid place-items-center px-3 text-center leading-[1.7] text-dim">No firmware available</span>
                      )}
                    </div>
                    {CREDIT[q.slug] && <span className="mt-1.5 text-[10px] tracking-[0.06em] text-dim">{CREDIT[q.slug]}</span>}
                    <p className="label mt-4 text-dim">{q.index}</p>
                    <p className="display mt-2 text-[clamp(24px,1.75vw,28px)] leading-[1.02] text-text">{q.title}</p>
                    <p className="display mt-2 text-[19px] italic leading-snug text-silver lg:hidden">{q.tagline}</p>
                    <p className="mt-3 font-mono text-[11px] uppercase leading-[1.55] tracking-[0.08em] text-dim">{q.status}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p id="work-hint" className="label mt-6 text-dim lg:mt-2">
            <span className="hidden lg:inline">Hover, or use ← → Home End, to move between rooftops · Enter to swing in</span>
            <span className="lg:hidden">Swipe across the rooftops · tap one to swing in</span>
          </p>
        </div>
      </div>
    </section>
  );
}
