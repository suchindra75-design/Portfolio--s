/** Swing Shift's own copy of the owner's résumé facts (not imported from the main portfolio). */

export const experience = [
  {
    company: "INFINOS Tech",
    role: "Full Stack Developer",
    period: "Present",
    notes: [
      "Brain Matrix: the app for a Bluetooth sleep mask, live and historical signals on the web and Android.",
      "INFINOS Telemetry: the monitoring platform and app for a temperature-controlled transport bag (ESP32 → ThingSpeak).",
      "The company’s product website.",
      "Contributed to the bag’s electronics and circuit design: ESP32, digital temperature sensors and an onboard display.",
    ],
  },
  {
    company: "BSNL",
    role: "Engineering intern, Regional Telecom Training Centre, Hyderabad",
    period: "June 2025",
    notes: ["FTTH, DWDM, SDH/PDH transmission; fibre-splice testing and OTDR fault localisation."],
  },
];

export const education = {
  degree: "B.E. Electrical & Electronics Engineering",
  school: "Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad",
  years: "2023–2027",
};

/** Exactly the résumé's skills; the last group is what the linked repositories show on top. */
export const skills: { group: string; items: string[] }[] = [
  { group: "Programming", items: ["Python", "JavaScript", "C"] },
  { group: "AI", items: ["LLM API integration", "Prompt engineering", "Desktop automation", "AI tool integration"] },
  { group: "Software & 3D", items: ["FastAPI", "REST APIs", "Blender", "Three.js"] },
  { group: "Embedded & IoT", items: ["ESP32", "Arduino", "Digital sensors", "Relay modules", "Bluetooth communication", "ThingSpeak"] },
  { group: "Also in my repositories", items: ["TypeScript", "React", "Next.js", "Flutter", "PostgreSQL"] },
];

export const recognition = [
  { title: "Vice President, Technical & Logistics", org: "Chaitanya Samskruthi, CBIT", period: "2026–present" },
  { title: "Team Head, Events & Planning", org: "Chaitanya Samskruthi, CBIT", period: "2025–2026" },
  { title: "3rd Prize, Hacktoberfest", org: "CBIT Open Source Community", period: "2024" },
];
