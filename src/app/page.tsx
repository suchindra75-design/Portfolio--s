import { Hero } from "@/components/Hero";
import { Work } from "@/components/Work";
import { AboutStrip, Contact } from "@/components/Sections";

/** SWING SHIFT: the Spider-Man edition. A separate project from the main (orange) portfolio. */
export default function Home() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <Hero />
      <Work />
      <AboutStrip />
      <Contact />
    </main>
  );
}
