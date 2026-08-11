/**
 * Sentra fonts — Geist Sans + Geist Mono, self-hosted variable fonts (OFL).
 * Single source for font binaries: packages/design-tokens/assets/fonts/.
 * Never load fonts from a CDN at runtime (determinism, privacy).
 *
 * Usage (Next.js app):
 *   import { fontSans, fontMono } from "@sentra/design-tokens/fonts";
 *   <body className={`${fontSans.variable} ${fontMono.variable}`}>
 * Requires "@sentra/design-tokens" in next.config transpilePackages.
 */
import localFont from "next/font/local";

export const fontSans = localFont({
  src: [
    {
      path: "../assets/fonts/geist-sans/Geist-Variable.woff2",
      style: "normal",
    },
    {
      path: "../assets/fonts/geist-sans/Geist-Variable-Italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-sans",
});

export const fontMono = localFont({
  src: [
    {
      path: "../assets/fonts/geist-mono/GeistMono-Variable.woff2",
      style: "normal",
    },
    {
      path: "../assets/fonts/geist-mono/GeistMono-Variable-Italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-mono",
});
