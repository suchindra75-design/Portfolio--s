"use client";

import Link from "next/link";
import { getImageProps } from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { projects } from "@/content/projects";
import { Chip } from "./Evidence";
import { Atlas } from "./showcase/Atlas";
import { ProjectFrame } from "./showcase/frames";

/**
 * THE WORK: the connected atlas (docs/interactive/PHASE2-SHOWCASE.md).
 * Left, the atlas: six destinations on one web, and a numbered index (the keyboard and
 * screen-reader route: a tab list). Right, the stage: the selected project's frame, composed for
 * that project around its real screen, then the one-line, the spec and the way in. Arrows, Home,
 * End move; Enter opens the case study; on phones, swipe the frame or tap a number.
 */
const N = projects.length;
const builds = projects.filter((p) => !p.evidence.includes("concept")).length;
const two = (n: number) => String(n).padStart(2, "0");
const SIZES = "(min-width:1024px) 60vw, 100vw";

/** Warm a project's screen at the size the stage will ask for. */
function warm(k: number) {
  const s = projects[(k + N) % N].screen;
  if (!s) return;
  const { props } = getImageProps({ src: s.src, alt: "", fill: true, sizes: SIZES });
  preload(props.src as string, { as: "image", imageSrcSet: props.srcSet, imageSizes: SIZES, fetchPriority: "low" });
}

