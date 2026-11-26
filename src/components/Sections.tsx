import Link from "next/link";
import { site } from "@/content/site";
import { Legend } from "./Evidence";
import { Clock } from "./Clock";
import { NightShift } from "./NightShift";

/** Screen-reader text for links that open a new tab; the arrow itself stays silent. */
export function External() {
  return (
    <>
      <span className="sr-only"> (opens in a new tab)</span> <span aria-hidden="true">↗</span>
    </>
  );
}

/** A short hello, with the way into the full About page. */
export function AboutStrip() {
  return (
    <section id="about" aria-labelledby="about-title" className="border-t hairline bg-void px-5 py-24 md:px-10 md:py-36">
      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
        <h2 id="about-title" className="display text-[clamp(40px,5.4vw,84px)] text-text">
          I build systems that keep working when <em className="text-silver">nobody’s watching.</em>
        </h2>
        <div className="max-w-[30rem] self-end">
          <p className="text-[18px] leading-[1.65] text-silver">
            Full-stack developer at {site.company} in {site.location}, and an electrical &amp; electronics engineering student at CBIT. I work across the web, phones, AI assistants and the hardware they talk to: sensors, Bluetooth, microcontrollers.
          </p>
          <Link href="/about" className="label link-underline mt-8 inline-block text-text">
            More about me <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Contact: the closing frame of the home page, under a faint reticle. */
export function Contact() {
  const email = site.links.find((l) => l.label === "Email")!;
  return (
    <section id="contact" aria-labelledby="contact-title" className="relative overflow-hidden border-t hairline bg-void px-5 pb-20 pt-24 md:px-10 md:pt-36">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 60% at 15% 100%, rgba(122,21,18,0.35), transparent 70%)" }} />
      <svg aria-hidden="true" viewBox="0 0 100 100" className="pointer-events-none absolute -right-[12vw] top-10 h-[min(84vw,760px)] w-[min(84vw,760px)] opacity-60">
        <circle cx="50" cy="50" r="48" fill="none" stroke="var(--color-red)" strokeOpacity="0.45" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <g stroke="var(--color-red)" strokeOpacity="0.45" strokeWidth="1" vectorEffect="non-scaling-stroke">
          <line x1="50" y1="0" x2="50" y2="3" />
          <line x1="0" y1="50" x2="3" y2="50" />
          <line x1="97" y1="50" x2="100" y2="50" />
          <line x1="50" y1="97" x2="50" y2="100" />
        </g>
      </svg>
      <div className="relative">
        <p className="label text-dim">
          <Clock />
        </p>
        <h2 id="contact-title" className="display mt-6 text-[clamp(56px,9vw,150px)] text-text">
          Got something <em>to build?</em>
        </h2>
        <a href={email.href} className="display link-underline mt-10 inline-block text-[clamp(26px,3.4vw,52px)] italic text-text [overflow-wrap:anywhere]">
          suchindra75@gmail.com
        </a>
        <ul className="mt-10 flex flex-wrap gap-8">
          {site.links
            .filter((l) => l.label !== "Email")
            .map((l) => (
              <li key={l.label}>
                <a href={l.href} target="_blank" rel="noreferrer" className="label link-underline text-silver">
                  {l.label}
                  <External />
                </a>
              </li>
            ))}
        </ul>
        <div className="mt-24 border-t hairline pt-12">
          <Legend />
        </div>
      </div>
    </section>
  );
}

/** Every page closes on the edition line, the portrait credit and the rights notice. */
export function SiteFooter() {
  return (
    <footer className="site-footer border-t hairline bg-void">
      <NightShift />
      <div className="border-t hairline px-5 py-10 md:px-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <p className="label text-dim">
          Swing Shift <span className="text-red-text">/</span> the night edition · © 2026 {site.name}
        </p>
        <div className="max-w-[40rem] space-y-2 text-[13px] leading-[1.6] text-dim">
          <p>Hero portrait: a digital composite of Suchindra in the suit, supplied by him. The mask layer and the face layer are his two image files, unedited.</p>
          <p>The Verse (press V): the same two images run through a halftone filter (tools/verse-portrait). Nothing is generated or redrawn.</p>
          <p>The Spider-Man suit and emblem belong to Marvel / Sony. A non-commercial fan edition, not affiliated with or endorsed by them. The comic lettering and effects are drawn for this site.</p>
        </div>
      </div>
      </div>
    </footer>
  );
}
