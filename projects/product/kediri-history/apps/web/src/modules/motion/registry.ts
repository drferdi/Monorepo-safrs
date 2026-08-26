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
  "inscriptionReveal",
  "nameEmerges",
  "dividedKingdom",
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
