import type { Metadata } from "next";
import {
  Cinzel,
  Cormorant_Garamond,
  Geist,
  Geist_Mono,
  IBM_Plex_Sans,
  Newsreader,
  Noto_Sans_Javanese,
} from "next/font/google";
import type React from "react";

import {
  OPEN_GRAPH_BASE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  TWITTER_BASE,
} from "../../site";
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
 * Peran kelima (direktif editorial Chief 2026-08-29, font diganti ke IBM
 * Plex Sans 2026-08-30 Chief): body copy sinematik di atas citra — sans
 * modern kecil yang halus dan terbaca (museum/arsip digital), SATU font
 * seragam untuk semua body text lewat token `--type-body`. Naskah dokumen
 * arsip di luar Journey tetap serif narrative.
 */
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const openingDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-cormorant",
  display: "swap",
});

const javanese = Noto_Sans_Javanese({
  subsets: ["javanese"],
  weight: "400",
  variable: "--font-noto-javanese",
  display: "swap",
});

/**
 * Metadata dasar seluruh rute publik.
 *
 * `metadataBase` membuat setiap jalur relatif di bawah ini — kanonis, citra
 * Open Graph, citra Twitter — diselesaikan menjadi URL absolut oleh Next,
 * sehingga tidak ada URL produksi yang ditulis ulang per halaman.
 *
 * Judul dokumen memakai `SITE_TITLE`; `siteName` tetap nama penerbit. Template
 * sengaja pendek ("%s · Kediri") supaya judul catatan arsip yang panjang tidak
 * terpotong mesin pencari; halaman yang butuh judul penuh menyatakannya sendiri
 * lewat `title.absolute`.
 *
 * TIDAK ada `alternates.canonical` di sini, dan itu disengaja: kanonis
 * diwariskan ke setiap rute keturunan, sehingga halaman baru yang lupa
 * menyatakan kanonisnya akan diam-diam mengaku sebagai beranda. Setiap
 * halaman publik menyatakan kanonisnya sendiri, dan `seo-routes.test.ts`
 * menjaga janji itu.
 *
 * Charset dan viewport TIDAK ditulis di sini: Next 16 memancarkannya secara
 * bawaan, dan menduplikasinya justru menghasilkan dua tag yang sama.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Kediri",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    ...OPEN_GRAPH_BASE,
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    ...TWITTER_BASE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
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
      className={`${narrative.variable} ${interfaceFont.variable} ${archive.variable} ${royal.variable} ${body.variable} ${openingDisplay.variable} ${javanese.variable}`}
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
