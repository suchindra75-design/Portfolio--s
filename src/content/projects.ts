/**
 * Swing Shift's own project content. NOT imported from the main (orange) portfolio: the two
 * editions are separate projects. Wording follows docs/v7-two-editions/DECISIONS.md and the
 * 2026-11-25 code-audit corrections (DIRECTIONS.md), which are stricter than the older copy:
 *   • RAYA is a fork of MARK XLIX; its voice check is a filter, not a lock.
 *   • The ESP32 Home Automation System is a separate concept, not a RAYA module.
 *   • The INFINOS website is deployed but pre-launch. Brain Matrix is research use.
 *   • SIMPLEIN test counts are a recorded run (Oct 2026); the unsourced RLS-policy count is dropped.
 *   • The INFINOS customer app is left out until the owner confirms credit and permission.
 * Never invent features, numbers or links. Unverified → leave out.
 */

/** How to read this site: every claim carries one of these. */
export type Evidence = "implemented" | "simulation" | "concept" | "verified" | "reported" | "upstream" | "screenshot";

export const EVIDENCE: Record<Evidence, { label: string; meaning: string }> = {
  implemented: { label: "Implemented", meaning: "Built and in the code." },
  simulation: { label: "Simulation", meaning: "Replayed or simulated, not live." },
  concept: { label: "Concept", meaning: "An idea or design. No code yet." },
  verified: { label: "Verified result", meaning: "A result checked independently." },
  reported: { label: "Reported", meaning: "A result recorded during development, not independently re-run." },
  upstream: { label: "Upstream", meaning: "Starts from someone else’s published work (credited). My changes are listed separately." },
  screenshot: { label: "Screenshot", meaning: "A real capture of the running app." },
};

export type Screen = { src: string; alt: string; caption: string; width: number; height: number };
export type Link = { kind: "repo" | "live" | "credit"; url: string; label: string };

export type Project = {
  slug: string;
  index: string;
  title: string;
  /** Short italic line under the title. */
  tagline: string;
  category: string;
  status: string;
  evidence: Evidence[];
  role: string;
  oneLine: string;
  /** For forks: what came from upstream, and what is the owner's. */
  fork?: { of: string; by: string; url: string; licence: string; licenceUrl: string; upstream: string; mine: string };
  /** In 8 seconds. */
  eight: { what: string; did: string; hard: string; changed: string };
  built: string[];
  features: { title: string; body: string }[];
  screen: Screen | null;
  stack: string[];
  links: Link[];
  notes: string[];
  numbers: { value: string; label: string; evidence: Evidence }[];
};

const GH = "https://github.com/suchindra75-design";

