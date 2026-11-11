import { fontMono, fontSans } from "@sentra/token/fonts";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  description: "Pemeriksaan kesiapan alur SAFRS.",
  title: "Kesiapan SAFRS",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables go on <html>, not <body>: --font-family-sans is declared on
    // :root and references --font-sans, and a var() inside a custom property is
    // resolved on the element that declares it. On <body> only, font-sans and
    // var(--font-family-*) would fall back to Helvetica/Arial.
    <html lang="id" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
