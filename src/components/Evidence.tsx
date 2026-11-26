import { EVIDENCE, type Evidence } from "@/content/projects";

/** The swatch for each kind of evidence (shapes, not just colour, so it reads in greyscale too). */
function Swatch({ kind }: { kind: Evidence }) {
  switch (kind) {
    case "implemented":
      return <span aria-hidden="true" className="swatch bg-text" />;
    case "simulation":
      return <span aria-hidden="true" className="swatch" style={{ background: "repeating-linear-gradient(-45deg, var(--color-text) 0 1.5px, transparent 1.5px 4px)" }} />;
    case "concept":
      return <span aria-hidden="true" className="swatch border border-dashed border-text" />;
    case "verified":
      return (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 flex-none fill-none stroke-text" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M5 8.2l2 2 4-4.4" />
        </svg>
      );
    case "reported":
      return (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 flex-none fill-none stroke-text" strokeWidth="1.4" strokeDasharray="2.2 1.6">
          <circle cx="8" cy="8" r="6.5" />
        </svg>
      );
    case "upstream":
      return <span aria-hidden="true" className="swatch" style={{ background: "linear-gradient(90deg, var(--color-dim) 0 50%, var(--color-text) 50%)" }} />;
    case "screenshot":
      return (
        <svg aria-hidden="true" viewBox="0 0 16 12" className="h-3 w-4 flex-none fill-none stroke-text" strokeWidth="1.3">
          <rect x="0.65" y="0.65" width="14.7" height="10.7" />
          <path d="M0.65 3.4h14.7" />
        </svg>
      );
  }
}

export function Chip({ kind, children }: { kind: Evidence; children?: React.ReactNode }) {
  return (
    <span className="chip" data-kind={kind}>
      <Swatch kind={kind} />
      {children ?? EVIDENCE[kind].label}
    </span>
  );
}

/** "How to read this site": every label, with what it means. */
export function Legend({ compact = false }: { compact?: boolean }) {
  const kinds = Object.keys(EVIDENCE) as Evidence[];
  return (
    <div>
      <p className="label mb-4 text-dim">How to read this site</p>
      <ul className={compact ? "flex flex-wrap gap-2" : "grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"}>
        {kinds.map((k) => (
          <li key={k} className={compact ? "" : "flex flex-col items-start gap-2"}>
            <Chip kind={k} />
            {!compact && <span className="text-[14px] leading-snug text-dim">{EVIDENCE[k].meaning}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
