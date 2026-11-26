"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/content/site";

const ITEMS = [
  { href: "/#work", label: "Work", match: (p: string) => p.startsWith("/work") },
  { href: "/about", label: "About", match: (p: string) => p === "/about" },
  { href: "/#contact", label: "Contact", match: () => false },
];

/** One quiet bar for every page: the name in red on the left, three destinations on the right. */
export function Nav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      data-site-nav
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 transition-colors duration-300 md:px-10 md:py-6 ${scrolled ? "bg-black/80 backdrop-blur-md" : ""}`}
    >
      <Link href="/" className="label -my-3 flex items-center gap-3 py-3 text-red-text">
        <span aria-hidden="true" className="hidden h-px w-8 bg-red sm:block" />
        {site.shortName}
      </Link>
      <nav aria-label="Main" className="flex gap-4 md:gap-9">
        {ITEMS.map((it) => {
          const current = it.match(path);
          return (
            <Link
              key={it.label}
              href={it.href}
              aria-current={current ? (it.href === path ? "page" : "true") : undefined}
              className={`label relative -mx-1.5 -my-3 px-1.5 py-3 transition-colors hover:text-red-text ${current ? "text-text" : "text-silver"}`}
            >
              {it.label}
              {current && <span aria-hidden="true" className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-red" />}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
