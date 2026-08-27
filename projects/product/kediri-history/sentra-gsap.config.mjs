/**
 * Konfigurasi gate Sentra-GSAP untuk capsule Kediri.
 *
 * Standarnya milik root dan TIDAK menjadi dependensi capsule (keputusan Chief
 * G04): berkas ini hanya memberi tahu gate root cara memeriksa sumber capsule
 * ini. Capsule yang diekstraksi tetap berjalan tanpa gate ini, dan tidak ada
 * satu pun berkas di sini yang mengimpornya.
 *
 * Dijalankan DARI akar Monorepo:
 *   node scripts/sentra-gsap/verify.mjs --config projects/product/kediri-history/sentra-gsap.config.mjs
 */
export default {
  scanPaths: ["apps/web/src"],

  requiredGates: {
    staticAudit: true,
    typecheck: true,
    lint: true,
    test: true,
    build: true,
    browser: true,
    visualReview: true,
    independentVisualReview: true,
  },

  commands: {
    typecheck: "pnpm run typecheck",
    lint: "pnpm run lint",
    test: "pnpm run test",
    build: "pnpm run build",
  },

  browser: {
    url: process.env.SENTRA_GSAP_URL || "http://127.0.0.1:4320",
    routes: ["/", "/journey", "/archive"],
    // Journey <-> Archive adalah perjalanan pulang-pergi yang UX Bible bagian
    // 17 sebut sakral, jadi ia harus ikut diperiksa sebagai satu putaran.
    journeys: [
      {
        name: "journey-to-archive-and-back",
        from: "/journey#1135-panjalu-jayati",
        click: '[id="1135-panjalu-jayati"] a[href*="/archive/events/"]',
        expectPath: "/archive/events/1135-panjalu-jayati",
      },
    ],
  },
};