export function Work() {
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(-1);
  const [dir, setDir] = useState(1);
  const router = useRouter();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const p = projects[i];

  const select = useCallback((n: number, focus = false) => {
    const k = (n + N) % N;
    setI((cur) => {
      if (k !== cur) setDir(k > cur ? 1 : -1);
      return k;
    });
    warm(k + 1);
    warm(k - 1);
    if (focus) tabs.current[k]?.focus();
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: N - 1 };
    if (e.key in map) {
      e.preventDefault();
      select(map[e.key], true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      router.push(`/work/${p.slug}`);
    }
  };

  // swipe the frame on touch screens (vertical scrolling stays native)
  useEffect(() => {
    const el = stage.current!;
    let x0 = 0, y0 = 0, id = -1;
    const down = (e: PointerEvent) => { if (e.pointerType === "mouse") return; x0 = e.clientX; y0 = e.clientY; id = e.pointerId; };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        el.dataset.swiped = "1"; // the tap that ends a swipe must not open the case study
        window.setTimeout(() => delete el.dataset.swiped, 400);
        select(i + (dx < 0 ? 1 : -1));
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    return () => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointerup", up); };
  }, [i, select]);

  // a small perspective shift toward the pointer (desktop, motion allowed)
  useEffect(() => {
    const el = stage.current!;
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 3).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(((e.clientY - r.top) / r.height - 0.5) * -2.4).toFixed(2)}deg`);
    };
    const leave = () => { el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, []);

  const concept = p.evidence.includes("concept");

  return (
    <section id="work" aria-labelledby="work-title" className="sc relative overflow-hidden bg-void px-5 pb-24 pt-28 md:px-10 md:pb-32 md:pt-40">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 40% at 70% 45%, rgba(122,21,18,0.22), transparent 70%)" }} />

      {/* Intro */}
      <header className="relative grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end">
        <div>
          <p className="label verse-caption text-dim">The work · the main body of it</p>
          <h2 id="work-title" className="display mt-5 text-[clamp(52px,7.2vw,112px)] text-text">
            Every line <em>connects.</em>
          </h2>
        </div>
        <div className="sc-count lg:justify-self-end lg:text-right">
          <p className="label text-silver">
            <span className="sc-count__n">{two(N)}</span> projects <span className="text-dim">·</span> <span className="sc-count__n">{two(builds)}</span> builds <span className="text-dim">·</span> <span className="sc-count__n">{two(N - builds)}</span> concept
          </p>
          <p className="mt-3 max-w-[26rem] text-[15px] leading-[1.55] text-dim lg:ml-auto">Pick a thread. Every project opens into a full case study: what it is, what I did, the hard part and the honest status.</p>
        </div>
      </header>

      <div className="relative mt-14 grid grid-cols-[minmax(0,1fr)] gap-10 lg:mt-20 lg:grid-cols-[minmax(0,0.52fr)_minmax(0,1fr)] lg:gap-14">
        {/* The atlas and the index */}
        <div className="sc-nav min-w-0 lg:sticky lg:top-28 lg:self-start">
          <div className="hidden px-2 lg:block">
            <Atlas active={i} hover={hover} onHover={setHover} onSelect={(k) => select(k)} />
          </div>
          <ul role="tablist" aria-label="Projects" aria-orientation="vertical" onKeyDown={onKey} className="sc-index -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:mt-4 lg:block lg:overflow-visible lg:px-0">
            {projects.map((q, k) => (
              <li key={q.slug} className="flex-none lg:flex-auto">
                <button
                  ref={(el) => { tabs.current[k] = el; }}
                  type="button"
                  role="tab"
                  id={`work-tab-${k}`}
                  aria-selected={k === i}
                  aria-controls="work-panel"
                  tabIndex={k === i ? 0 : -1}
                  onClick={() => select(k)}
                  onPointerEnter={() => { setHover(k); warm(k); }}
                  onPointerLeave={() => setHover(-1)}
                  onFocus={() => warm(k)}
                  data-active={k === i || undefined}
                  data-hover={k === hover || undefined}
                  className={`sc-tab ${q.evidence.includes("concept") ? "is-concept" : ""}`}
                >
                  <span className="sc-tab__num">{q.index}</span>
                  <span className="sc-tab__title">{q.title}</span>
                  <span className="sc-tab__status">{q.status}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="label mt-4 hidden text-dim lg:block">Arrow keys move · Enter opens</p>
        </div>

        {/* The stage */}
        <div id="work-panel" role="tabpanel" aria-labelledby={`work-tab-${i}`} className="min-w-0">
          <div ref={stage} className="sc-stage" style={{ ["--dir" as string]: dir }}>
            <Link
              href={`/work/${p.slug}`}
              tabIndex={-1}
              aria-hidden="true"
              onClick={(e) => { if (stage.current?.dataset.swiped) e.preventDefault(); }}
              className="sc-stage__link block"
              key={p.slug}
            >
              <ProjectFrame p={p} />
            </Link>
          </div>

          <div key={`d-${p.slug}`} className="sc-detail mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:gap-12">
            <div>
              <p className="label text-dim">
                <span className="text-red-text">[{p.index}]</span> · {p.category}
              </p>
              <h3 aria-live="polite" className="display title-light mt-3 text-[clamp(44px,5.2vw,88px)]">
                {p.title}
              </h3>
              <p className="display mt-3 text-[clamp(22px,2vw,30px)] italic text-text">{p.tagline}</p>
              <p className="mt-5 max-w-[34rem] text-[17px] leading-[1.55] text-silver">{p.oneLine}</p>
            </div>
            <div>
              <dl className="sc-spec">
                <div>
                  <dt>Status</dt>
                  <dd className={concept ? "text-text" : undefined}>{p.status}</dd>
                </div>
                <div>
                  <dt>My part</dt>
                  <dd>{p.eight.did}</dd>
                </div>
                <div>
                  <dt>Stack</dt>
                  <dd>
                    {p.stack.slice(0, 6).join(" · ")}
                    {p.stack.length > 6 && <span className="text-dim"> · +{p.stack.length - 6} more in the case study</span>}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                {p.evidence.map((k) => (
                  <Chip key={k} kind={k}>
                    {k === "upstream" && p.fork ? `Built on ${p.fork.of} · ${p.fork.by}` : undefined}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t hairline pt-6">
            <Link href={`/work/${p.slug}`} className="sc-cta">
              Open the case study<span className="sr-only">: {p.title}</span> <span aria-hidden="true">→</span>
            </Link>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => select(i - 1, true)} className="sc-arrow" aria-label={`Previous project: ${projects[(i - 1 + N) % N].title}`}>
                <span aria-hidden="true">←</span>
              </button>
              <span className="label text-silver" aria-hidden="true">
                <span className="text-text">{p.index}</span> / {two(N)}
              </span>
              <button type="button" onClick={() => select(i + 1, true)} className="sc-arrow" aria-label={`Next project: ${projects[(i + 1) % N].title}`}>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
          <p className="label mt-4 text-dim lg:hidden">Swipe the frame or tap a number</p>
        </div>
      </div>
    </section>
  );
}
