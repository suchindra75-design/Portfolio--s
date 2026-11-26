import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // lets a second dev server run beside another one in this folder (SS_DIST_DIR=.next-verse)
  distDir: process.env.SS_DIST_DIR || ".next",
  turbopack: { rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } } },
};

export default nextConfig;
