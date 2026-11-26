import Link from "next/link";
import { projects } from "@/content/projects";
import { Rail } from "./showcase/Rail";

/**
 * THE WORK: the Darkroom Line (docs/interactive/PHASE4-DARKROOM-LINE.md). No background of its
 * own: the web from the hero carries on behind it (<Continuum>), and its thread lands on the
 * gallery's rail. The heading passes by at a calm size while the portrait is still leaving, so
 * there is never an empty screen between them.
 *
 * Without JavaScript the gallery can't move, so a plain list of the six projects stands in.
 */
const N = projects.length;
const builds = projects.filter((p) => !p.evidence.includes("concept")).length;
const two = (n: number) => String(n).padStart(2, "0");

export function Work() {
  return (
    <section id="work" aria-labelledby="work-title" className="dl relative pb-16 pt-[7vh] md:pb-24">
      <header className="dl-head">
        <p className="dl-kicker">
          Selected work <span aria-hidden="true">·</span> {two(N)} projects, {two(builds)} builds, {two(N - builds)} concept
        </p>
        <h2 id="work-title" className="dl-heading">
          Every line <em>connects.</em>
        </h2>
      </header>

      <div className="dl-live">
        <Rail />
      </div>

      <noscript>
        <style>{".dl-live{display:none}"}</style>
        <ul className="dl-list">
          {projects.map((p) => (
            <li key={p.slug}>
              <Link href={`/work/${p.slug}`}>
                <span className="dl-kicker"><b>{p.index}</b> {p.category}</span>
                <span className="dl-title">{p.title}</span>
                <span className="dl-one">{p.oneLine}</span>
                <span className="dl-kicker">Status: {p.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      </noscript>
    </section>
  );
}
