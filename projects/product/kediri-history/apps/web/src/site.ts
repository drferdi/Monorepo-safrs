/**
 * Identitas situs publik — SATU sumber untuk URL kanonis, nama, dan deskripsi.
 *
 * Sebelum berkas ini ada, domain produksi ditulis ulang di tiga tempat
 * (`layout.tsx`, `robots.ts`, `sitemap.ts`) dan sudah mulai menyimpang. URL
 * kanonis yang salah bukan cacat kosmetik: ia memberi tahu mesin pencari
 * halaman mana yang asli, jadi ia harus punya satu pemilik.
 *
 * URL boleh ditimpa lewat `NEXT_PUBLIC_SITE_URL`, dengan domain produksi
 * sebagai nilai jatuh. `process.env` dibaca langsung, bukan lewat `env.ts`,
 * karena metadata harus tetap dihasilkan pada setiap konteks build —
 * termasuk build pratinjau yang tidak memegang seluruh rahasia server.
 * Nilai jatuhnya sengaja domain PRODUKSI, bukan `VERCEL_URL`: kalau
 * pratinjau menyatakan dirinya kanonis, mesin pencari akan mengindeks
 * pratinjau itu alih-alih situs sungguhan.
 *
 * `kediri.sentrahai.com` adalah domain kustom yang ditautkan README dan
 * dipakai rilis publik pertama; deployment Vercel bawaan menyajikan aplikasi
 * yang sama, dan justru karena itu kanonis harus menunjuk ke satu di antaranya.
 */
const PRODUCTION_URL = "https://kediri.sentrahai.com";

const LOOPBACK = /^(?:localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?)$/u;

/**
 * Menentukan asal kanonis, dan MENOLAK asal pengembangan pada build produksi.
 *
 * Penolakan itu bukan kehati-hatian berlebihan: `.env.local` capsule ini
 * memang menyetel `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:4320` untuk
 * pengembangan, dan nilai itu terpanggang saat build. Tanpa penjagaan di
 * sini, satu build produksi yang tidak sengaja membaca berkas itu akan
 * menerbitkan `<link rel="canonical" href="http://127.0.0.1:4320">` beserta
 * citra Open Graph yang menunjuk mesin lokal — pratinjau sosial kosong dan
 * halaman yang tidak terindeks, tanpa satu pun pesan galat. Terbukti terjadi
 * pada verifikasi 2026-09-04 sebelum penjagaan ini ada.
 *
 * Host publik yang disetel operator TETAP dihormati apa adanya, termasuk
 * domain `*.vercel.app`: mengabaikan konfigurasi eksplisit diam-diam lebih
 * buruk daripada masalah yang hendak dicegah.
 */
export function resolveSiteUrl(
  raw: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  if (!raw?.trim()) return PRODUCTION_URL;
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return PRODUCTION_URL;
  }
  if (nodeEnv === "production" && LOOPBACK.test(parsed.hostname)) {
    return PRODUCTION_URL;
  }
  return parsed.origin;
}

export const SITE_URL = resolveSiteUrl();

/**
 * Judul dokumen. Frasa ini bukan slogan pemasaran baru: ia kartu judul
 * sinematik yang sudah tampil di Prolog Journey.
 */
export const SITE_TITLE = "Kediri: A Century of History, Kings, and Industry";

/** Nama penerbit untuk Open Graph dan manifest — identitas merek capsule. */
export const SITE_NAME = "Kediri Digital Heritage Experience";

export const SITE_SHORT_NAME = "Kediri";

/**
 * Deskripsi 165 karakter. Ia menjelaskan pengalamannya, bukan menumpuk kata
 * kunci, dan tidak menambahkan satu pun klaim historis baru: rentang "lebih
 * dari sebelas abad" adalah aritmetika 879 → 2026 yang sudah dinyatakan
 * Finale, dan rantai bukti sudah dijanjikan halaman beranda.
 */
export const SITE_DESCRIPTION =
  "An interactive journey through more than eleven centuries of Kediri, from the Brantas and its ancient kingdoms to the modern city, every claim traceable to a source.";

/** Citra pratinjau sosial: 1200x630 JPEG, diturunkan dari citra Prolog. */
export const SITE_OG_IMAGE = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "Visualisasi artistik Kediri saat senja: jembatan di atas Brantas dan kota yang menyala di kedua tepian.",
} as const;

/**
 * Bidang Open Graph dan Twitter yang dipakai bersama SETIAP halaman.
 *
 * Ini bukan kemewahan gaya. Next MENGGANTI seluruh objek `openGraph` induk
 * begitu sebuah halaman menyatakan `openGraph`-nya sendiri (dokumentasi
 * `generate-metadata`, bagian "Overwriting fields") — jadi halaman yang hanya
 * ingin mengubah judulnya akan diam-diam kehilangan citra pratinjau, nama
 * situs, tipe, dan locale. Halaman menyebarkan basis ini lebih dulu, lalu
 * menimpa yang memang berbeda.
 */
export const OPEN_GRAPH_BASE = {
  // Hanya `type` yang butuh tipe literal; `images` harus tetap larik yang
  // dapat diubah karena itulah yang diterima tipe metadata Next.
  type: "website" as const,
  locale: "id_ID",
  siteName: SITE_NAME,
  images: [SITE_OG_IMAGE],
};

export const TWITTER_BASE = {
  card: "summary_large_image" as const,
  images: [SITE_OG_IMAGE.url],
};

/** URL absolut untuk konsumen yang tidak melewati `metadataBase` Next. */
export function siteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`.replace(
    /\/$/u,
    "",
  );
}
