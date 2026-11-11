/**
 * Motion tokens — the shared motion language of the site.
 *
 * Timing and easing belong to code, never to the CMS (Technical Bible §19).
 * This file is pure data so it can be imported by tests and by the GSAP
 * module alike without side effects. Sections vary in CHOREOGRAPHY, not in
 * vocabulary: every section picks from these durations, eases, and staggers.
 *
 * TWO-CLOCK MODEL (bombon.rs / jasminadenner.com teardown, 2026-08-28):
 *   Clock 1 — CAMERA: dolly, light, parallax, territory split → scrubbed
 *             linearly by scroll.
 *   Clock 2 — SCRIPT: date, master line, editorial beats → TRIGGERED at a
 *             progress threshold, then played on their own clock with an
 *             expressive ease. Script that rides the camera clock feels
 *             mechanical; that was the root of "the text does not move like
 *             GSAP".
 */

/**
 * CustomEase curves registered once by `registerGsap()`. Names are the
 * public contract; paths are the implementation.
 *
 *   cine     — leaves fast, lands very softly (title cards, credits).
 *   cineIn   — mirror of cine for exits.
 *   hardCut  — almost a step: the whole travel happens in the first tenth.
 *              Used for tension (politicalFracture, revolutionMachine).
 *   settle   — long deceleration with no overshoot (finale, act headers).
 */
export const CUSTOM_EASES = [
  { name: "cine", path: "M0,0 C0.16,1 0.3,1 1,1" },
  { name: "cineIn", path: "M0,0 C0.7,0 0.84,0 1,1" },
  { name: "hardCut", path: "M0,0 C0.02,0.86 0.08,1 1,1" },
  { name: "settle", path: "M0,0 C0.22,0.72 0.24,1 1,1" },
] as const;

export const EASES = {
  /** Scrubbed motion is always linear: a doubled curve reads as a bug. */
  scrub: "none",
  read: "power2.out",
  cine: "cine",
  cineIn: "cineIn",
  hardCut: "hardCut",
  settle: "settle",
  lift: "power4.out",
  converge: "power3.out",
  expand: "expo.out",
  sine: "sine.out",
  fadeIn: "power1.out",
  fadeOut: "power1.in",
} as const;

/** Seconds. Script durations stay under ~1.5 s so the reading state is reached within the e2e settle window. */
export const DURATIONS = {
  unit: 0.55,
  read: 1,
  master: 0.85,
  cut: 0.32,
  dwell: 1.4,
  card: 0.9,
  wipe: 1.1,
  fade: 0.45,
} as const;

/** Stagger values. `amount`-style values are total spans, `each`-style values are per item. */
export const STAGGERS = {
  charsEach: 0.028,
  charsFastEach: 0.012,
  wordsEach: 0.06,
  linesEach: 0.09,
  beatsAmount: 0.4,
  cardsEach: 0.12,
} as const;

/**
 * Legacy token object kept for compatibility with every existing import.
 * New code should read EASES / DURATIONS / STAGGERS directly.
 */
export const MOTION = {
  scrubEase: EASES.scrub,
  reveal: { duration: 0.9, ease: EASES.read },
  settle: { duration: 1.2, ease: "power3.out" },
  /** Spatial travel, in percent of the element's own size. */
  travel: { desktop: 12, tablet: 8, mobile: 4 },
  /** Clock 2 — triggered script. */
  text: {
    ease: EASES.cine,
    line: { duration: 0.85, stagger: 0.09, travel: 115 },
    char: { duration: 1.1, stagger: 0.05 },
    unit: { duration: DURATIONS.unit, stagger: 0.1 },
  },
  /**
   * READING register (editorial directive, Chief 2026-08-29): script above
   * imagery arrives softly — small offset, no bounce, no rotation. The
   * cinematic "cine" register belongs to credits and title cards.
   */
  read: { y: 16, duration: DURATIONS.read, stagger: 0.15, ease: EASES.read },
  /** Ambient background parallax: subtle, -8 to -12 percent. */
  parallax: { from: 4, to: -10 },
  /** ScrollSmoother softness on the variants that use it. */
  smooth: 1.1,
} as const;
