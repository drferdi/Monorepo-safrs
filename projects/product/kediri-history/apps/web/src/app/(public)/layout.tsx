import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import type React from "react";

import "./globals.css";

/**
 * Tiga peran tipografi, bukan tiga selera (Bible 04 bagian 7):
 *   - Source Serif 4 membawa suara naratif dan pernyataan historis;
 *   - Geist membawa antarmuka kontemporer — situs ini dibuat tahun 2026 dan
 *     tidak berpura-pura menjadi manuskrip kuno;
 *   - Geist Mono membawa metadata arsip, nomor inventaris, dan label bukti.
 */
const narrative = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

const interfaceFont = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const archive = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kediri — A Living Civilization",
    template: "%s · Kediri",
  },
  description:
    "Pengalaman sejarah resmi Kota Kediri, 879 hingga 2026: perjalanan sinematik dan arsip sejarah yang dapat ditelusuri.",
};

/**
 * Layout root untuk group rute publik. Grup (payload) punya layout rootnya
 * sendiri.
 *
 * Bahasa utama adalah bahasa Indonesia, dengan English sebagai locale sekunder
 * yang lengkap (UX Bible bagian 36).
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${narrative.variable} ${interfaceFont.variable} ${archive.variable}`}
    >
      <body>
        <a className="skip-link" href="#historical-content">
          Lompat ke konten sejarah
        </a>
        {children}
      </body>
    </html>
  );
}
