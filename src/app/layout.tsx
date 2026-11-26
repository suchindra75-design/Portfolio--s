import type { Metadata, Viewport } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { site } from "@/content/site";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/Sections";
import "./globals.css";

const inter = Inter_Tight({ variable: "--ff-inter", subsets: ["latin"], weight: ["400", "500", "600", "800", "900"], display: "swap" });
const serif = Instrument_Serif({ variable: "--ff-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--ff-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: `${site.name}: Swing Shift`, template: `%s · ${site.shortName} · Swing Shift` },
  description: `${site.name}, ${site.role}. Swing Shift, the night edition of his portfolio.`,
  robots: { index: false, follow: false }, // fan edition: kept out of search engines
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="label sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-black focus:px-4 focus:py-3 focus:text-text">Skip to content</a>
        <Nav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
