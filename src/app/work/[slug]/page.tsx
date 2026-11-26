import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { nextProject, projectBySlug, projects } from "@/content/projects";
import { Chip, Legend } from "@/components/Evidence";
import { External } from "@/components/Sections";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = projectBySlug((await params).slug);
  return p ? { title: p.title, description: p.oneLine } : {};
}

/** Title size steps down for long names so every title sets on one or two lines. */
const titleSize = (t: string) => (t.length <= 8 ? "text-[clamp(84px,13vw,220px)]" : t.length <= 18 ? "text-[clamp(60px,8.5vw,140px)]" : "text-[clamp(48px,6.4vw,104px)]");

/**
 * A PROJECT (comp f3). The real screen in a window lit from the left; the five answers a reviewer
 * looks for first, with red only on "The hard part"; then what I built, how it works, the stack,
 * the links, the honest notes, and the legend.
 */
export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = projectBySlug((await params).slug);
  if (!p) notFound();
  const next = nextProject(p.slug);
  const concept = p.evidence.includes("concept");
  const eight = [
    { k: "What it is", v: p.eight.what },
    { k: "What I did", v: p.eight.did },
    { k: "The hard part", v: p.eight.hard, red: true },
    { k: "What changed", v: p.eight.changed },
    { k: "Status", v: p.status },
  ];

  return (
    <main id="main" tabIndex={-1} className="relative overflow-hidden bg-void outline-none">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[900px]" style={{ background: "radial-gradient(45% 50% at 72% 30%, rgba(122,21,18,0.32), transparent 70%)" }} />

      {/* Opening */}
      <header className="relative grid gap-12 px-5 pb-16 pt-28 md:px-10 md:pt-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
        <div>
          <p className="label leading-[1.8] text-dim">
            <span className="text-red-text">{p.index}</span> · {p.category} · {p.status}
          </p>
          <h1 className={`display title-light mt-4 ${titleSize(p.title)}`}>{p.title}</h1>
          <p className="display mt-5 text-[clamp(26px,2.6vw,40px)] italic text-text">{p.tagline}</p>
          <p className="mt-7 max-w-[36rem] text-[clamp(17px,1.35vw,20px)] leading-[1.55] text-text">{p.oneLine}</p>

          {p.fork && (
            <p className="mt-7 max-w-[36rem] border-l border-white/25 pl-5 text-[15px] leading-[1.65] text-dim">
              A fork of{" "}
              <a href={p.fork.url} target="_blank" rel="noreferrer" className="link-underline text-text">
                {p.fork.of} by {p.fork.by}
              </a>{" "}
              (
              <a href={p.fork.licenceUrl} target="_blank" rel="noreferrer" className="link-underline">
                {p.fork.licence}
              </a>
              ). <span className="text-silver">Upstream:</span> {p.fork.upstream}. <span className="text-text">Mine:</span> {p.fork.mine}.
            </p>
          )}

          <div className="mt-7 flex flex-wrap gap-2">
            {p.evidence.map((k) => (
              <Chip key={k} kind={k} />
            ))}
          </div>
        </div>

        <figure className="self-start lg:mt-10">
          {p.screen ? (
            <div className="lit-window aspect-[16/10] overflow-hidden">
              <Image src={p.screen.src} alt={p.screen.alt} fill preload sizes="(min-width:1024px) 52vw, 100vw" className="object-cover object-left-top" />
            </div>
          ) : (
            <div className="grid aspect-[16/10] place-items-center border border-dashed border-white/25 px-8 text-center">
              <p className="label leading-[1.8] text-dim">Concept · no screenshot: the firmware isn’t available</p>
            </div>
          )}
          {p.screen && (
            <figcaption className="mt-4 flex flex-wrap items-start gap-4">
              <Chip kind="screenshot" />
              <span className="max-w-[34rem] pt-1 text-[14px] leading-[1.55] text-dim">{p.screen.caption}</span>
            </figcaption>
          )}
        </figure>
      </header>

      {/* In 8 seconds */}
      <section aria-labelledby="eight" className="relative px-5 md:px-10">
        <h2 id="eight" className="sr-only">
          In 8 seconds
        </h2>
        <dl className="grid border-t hairline sm:grid-cols-2 lg:grid-cols-5">
          {eight.map((e) => (
            <div key={e.k} className="relative border-b hairline py-7 pr-6 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0">
              {e.red && <span aria-hidden="true" className="absolute -top-px left-0 h-0.5 w-14 bg-red lg:left-6" />}
              <dt className="label text-dim">{e.k}</dt>
              <dd className="mt-4 text-[16px] leading-[1.55] text-text">{e.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Numbers */}
      {p.numbers.length > 0 && (
        <section aria-label="In numbers" className="relative px-5 pt-20 md:px-10">
          <ul className="flex flex-wrap gap-x-16 gap-y-10">
            {p.numbers.map((n) => (
              <li key={n.label}>
                <p className="display text-[clamp(56px,6vw,96px)] text-text">{n.value}</p>
                <p className="label mt-3 max-w-[16rem] leading-[1.6] text-dim">{n.label}</p>
                <div className="mt-3">
                  <Chip kind={n.evidence} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* What I built + how it works */}
      <section className="relative grid gap-16 px-5 pt-24 md:px-10 lg:grid-cols-2 lg:gap-20">
        <div>
          <h2 className="display text-[clamp(36px,3.6vw,56px)] text-text">{concept ? "What exists" : "What I built"}</h2>
          {p.built.length > 0 ? (
            <ol className="mt-8 space-y-6">
              {p.built.map((b, k) => (
                <li key={k} className="grid grid-cols-[2.5rem_1fr] text-[17px] leading-[1.6] text-silver">
                  <span className="label pt-1 text-dim">{String(k + 1).padStart(2, "0")}</span>
                  <span>{b}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-8 max-w-[32rem] text-[17px] leading-[1.6] text-silver">The résumé prototype (ESP32, Embedded C, two-channel relay) has no firmware available to show, so nothing here is presented as built. It is labelled as a concept everywhere it appears.</p>
          )}
        </div>
        <div>
          <h2 className="display text-[clamp(36px,3.6vw,56px)] text-text">{concept ? "How it would work" : "How it works"}</h2>
          <ul className="mt-8 space-y-8">
            {p.features.map((f) => (
              <li key={f.title} className={`border-l pl-5 ${concept ? "border-dashed border-white/25" : "border-white/15"}`}>
                <h3 className="text-[18px] font-semibold text-text">{f.title}</h3>
                <p className="mt-2 text-[16px] leading-[1.6] text-silver">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stack, links, notes */}
      <section className="relative grid gap-14 px-5 pt-24 md:px-10 lg:grid-cols-3">
        <div>
          <h2 className="label text-dim">Stack</h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {p.stack.map((s) => (
              <li key={s} className="border border-white/15 px-3 py-1.5 text-[14px] text-silver">
                {s}
              </li>
            ))}
          </ul>
          <p className="label mt-8 text-dim">Role</p>
          <p className="mt-3 text-[16px] text-silver">{p.role}</p>
        </div>
        <div>
          <h2 className="label text-dim">Links</h2>
          {p.links.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {p.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="display link-underline text-[26px] italic text-text">
                    {l.label}
                    <External />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-[16px] text-silver">None: no firmware or repository is available to link to.</p>
          )}
        </div>
        <div>
          <h2 className="label text-dim">Notes &amp; credits</h2>
          <ul className="mt-5 space-y-4">
            {p.notes.map((n) => (
              <li key={n} className="text-[15px] leading-[1.6] text-dim">
                {n}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Legend + next */}
      <section className="relative mt-24 border-t hairline px-5 py-14 md:px-10">
        <Legend />
      </section>
      <nav aria-label="Next project" className="relative border-t hairline px-5 pb-20 pt-14 md:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="label text-dim">Next swing</p>
            <Link href={`/work/${next.slug}`} className="group mt-4 flex items-baseline gap-5">
              <span className="display text-[clamp(44px,6vw,96px)] leading-[0.95] text-text transition-colors group-hover:text-red-text">{next.title}</span>
              <span aria-hidden="true" className="display text-[clamp(32px,4vw,64px)] text-dim transition-transform group-hover:translate-x-2">
                →
              </span>
            </Link>
            <p className="display mt-3 text-[clamp(20px,1.8vw,28px)] italic text-silver">{next.tagline}</p>
            <Link href="/#work" className="label link-underline mt-10 inline-block text-silver">
              All work
            </Link>
          </div>
          {next.screen ? (
            <Link href={`/work/${next.slug}`} tabIndex={-1} aria-hidden="true" className="lit-window block aspect-[16/10] overflow-hidden">
              <Image src={next.screen.src} alt="" fill sizes="(min-width:1024px) 48vw, 100vw" className="object-cover object-left-top" />
            </Link>
          ) : (
            <div aria-hidden="true" className="grid aspect-[16/10] place-items-center border border-dashed border-white/20">
              <span className="label text-dim">Concept</span>
            </div>
          )}
        </div>
      </nav>
    </main>
  );
}
