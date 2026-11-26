"use client";

import { useEffect, useState } from "react";

/** Hyderabad's local time, so a visitor knows whether it's the night shift there. */
export function Clock({ short = false }: { short?: boolean }) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata", hour12: false });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span>
      {short ? "Hyderabad" : "Hyderabad, India"}{now && <> · <span className="text-silver">{now} IST</span></>}
    </span>
  );
}
