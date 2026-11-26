import { Hero } from "@/components/Hero";
import { Work } from "@/components/Work";
import { AboutStrip, Contact } from "@/components/Sections";
import { Continuum } from "@/components/Continuum";

/** SWING SHIFT: the Spider-Man edition. A separate project from the main (orange) portfolio. */
export default function Home() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      {/* one environment from the portrait down through the work */}
      <Continuum>
        <Hero />
        <Work />
      </Continuum>
      <AboutStrip />
      <Contact />
    </main>
  );
}
