import {
  fontMonoJetBrains,
  fontSansArchivo,
} from "@sentra/token/fonts-archivo";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sentra Control Center",
  description:
    "Pusat kendali repository Monorepo: seluruh fitur, statusnya yang sebenarnya, dan langkah berikutnya yang aman.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Archivo + JetBrains Mono, the typefaces the design system specifies. The
    // width axis carries the display voice, so no second family is needed.
    // The font variables go on <html>, not <body>. --font-family-sans is
    // declared on :root, and a var() inside a custom property is substituted on
    // the element where that property is declared — so if --font-sans only
    // exists on <body>, the whole font-family is invalid at computed-value time
    // and the browser falls back to its serif default.
    <html
      lang="id"
      className={`${fontSansArchivo.variable} ${fontMonoJetBrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
