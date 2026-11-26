import type { Metadata } from "next";
import { education, experience, recognition, skills } from "@/content/profile";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "About", description: `${site.name}: experience, skills and education.` };

export default function About() {
  return (
    <main id="main" tabIndex={-1} className="relative overflow-hidden bg-void outline-none px-5 pb-24 pt-28 md:px-10 md:pt-40">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[700px]" style={{ background: "radial-gradient(45% 55% at 20% 20%, rgba(122,21,18,0.3), transparent 70%)" }} />
      <div className="relative">
        <p className="label text-dim">About</p>
        <h1 className="display title-light mt-5 text-[clamp(60px,10vw,168px)]">Suchindra</h1>
        <p className="display mt-4 text-[clamp(26px,2.6vw,40px)] italic text-text">Full-stack developer, by day and on the night shift.</p>
        <p className="mt-8 max-w-[40rem] text-[clamp(17px,1.35vw,20px)] leading-[1.6] text-silver">
          I’m {site.name}, a full-stack developer at {site.company} in {site.location}. I build products end to end: web apps, phone apps, AI assistants that act on a computer, and the software that sits next to hardware (sensors, Bluetooth, microcontrollers). I use AI coding tools every day.
        </p>

        <section aria-labelledby="exp" className="mt-24 grid gap-10 border-t hairline pt-12 lg:grid-cols-[16rem_1fr]">
          <h2 id="exp" className="label text-dim">Experience</h2>
          <ol className="space-y-14">
            {experience.map((r) => (
              <li key={r.company}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="display text-[clamp(32px,3vw,48px)] text-text">{r.company}</h3>
                  <span className="label text-dim">{r.period}</span>
                </div>
                <p className="mt-2 text-[16px] text-silver">{r.role}</p>
                <ul className="mt-5 space-y-3">
                  {r.notes.map((n) => (
                    <li key={n} className="max-w-[44rem] border-l border-white/15 pl-4 text-[16px] leading-[1.6] text-dim">
                      {n}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="edu" className="mt-20 grid gap-10 border-t hairline pt-12 lg:grid-cols-[16rem_1fr]">
          <h2 id="edu" className="label text-dim">Education</h2>
          <div>
            <p className="display text-[clamp(28px,2.6vw,40px)] text-text">{education.degree}</p>
            <p className="mt-2 text-[16px] text-silver">
              {education.school} · {education.years}
            </p>
          </div>
        </section>

        <section aria-labelledby="skills" className="mt-20 grid gap-10 border-t hairline pt-12 lg:grid-cols-[16rem_1fr]">
          <h2 id="skills" className="label text-dim">Skills</h2>
          <div className="grid gap-10 sm:grid-cols-2">
            {skills.map((g) => (
              <div key={g.group}>
                <h3 className="text-[17px] font-semibold text-text">{g.group}</h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {g.items.map((s) => (
                    <li key={s} className="border border-white/15 px-3 py-1.5 text-[14px] text-silver">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="rec" className="mt-20 grid gap-10 border-t hairline pt-12 lg:grid-cols-[16rem_1fr]">
          <h2 id="rec" className="label text-dim">Recognition</h2>
          <ul className="space-y-6">
            {recognition.map((r) => (
              <li key={r.title} className="flex flex-wrap items-baseline justify-between gap-3 border-b hairline pb-6">
                <span>
                  <span className="block text-[17px] text-text">{r.title}</span>
                  <span className="text-[15px] text-dim">{r.org}</span>
                </span>
                <span className="label text-dim">{r.period}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-24 border-t hairline pt-12">
          <p className="display text-[clamp(36px,4vw,64px)] text-text">
            Say hello: <a href="mailto:suchindra75@gmail.com" className="link-underline italic [overflow-wrap:anywhere]">suchindra75@gmail.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
