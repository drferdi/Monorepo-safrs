/**
 * Sentraverse typeface option — Archivo + JetBrains Mono.
 *
 * The design system reference (`docs/design-system/reference/01-design-system.html`)
 * specifies Archivo, chosen for its width axis: the display voice comes from
 * widening to 112, not from adding a second typeface. One family, two voices.
 *
 * Geist (`./fonts`) remains the default for surfaces already built on it. This
 * module is the opt-in alternative, not a replacement — importing it is a
 * deliberate choice per application.
 *
 * `next/font/google` downloads the files at build time and self-hosts them, so
 * no request reaches a CDN at runtime. That preserves the determinism and
 * privacy rule stated in `./fonts`.
 *
 * Usage (Next.js app):
 *   import { fontSansArchivo, fontMonoJetBrains } from "@sentra/token/fonts-archivo";
 *   import "@sentra/token/archivo.css";
 *   <body className={`${fontSansArchivo.variable} ${fontMonoJetBrains.variable}`}>
 */
import { Archivo, JetBrains_Mono } from "next/font/google";

export const fontSansArchivo = Archivo({
  subsets: ["latin"],
  // The width axis is the whole reason this family was chosen; without it the
  // display role cannot reach wdth 112. Weight is left unpinned because axes
  // may only be requested from a variable font — the loaded file covers the
  // three weights the system allows (400, 500, 600).
  axes: ["wdth"],
  variable: "--font-sans",
  display: "swap",
});

export const fontMonoJetBrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});
