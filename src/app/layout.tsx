import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Bangers, Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { site } from "@/content/site";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/Sections";
import { DimensionRoot, dimensionBootScript } from "@/components/Dimension";
import { arrivalBootScript } from "@/components/Arrival";
import { DropLine } from "@/components/DropLine";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ScrollMotion } from "@/components/ScrollMotion";
import { PageWarm } from "@/components/PageWarm";
import "./globals.css";

const inter = Inter_Tight({ variable: "--ff-inter", subsets: ["latin"], weight: ["400", "500", "600", "800", "900"], display: "swap" });
const serif = Instrument_Serif({ variable: "--ff-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap" });
// The Verse only: hand-lettered SFX and caption boxes
const comic = Bangers({ variable: "--ff-comic", subsets: ["latin"], weight: "400", display: "swap" });
const mono = JetBrains_Mono({ variable: "--ff-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: `${site.name}: Swing Shift`, template: `%s · ${site.shortName} · Swing Shift` },
  description: `${site.name}, ${site.role}. Swing Shift, the night edition of his portfolio.`,
  robots: { index: false, follow: false }, // fan edition: kept out of search engines
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${serif.variable} ${mono.variable} ${comic.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: dimensionBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: arrivalBootScript }} />
      </head>
      <body>
        <a href="#main" className="label sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-black focus:px-4 focus:py-3 focus:text-text">Skip to content</a>
        <Nav />
        {/* Every page change is a transition: the page sinks (Prime) or the next panel slides over (Verse) */}
        <ViewTransition update="page" default="none">
          {children}
        </ViewTransition>
        <SiteFooter />
        <DropLine />
        <DimensionRoot />
        <SmoothScroll />
        <ScrollMotion />
        <PageWarm />
      </body>
    </html>
  );
}
