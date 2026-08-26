/**
 * historical-domain memiliki kronologi, kelas evidence, klasifikasi media,
 * kebijakan representasi, peran, status publikasi, dan slug.
 *
 * Batas modul (keputusan Chief G03): modul ini hanya boleh bergantung pada Zod.
 * Tidak ada React, Next.js, Payload, GSAP, atau kode basis data di sini. Aturan
 * itu ditegakkan mekanis oleh tests/architecture/module-boundaries.test.ts.
 */
export * from "./chronology";
export * from "./evidence";
export * from "./media";
export * from "./publishing";
export * from "./roles";
export * from "./slugs";