export const projects: Project[] = [
  {
    slug: "raya",
    index: "01",
    title: "RAYA",
    tagline: "Asks before the risky moves.",
    category: "AI assistant · computer control",
    status: "Personal build, in active development",
    evidence: ["implemented", "upstream"],
    role: "Design & development (AI-assisted)",
    oneLine:
      "A personal assistant that acts on my Mac: apps, settings, keyboard and mouse, the browser and files. Actions on its risky list stop and wait for my Allow.",
    fork: {
      of: "MARK XLIX",
      by: "FatihMakes",
      url: "https://www.youtube.com/@FatihMakes",
      licence: "CC BY-NC 4.0",
      licenceUrl: "https://creativecommons.org/licenses/by-nc/4.0/",
      upstream: "the original assistant, its tool modules and Gemini Live loop, QR pairing and encryption",
      mine: "the approval gate, the voice filter, the audio engine, HTTPS and phone-remote hardening, and the UI redesign",
    },
    eight: {
      what: "A personal assistant that acts on my Mac: apps, settings, keyboard and mouse, browser, files.",
      did: "The approval gate, the voice filter, the audio engine, the phone-remote hardening and the UI redesign.",
      hard: "Letting an AI click and type for you, safely: risky actions have to stop and ask.",
      changed: "Actions on its risky list don’t run without my Allow. A speaker filter screens out other voices: a filter, not a lock.",
    },
    built: [
      "An approval gate: risky actions (sending messages, writing or deleting files, running code, shutting down) appear as an on-screen Allow / Deny card. If nobody answers, the action doesn’t run.",
      "A voice filter: local speaker verification screens what reaches the model, so that a TV or another person in the room is meant to be filtered out. It is a filter, not a lock: a recording of my voice gets through, and typed or phone input bypasses it.",
      "A new audio engine with echo cancellation, noise suppression, speech-gated gain and voice-activity detection, benchmarked under background noise.",
      "HTTPS on the local network and hardening for the phone remote (QR pairing and encryption came from upstream).",
      "A complete interface redesign: a central voice ribbon driven by real audio levels, a conversation panel with live tool rows, and a settings sheet. Tests and benchmarks came with it.",
    ],
    features: [
      { title: "A real-time voice conversation", body: "One Gemini Live session hears you, reasons, calls tools and answers out loud. Typed instructions go into the same session." },
      { title: "It acts on the computer", body: "About twenty tools: apps, system settings, keyboard and mouse, the browser through Playwright, files and reminders." },
      { title: "Reading is not obeying", body: "Text it reads from web pages and files is treated as data, not instructions: a guardrail against prompt injection." },
    ],
    screen: {
      src: "/work/raya.jpg",
      alt: "The redesigned assistant window with its Settings sheet open on General",
      caption: "Settings · voice & approvals. This screenshot predates the rename and still shows the old name, JARVIS. A fresh RAYA capture replaces it before launch.",
      width: 1600,
      height: 1000,
    },
    stack: ["Python", "PyQt6", "Gemini Live API", "WebRTC audio processing", "sherpa-onnx", "Playwright", "pyautogui", "FastAPI"],
    links: [{ kind: "repo", url: `${GH}/RAYA`, label: "Source on GitHub" }],
    notes: [
      "Approval covers the risky actions listed above. Opening apps and plain keyboard or mouse input run without a prompt.",
      "Built with Claude as a coding partner.",
    ],
    numbers: [
      { value: "60 s", label: "Unanswered approval counts as Deny", evidence: "implemented" },
      { value: "~20", label: "Tools on the computer (from MARK XLIX)", evidence: "upstream" },
    ],
  },
  {
    slug: "infinos",
    index: "02",
    title: "INFINOS",
    tagline: "A bag you can turn in your hand.",
    category: "Product website · 3D storytelling",
    status: "Deployed, pre-launch",
    evidence: ["implemented"],
    role: "Design & development, INFINOS Tech",
    oneLine:
      "A scroll-driven product story for INFINOS Tech’s Pro Dual-Chamber Bag: photoreal renders that hand over to a live, rotatable 3D model.",
    eight: {
      what: "A scroll-driven product story for INFINOS Tech’s Pro Dual-Chamber Bag.",
      did: "Design and development: Blender-rendered sequences, a live 3D model, the 360° viewer, phone compositions.",
      hard: "Rebuilding the bag in 3D from only 13 photographs, and keeping unverified specs off the page.",
      changed: "The bag can be explained, and turned in your hand, before anyone has held one. Deployed; the launch is still ahead.",
    },
    built: [
      "Eight scroll chapters that combine Blender Cycles frame sequences with a live React Three Fiber model of the bag.",
      "A Blender Python generator that produces both the 3D model and the render frames, checked side by side against the product photographs.",
      "A 360° product viewer with preset views and full screen, plus a coolant showcase.",
      "Separate phone compositions for every chapter, plus performance work for phones.",
      "A fact-status system that keeps unverified product claims off the page.",
    ],
    features: [
      { title: "Renders that become a model", body: "Pre-rendered sequences cross-fade into a live model you can drag, open and explode into labelled layers." },
      { title: "Honest by construction", body: "Specs that aren’t confirmed stay unpublished. The site itself says which capabilities still await validation." },
    ],
    screen: { src: "/work/infinos-website.jpg", alt: "The INFINOS website's 3D bag model with the 360° view control", caption: "The deployed site’s 3D model view: a provisional reconstruction from photographs, awaiting INFINOS Tech’s approval. Logo and product © INFINOS Tech.", width: 1600, height: 1000 },
    stack: ["Next.js", "React", "TypeScript", "three.js", "React Three Fiber", "GSAP", "Lenis", "Blender Python + Cycles", "Vercel"],
    links: [
      { kind: "live", url: "https://infinoswebsite.vercel.app", label: "Visit the deployed site" },
      { kind: "repo", url: `${GH}/INFINOS-WEBSITE`, label: "Source on GitHub" },
    ],
    notes: [
      "The 3D model is a provisional reconstruction from photographs, awaiting the manufacturer’s approval. It is not CAD. Product imagery © INFINOS Tech.",
      "Specifications not published on the site (dimensions, hold times, certifications) are deliberately left out here too.",
    ],
    numbers: [
      { value: "13", label: "Photographs the model was checked against", evidence: "implemented" },
      { value: "8", label: "Scroll chapters", evidence: "implemented" },
      { value: "360°", label: "Product viewer", evidence: "implemented" },
    ],
  },
  {
    slug: "infinos-telemetry",
    index: "03",
    title: "INFINOS Telemetry",
    tagline: "A record of the journey.",
    category: "Monitoring platform · IoT",
    status: "Built · hosted demo offline",
    evidence: ["implemented"],
    role: "Full Stack Developer, INFINOS Tech",
    oneLine:
      "The software behind the bag: every compartment’s temperature synced from the device’s cloud channel, stored, checked against thresholds and turned into audit reports, on the web and on a phone.",
    eight: {
      what: "The monitoring platform behind the bag: per-bag history, threshold alerts and audit reports.",
      did: "The Express + Postgres backend and sync worker, the React dashboard and the Flutter app.",
      hard: "Turning a stream of raw, unlabelled sensor fields into trustworthy history and alerts.",
      changed: "Each bag’s readings can be exported as CSV or a generated PDF audit report.",
    },
    built: [
      "An Express + Prisma / PostgreSQL backend whose worker syncs each registered bag’s ThingSpeak channel into the database.",
      "Field-agnostic telemetry: the app discovers each channel’s field labels and shows them as they are.",
      "Threshold alerts with warning and critical severity, auto-resolve, per-device thresholds and an offline timeout.",
      "CSV and PDF audit exports, roles (admin, operator, viewer) with JWT and rate-limited sign-in, and read keys stored encrypted.",
      "A React dashboard with hand-built SVG charts, and a Flutter app with local alert notifications.",
    ],
    features: [
      { title: "Device → cloud → platform", body: "Sensors publish to a cloud channel. The backend pulls it on a schedule and keeps the history in Postgres." },
      { title: "Web and phone", body: "The same backend serves the web dashboard and the Flutter app. The phone never talks to the cloud channel directly." },
    ],
    screen: { src: "/work/smart-bag.jpg", alt: "The INFINOS telemetry web dashboard showing a bag's readings and alerts", caption: "The web dashboard.", width: 1600, height: 1000 },
    stack: ["TypeScript", "Node.js / Express", "Prisma", "PostgreSQL", "JWT", "Zod", "React", "Vite", "Flutter", "ThingSpeak API"],
    links: [{ kind: "repo", url: `${GH}/INFINOS-APP`, label: "Source on GitHub" }],
    notes: ["The bag’s data channel is private and the hosted demo’s database is offline, so nothing on this page is live.", "INFINOS name and logo © INFINOS Tech."],
    numbers: [
      { value: "3", label: "Roles: admin, operator, viewer", evidence: "implemented" },
      { value: "2", label: "Exports: CSV and PDF", evidence: "implemented" },
    ],
  },
  {
    slug: "brain-matrix",
    index: "04",
    title: "Brain Matrix",
    tagline: "Two speeds, one signal.",
    category: "EEG workstation · Bluetooth LE",
    status: "Live · research use only",
    evidence: ["implemented"],
    role: "Full Stack Developer, INFINOS Tech",
    oneLine:
      "A workstation for a Bluetooth EEG sleep mask: live brain and eye-movement signals, the full cloud history and correctly timed reports, on the web and on Android.",
    eight: {
      what: "A research workstation for a Bluetooth EEG sleep mask, on the web and Android.",
      did: "BLE streaming and parsing, the ring buffer, the Live EEG view, the history backend and timed exports.",
      hard: "Two data paths at very different speeds: a cloud packet about every 20 s, Bluetooth at a nominal 256 Hz.",
      changed: "The signal can be watched live, and recordings exported with timing and gaps preserved.",
    },
    built: [
      "Bluetooth LE streaming from the mask over the Nordic UART service, with a fragment-safe parser that survives split packets.",
      "A 30-second ring buffer at a nominal 256 Hz, with gap detection and a measured receive rate.",
      "A Live EEG view that switches between the cloud channel and Bluetooth, with 5, 10 and 30-second windows.",
      "An Express backend that pages through the full cloud history with caching and rate limiting.",
      "PDF reports, CSV and a custom archive, with timestamps kept in UTC and real gaps left visible.",
      "An Android app through Capacitor.",
    ],
    features: [
      { title: "Two channels live, six in the cloud", body: "Bluetooth carries EEG and EOG. The cloud channel holds six fields: EEG, EOG, eye movements, artefacts, sample count and recording time." },
      { title: "Readable at any length", body: "Min-max decimation and percentile scaling keep long recordings fast to draw without hiding spikes." },
    ],
    screen: { src: "/work/brain-matrix.jpg", alt: "Brain Matrix's Live EEG view with stacked EEG, EOG and eye-movement traces", caption: "The Live EEG view (the cloud channel number is blurred).", width: 1600, height: 1000 },
    stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "Express", "ThingSpeak API", "Capacitor", "Bluetooth LE", "jsPDF", "Canvas"],
    links: [
      { kind: "live", url: "https://dfghj-1.onrender.com", label: "Open the workstation" },
      { kind: "repo", url: `${GH}/Brain-matrix-App`, label: "Source on GitHub" },
    ],
    notes: [
      "Research use only: not a medical or diagnostic tool. The app does no sleep staging or spectral analysis.",
      "The mask hardware isn’t my work; the app pairs with it.",
    ],
    numbers: [
      { value: "256 Hz", label: "Bluetooth stream (nominal)", evidence: "implemented" },
      { value: "2 / 6", label: "Channels: live / cloud", evidence: "implemented" },
      { value: "30 s", label: "Ring buffer", evidence: "implemented" },
    ],
  },
  {
    slug: "simplein-school",
    index: "05",
    title: "SIMPLEIN School",
    tagline: "Many schools, sealed apart.",
    category: "Multi-tenant school ERP",
    status: "Pre-launch · staging demo live",
    evidence: ["implemented"],
    role: "Full-stack development, for SIMPLEIN SOLUTIONS",
    oneLine: "One platform for many schools: four role portals, a versioned API, and a database that keeps every school’s data apart.",
    eight: {
      what: "A multi-tenant school ERP: one platform for many schools, four role portals.",
      did: "Independently developed the portal (per my résumé): the tenancy model, the API, the modules, the row-level security and the tests.",
      hard: "Keeping every school’s data sealed apart, enforced in the database, not just the app.",
      changed: "Pre-launch: the staging demo runs end to end across all four roles.",
    },
    built: [
      "Multi-tenancy: every tenant table carries its school, row-level security enforces it, and the API takes the school only from the session.",
      "Four portals: school admin, teacher, parent and student.",
      "Modules: people with Excel import, attendance, exams, marks and grades, report cards with PDF, timetable, homework, notices, fee tracking with maker-checker verification, and a student portal.",
      "A versioned REST API under /api/v1 with a generated OpenAPI spec.",
      "Tests, as reported from a recorded run (Oct 2026): unit 389/389, integration 49/49, pgTAP 288/288 and a smoke crawl of 80/80.",
    ],
    features: [
      { title: "Sealed schools", body: "A teacher sees their sections, a parent sees their children, a student sees themselves, and no school ever sees another." },
      { title: "Fees with a second pair of eyes", body: "Payments are recorded unverified and confirmed by a different admin. Nothing is deleted, and everything is audited." },
    ],
    screen: { src: "/work/simplein-school.jpg", alt: "The demo school's public landing page with portals for each role", caption: "The staging demo’s public site (a fictional school).", width: 1600, height: 1000 },
    stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Supabase (Postgres, RLS, Auth, Storage)", "Zod", "Vitest", "pgTAP", "pdf-lib", "Vercel"],
    links: [
      { kind: "live", url: "https://simplein-school-demo.vercel.app", label: "Open the staging demo" },
    ],
    notes: ["Pre-launch: the demo is a staging deployment with a fictional school. Production isn’t live, and no real school uses it yet."],
    numbers: [
      { value: "4", label: "Role portals", evidence: "implemented" },
      { value: "288/288", label: "pgTAP assertions · recorded run, Oct 2026", evidence: "reported" },
    ],
  },
  {
    slug: "esp32-home-automation",
    index: "06",
    title: "ESP32 Home Automation System",
    tagline: "One ESP32, two relay channels.",
    category: "Home automation · embedded",
    status: "Concept on this site · firmware not available",
    evidence: ["concept"],
    role: "Design & development (per my résumé)",
    oneLine: "A home-automation prototype from my résumé: an ESP32 in Embedded C driving a two-channel relay module to switch household appliances.",
    eight: {
      what: "An ESP32 home-automation prototype with a two-channel relay module (from my résumé).",
      did: "Built the prototype in Embedded C, per my résumé.",
      hard: "Not documented: without the firmware there is no record here of what was hard.",
      changed: "Nothing to show yet: the firmware isn’t available, so nothing on this page is presented as built.",
    },
    built: [],
    features: [
      { title: "An ESP32 controller", body: "The microcontroller runs the control program, written in Embedded C." },
      { title: "A two-channel relay", body: "Two relay channels switch two connected appliances on and off." },
    ],
    screen: null,
    stack: ["ESP32", "Embedded C", "Two-channel relay module"],
    links: [],
    notes: ["A separate project from RAYA. Nothing in RAYA’s code connects to it, and nothing on this page talks to real hardware."],
    numbers: [],
  },
];

export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
export const nextProject = (slug: string) => {
  const i = projects.findIndex((p) => p.slug === slug);
  return projects[(i + 1) % projects.length];
};
