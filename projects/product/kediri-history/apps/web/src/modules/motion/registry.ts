/**
 * Kontrak antara CMS dan kode motion.
 *
 * CMS menyimpan INTENT: sebuah Scene memilih choreographyKey seperti
 * "bridgeConstruction". CMS tidak pernah menyimpan selector, tween, durasi,
 * easing, nilai scrub, atau start/end ScrollTrigger (Technical Bible bagian 20).
 *
 * Registry ini memetakan kunci ke implementasi yang teruji. Phase 12 mengisi
 * factory timeline-nya; Phase 1 hanya menetapkan kontraknya, sehingga
 * validateSceneContract punya sesuatu yang otoritatif untuk diperiksa dan
 * choreography key tak dikenal dapat ditolak sejak awal.
 */
export const CHOREOGRAPHY_KEYS = [
  "prologueReveal",
  "inscriptionReveal",
  "nameEmerges",
  "nameEndures",
  "dividedKingdom",
  "dahaLiving",
  "royalConsolidation",
  "manuscriptWorld",
  "politicalFracture",
  "bridgeConstruction",
  "bridgeLift",
  "revolutionMachine",
  "industrialExpansion",
  "runwayTransition",
] as const;

export type ChoreographyKey = (typeof CHOREOGRAPHY_KEYS)[number];

export function isKnownChoreographyKey(
  value: string,
): value is ChoreographyKey {
  return (CHOREOGRAPHY_KEYS as readonly string[]).includes(value);
}

/**
 * Varian responsif adalah desain terpisah, bukan skala turun dari desktop
 * (UX Bible bagian 26, Sentra-GSAP responsive).
 */
export const MOTION_VARIANTS = [
  "desktop",
  "tablet",
  "mobile",
  "reduced",
] as const;

export type MotionVariant = (typeof MOTION_VARIANTS)[number];

/**
 * Perlakuan visual scene (Technical Bible bagian 17, field `visualVariant`).
 *
 * Sama seperti choreographyKey, ini intent murni: CMS memilih namanya, kode
 * memiliki komposisi, material, dan skalanya. Daftar ini yang memutuskan apa
 * yang ada — nama di luar daftar adalah kegagalan validasi, bukan fallback
 * diam yang membuat scene tampil salah tanpa ada yang tahu.
 *
 * `material`  permukaan makro yang disapu cahaya; untuk objek dan prasasti.
 * `landscape` bidang dan cakrawala; untuk geografi dan pembagian wilayah.
 * `word`      satu kata atau frasa sebagai objek arsitektural.
 * `structure` geometri rekayasa yang menggambar dirinya sendiri.
 * `document`  permukaan arsip; untuk naskah dan catatan.
 */
export const VISUAL_VARIANTS = [
  "material",
  "landscape",
  "word",
  "structure",
  "document",
] as const;

export type VisualVariant = (typeof VISUAL_VARIANTS)[number];

export function isKnownVisualVariant(value: string): value is VisualVariant {
  return (VISUAL_VARIANTS as readonly string[]).includes(value);
}
