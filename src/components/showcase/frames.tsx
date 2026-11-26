import Image from "next/image";
import { ViewTransition } from "react";
import type { Project } from "@/content/projects";

/**
 * Six frames, one system (16:10, hairline, registration ticks, an honest note in the frame), six
 * compositions. Every screen is the project's real capture; every diagram states only what its
 * case study states, and repeats it in text nearby for screen readers. Nothing is redrawn as if
 * it were the product.
 */

/** The screenshot that morphs into the case study's lit window (one per page: only the active project renders). */
function Shot({ p, className = "", position, sizes = "(min-width:1024px) 60vw, 100vw" }: { p: Project; className?: string; position?: string; sizes?: string }) {
  if (!p.screen) return null;
  return (
    <ViewTransition name={`shot-${p.slug}`} share="morph" default="none">
      <div className={`absolute inset-0 ${className}`}>
        <Image src={p.screen.src} alt={p.screen.alt} fill sizes={sizes} className="object-cover" style={{ objectPosition: position ?? "center" }} />
      </div>
    </ViewTransition>
  );
}

/** A signal path: the steps a project's data or commands move through. */
function Path({ steps, label, tone = "dark" }: { steps: string[]; label: string; tone?: "dark" | "light" }) {
  return (
    <div className={`sc-path sc-path--${tone}`}>
      <span className="sc-path__label">{label}</span>
      <ol className="sc-path__steps">
        {steps.map((s, k) => (
          <li key={s}>
            {k > 0 && <span aria-hidden="true" className="sc-path__wire" />}
            <span className="sc-path__step">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Note({ children, corner = "bl", tone = "dark" }: { children: React.ReactNode; corner?: "bl" | "br" | "tl" | "tr"; tone?: "dark" | "light" }) {
  return <p className={`sc-note sc-note--${corner} sc-note--${tone}`}>{children}</p>;
}

function Raya({ p }: { p: Project }) {
  return (
    <>
      <Shot p={p} className="sc-raya__shot" />
      <div aria-hidden="true" className="sc-raya__shade" />
      <Note corner="tr">Screenshot predates the rename · shows “JARVIS”</Note>
      <div className="sc-raya__path">
        <Path label="How it listens and acts" steps={["Your voice", "Speaker filter", "Gemini Live", "Allow / Deny gate", "Your Mac"]} />
      </div>
      <Note corner="tl">Built on MARK XLIX · FatihMakes</Note>
    </>
  );
}

function Infinos({ p }: { p: Project }) {
  return (
    <>
      <Shot p={p} position="52% 45%" />
      {/* the 360° viewer, as an orbit round the real render */}
      <svg aria-hidden="true" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="sc-orbit absolute inset-0 h-full w-full">
        <ellipse cx="830" cy="560" rx="470" ry="120" className="sc-orbit__ring" />
        {Array.from({ length: 36 }, (_, k) => {
          const t = (k / 36) * Math.PI * 2;
          const x = 830 + Math.cos(t) * 470, y = 560 + Math.sin(t) * 120;
          const x2 = 830 + Math.cos(t) * (k % 9 === 0 ? 500 : 484), y2 = 560 + Math.sin(t) * (k % 9 === 0 ? 132 : 126);
          return <line key={k} x1={x} y1={y} x2={x2} y2={y2} className={k % 9 === 0 ? "sc-orbit__tick sc-orbit__tick--major" : "sc-orbit__tick"} />;
        })}
        <text x="1316" y="566" className="sc-orbit__deg">360°</text>
      </svg>
      <Note corner="tl">Provisional 3D model · awaiting INFINOS Tech’s approval</Note>
      <Note corner="br">© INFINOS Tech</Note>
    </>
  );
}

function Telemetry({ p }: { p: Project }) {
  return (
    <>
      <div aria-hidden="true" className="sc-tele__ground" />
      <div className="sc-tele__browser">
        <div aria-hidden="true" className="sc-tele__bar">
          <i />
          <i />
          <i />
          <span>Web dashboard</span>
        </div>
        <div className="sc-tele__screen">
          <Shot p={p} position="left top" sizes="(min-width:1024px) 48vw, 90vw" />
        </div>
      </div>
      <div className="sc-tele__path">
        <Path label="Data path" steps={["Bag sensors", "ThingSpeak", "Sync worker", "Express + Postgres", "Web · Flutter"]} />
      </div>
      <Note corner="tr">Hosted demo offline · © INFINOS Tech</Note>
    </>
  );
}

function BrainMatrix({ p }: { p: Project }) {
  return (
    <>
      <Shot p={p} className="sc-brain__shot" position="left top" />
      {/* a magnified inset of its own waveform rows: the same capture, cropped, nothing redrawn */}
      <div aria-hidden="true" className="sc-brain__lens">
        {p.screen && <Image src={p.screen.src} alt="" width={1600} height={1000} sizes="40vw" className="sc-brain__lens-img" />}
        <span className="sc-brain__lens-label">EEG · EOG · eye movements, magnified from the same screen</span>
      </div>
      <Note corner="tl">Research use only · not for diagnosis</Note>
    </>
  );
}

function Simplein({ p }: { p: Project }) {
  return (
    <>
      <div className="sc-school__shot">
        <Shot p={p} position="left top" sizes="(min-width:1024px) 40vw, 62vw" />
      </div>
      <div className="sc-school__arch">
        <svg viewBox="0 0 300 330" aria-hidden="true" className="h-full w-full">
          {["School admin", "Teacher", "Parent", "Student"].map((r, k) => (
            <g key={r}>
              <rect x={6 + k * 73} y="18" width="66" height="40" className="sc-arch__box" />
              <text x={39 + k * 73} y="42" textAnchor="middle" className="sc-arch__t">{r}</text>
              <path d={`M${39 + k * 73} 58 C ${39 + k * 73} 92, 150 86, 150 118`} className="sc-arch__wire" />
            </g>
          ))}
          <rect x="70" y="118" width="160" height="44" className="sc-arch__box sc-arch__box--api" />
          <text x="150" y="137" textAnchor="middle" className="sc-arch__t sc-arch__t--b">/api/v1</text>
          <text x="150" y="152" textAnchor="middle" className="sc-arch__t">school from the session</text>
          <path d="M150 162 L150 196" className="sc-arch__wire" />
          <rect x="30" y="196" width="240" height="112" className="sc-arch__box" />
          <text x="150" y="216" textAnchor="middle" className="sc-arch__t sc-arch__t--b">Postgres · row-level security</text>
          {[0, 1, 2].map((k) => (
            <g key={k}>
              <rect x={44 + k * 74} y="232" width="64" height="58" className="sc-arch__cell" />
              <text x={76 + k * 74} y="266" textAnchor="middle" className="sc-arch__t">School {String.fromCharCode(65 + k)}</text>
            </g>
          ))}
        </svg>
        <p className="sr-only">Four role portals (school admin, teacher, parent, student) call a versioned API under /api/v1, which takes the school only from the session; Postgres row-level security keeps every school’s rows apart.</p>
      </div>
      <Note corner="bl" tone="light">Staging demo · a fictional school</Note>
    </>
  );
}

function Esp32() {
  return (
    <>
      <svg viewBox="0 0 1600 1000" aria-hidden="true" className="sc-esp absolute inset-0 h-full w-full">
        <defs>
          <pattern id="esp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" className="sc-esp__grid" />
          </pattern>
        </defs>
        <rect width="1600" height="1000" fill="url(#esp-grid)" />
        {/* the ESP32 module */}
        <rect x="250" y="330" width="380" height="300" className="sc-esp__part" />
        {Array.from({ length: 9 }, (_, k) => (
          <g key={k}>
            <line x1="250" y1={360 + k * 30} x2="220" y2={360 + k * 30} className="sc-esp__pin" />
            <line x1="630" y1={360 + k * 30} x2="660" y2={360 + k * 30} className="sc-esp__pin" />
          </g>
        ))}
        <text x="440" y="470" textAnchor="middle" className="sc-esp__name">ESP32</text>
        <text x="440" y="510" textAnchor="middle" className="sc-esp__sub">Embedded C</text>
        {/* two relay channels */}
        {[0, 1].map((k) => (
          <g key={k}>
            <path d={`M660 ${450 + k * 60} H760 V${300 + k * 340} H880`} className="sc-esp__wire" />
            <rect x="880" y={240 + k * 340} width="260" height="120" className="sc-esp__part" />
            <text x="1010" y={292 + k * 340} textAnchor="middle" className="sc-esp__name sc-esp__name--s">Relay {k + 1}</text>
            <text x="1010" y={326 + k * 340} textAnchor="middle" className="sc-esp__sub">channel {k + 1}</text>
            <path d={`M1140 ${300 + k * 340} H1260`} className="sc-esp__wire" />
            <circle cx="1340" cy={300 + k * 340} r="80" className="sc-esp__part" />
            <text x="1340" y={300 + k * 340} textAnchor="middle" className="sc-esp__sub" fontSize="17">
              <tspan x="1340" dy="-4">appliance</tspan>
              <tspan x="1340" dy="24">{k + 1}</tspan>
            </text>
          </g>
        ))}
        <text x="800" y="140" textAnchor="middle" className="sc-esp__stamp">CONCEPT</text>
      </svg>
      <Note corner="bl">A drawing, not a build · the firmware isn’t available</Note>
      <p className="sr-only">Concept drawing: an ESP32 running Embedded C drives a two-channel relay module; each channel switches one household appliance.</p>
    </>
  );
}

const COMPOSE: Record<string, (props: { p: Project }) => React.ReactNode> = {
  raya: Raya,
  infinos: Infinos,
  "infinos-telemetry": Telemetry,
  "brain-matrix": BrainMatrix,
  "simplein-school": Simplein,
  "esp32-home-automation": Esp32,
};

export function ProjectFrame({ p }: { p: Project }) {
  const Compose = COMPOSE[p.slug];
  const concept = p.evidence.includes("concept");
  return (
    <div className={`sc-frame sc-frame--${p.slug} ${concept ? "is-concept" : ""}`}>
      {Compose ? <Compose p={p} /> : <Shot p={p} />}
      <span aria-hidden="true" className="sc-tick sc-tick--tl" />
      <span aria-hidden="true" className="sc-tick sc-tick--tr" />
      <span aria-hidden="true" className="sc-tick sc-tick--bl" />
      <span aria-hidden="true" className="sc-tick sc-tick--br" />
    </div>
  );
}
