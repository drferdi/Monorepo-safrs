import type { Metadata } from "next";
import {
  Cinzel,
  Geist,
  Geist_Mono,
  Newsreader,
  Plus_Jakarta_Sans,
} from "next/font/google";
import type React from "react";

import "./globals.css";

/**
 * Tiga peran tipografi, bukan tiga selera (Bible 04 bagian 7):
 *   - Newsreader membawa suara naratif dan pernyataan historis dengan optical
 *     sizing variable yang tenang di layar;
 *   - Geist membawa antarmuka kontemporer — situs ini dibuat tahun 2026 dan
 *     tidak berpura-pura menjadi manuskrip kuno;
 *   - Geist Mono membawa metadata arsip, nomor inventaris, dan label bukti.
 */
const narrative = Newsreader({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-newsreader",
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

/*
 * Peran keempat, sempit dan disengaja (direktif Chief 2026-08-28): kapital
 * inskripsi bergaya abad pertengahan untuk KARTU JUDUL sinematik saja —
 * bukan untuk naskah. Cinzel diturunkan dari kapital monumental, bukan
 * blackletter kitsch, sehingga tetap sejalan dengan suara prasasti situs.
 */
const royal = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cinzel",
  display: "swap",
});

/*
 * Peran kelima (direktif editorial Chief 2026-08-29): body copy sinematik di
 * atas citra — sans modern kecil yang halus dan terbaca (museum/arsip
 * digital). Naskah dokumen arsip di luar Journey tetap serif narrative.
 */
const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plus-jakarta",
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
      suppressHydrationWarning
      className={`${narrative.variable} ${interfaceFont.variable} ${archive.variable} ${royal.variable} ${body.variable}`}
    >
      <body>
        <a className="skip-link" href="#historical-content" tabIndex={0}>
          Lompat ke konten sejarah
        </a>
        {children}
      </body>
    </html>
  );
}
