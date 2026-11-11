import { fontMono, fontSans } from "@sentra/token/fonts";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "../components/SiteFooter.tsx";
import { SiteHeader } from "../components/SiteHeader.tsx";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "El-Kayyisa — Sentra Smartboard System",
    template: "%s | El-Kayyisa",
  },
  description: "Bimbingan belajar personal dan terarah",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body
        className="font-sans"
        style={{
          background: "var(--color-background-canvas)",
          color: "var(--color-text-primary)",
        }}
      >
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
