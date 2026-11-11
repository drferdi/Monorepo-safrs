/**
 * Sentra fonts — Archivo + JetBrains Mono, self-hosted variable fonts (OFL).
 * Single source for font binaries: packages/token/assets/fonts/.
 * Never load fonts from a CDN at runtime (determinism, privacy).
 *
 * Archivo is the system's one family (locked decision 3, Sentraverse UI v1.0):
 * its width axis (wdth 62–125) carries the display voice — display at 112,
 * wordmark and module names at 108, body at 100 — so no second typeface is
 * needed. JetBrains Mono is for anything machine-produced.
 *
 * Usage (Next.js app):
 *   import { fontSans, fontMono } from "@sentra/token/fonts";
 *   <body className={`${fontSans.variable} ${fontMono.variable}`}>
 * Requires "@sentra/token" in next.config transpilePackages.
 */
import localFont from "next/font/local";

export const fontSans = localFont({
  src: [
    {
      path: "../assets/fonts/archivo/Archivo-Variable.woff2",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "../assets/fonts/archivo/Archivo-Variable-Italic.woff2",
      style: "italic",
      weight: "100 900",
    },
  ],
  // Expose the width axis to the browser so font-stretch / "wdth" resolve.
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
  variable: "--font-sans",
});

export const fontMono = localFont({
  src: [
    {
      path: "../assets/fonts/jetbrains-mono/JetBrainsMono-Variable.woff2",
      style: "normal",
      weight: "100 800",
    },
    {
      path: "../assets/fonts/jetbrains-mono/JetBrainsMono-Variable-Italic.woff2",
      style: "italic",
      weight: "100 800",
    },
  ],
  variable: "--font-mono",
});
