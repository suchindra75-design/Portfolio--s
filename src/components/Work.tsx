"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { projects } from "@/content/projects";
import { Chip } from "./Evidence";
import { ProjectFrame } from "./showcase/frames";

/**
 * THE WORK, as six chapters in one continuous night (Phase 3, docs/interactive/PHASE3-CONTINUOUS.md).
 * No selector: the page simply scrolls on from the portrait into the work while the web recedes
 * behind it (<Continuum>). Each project is an editorial chapter composed for what it is, around
 * its real screen, with a clear way into the case study. A thin thread on the left shows where
 * you are and jumps between chapters. Media opens as it enters, once; nothing is pinned.
 */
const N = projects.length;
const builds = projects.filter((p) => !p.evidence.includes("concept")).length;
const WORDS = ["zero", "one", "two", "three", "four", "five", "six"];
const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

export function Work() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = section.current!;
    const chapters = [...el.querySelectorAll<HTMLElement>("[data-chapter]")];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // which chapter holds the middle of the screen
    const spy = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.chapter))),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    // open each chapter's media once as it arrives (only if motion is allowed and JS is running:
    // without either, everything is simply visible)
    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          (e.target as HTMLElement).dataset.reveal = "in";
          reveal.unobserve(e.target);
        }),
      { rootMargin: "0px 0px -12% 0px" },
    );
    chapters.forEach((c) => {
      spy.observe(c);
      if (!reduce) {
        c.dataset.reveal = "wait";
        reveal.observe(c);
      }
    });

    // thread progress through the work; the thread only shows once the work holds the screen
    // (never over the hero's own text, never over the About section)
    let raf = 0, on = false;
    const progress = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.5 - r.top) / r.height));
      el.style.setProperty("--pj-progress", p.toFixed(4));
      const now = r.top < innerHeight * 0.3 && r.bottom > innerHeight * 0.65;
      if (now !== on) { on = now; setInView(now); }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(progress); };
    addEventListener("scroll", onScroll, { passive: true });
    progress();

    // a small perspective shift toward the pointer on the media (desktop, motion allowed)
    const fine = matchMedia("(pointer: fine)").matches && !reduce;
    const media = [...el.querySelectorAll<HTMLElement>(".pj-media")];
    const move = (e: PointerEvent) => {
      const m = e.currentTarget as HTMLElement, r = m.getBoundingClientRect();
      m.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * 3).toFixed(2)}deg`);
      m.style.setProperty("--rx", `${(((e.clientY - r.top) / r.height - 0.5) * -2.2).toFixed(2)}deg`);
    };
    const leave = (e: PointerEvent) => {
      const m = e.currentTarget as HTMLElement;
      m.style.setProperty("--ry", "0deg");
      m.style.setProperty("--rx", "0deg");
    };
    if (fine) media.forEach((m) => { m.addEventListener("pointermove", move); m.addEventListener("pointerleave", leave); });

    return () => {
      spy.disconnect();
      reveal.disconnect();
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      if (fine) media.forEach((m) => { m.removeEventListener("pointermove", move); m.removeEventListener("pointerleave", leave); });
    };
  }, []);

  return (
    <section ref={section} id="work" aria-labelledby="work-title" className="pj relative z-[1]">
      <header className="pj-intro">
        <p className="label text-dim">Selected work</p>
        <h2 id="work-title" className="display pj-intro__title">
          Every line <em>connects.</em>
        </h2>
        <p className="pj-intro__count">
          {cap(WORDS[N])} projects: {WORDS[builds]} builds and {WORDS[N - builds]} concept.
        </p>
        <p className="pj-intro__lede">Each one opens into a full case study: what it is, what I did, the hard part and its honest status.</p>
      </header>

      {/* the thread: where you are in the work, and a way to jump (desktop) */}
      <nav aria-label="Projects" className="pj-thread" data-on={inView || undefined}>
        <span aria-hidden="true" className="pj-thread__line" />
        <ol>
          {projects.map((p, k) => (
            <li key={p.slug}>
              <a href={`#project-${p.slug}`} aria-current={k === active ? "true" : undefined} className="pj-thread__node">
                <span className="pj-thread__num">{p.index}</span>
                <span className="pj-thread__name">{p.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <ol className="pj-chapters">
        {projects.map((p, k) => {
          const concept = p.evidence.includes("concept");
          return (
            <li key={p.slug} id={`project-${p.slug}`} data-chapter={k} className={`pj-ch pj-ch--${p.slug}`} aria-labelledby={`pj-title-${p.slug}`}>
              <Link href={`/work/${p.slug}`} tabIndex={-1} aria-hidden="true" className="pj-media">
                <ProjectFrame p={p} />
              </Link>

              <div className="pj-text">
                <p className="pj-kicker">
                  <span className="pj-kicker__num">{p.index}</span>
                  <span>{p.category}</span>
                </p>
                <h3 id={`pj-title-${p.slug}`} className="display pj-title">
                  {p.title}
                </h3>
                <p className="display pj-tagline">{p.tagline}</p>
                <p className="pj-one">{p.oneLine}</p>
                <dl className="pj-spec">
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
                      {p.stack.slice(0, 5).join(" · ")}
                      {p.stack.length > 5 && <span className="text-dim"> · +{p.stack.length - 5} more</span>}
                    </dd>
                  </div>
                </dl>
                <div className="pj-chips">
                  {p.evidence.map((e) => (
                    <Chip key={e} kind={e}>
                      {e === "upstream" && p.fork ? `Built on ${p.fork.of} · ${p.fork.by}` : undefined}
                    </Chip>
                  ))}
                </div>
                <Link href={`/work/${p.slug}`} className="pj-cta">
                  Explore the case study<span className="sr-only">: {p.title}</span> <span aria-hidden="true">→</span>
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
