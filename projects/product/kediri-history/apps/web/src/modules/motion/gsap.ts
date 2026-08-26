import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Registrasi GSAP terpusat (Sentra-GSAP: daftarkan plugin sekali di satu modul
 * GSAP pusat).
 *
 * Scroll native adalah default. Tidak ada ScrollSmoother, tidak ada Lenis,
 * tidak ada Locomotive: smooth scrolling adalah subsistem opt-in, bukan
 * dependensi prestise — dan di situs sejarah publik ia juga merusak restorasi
 * scroll bawaan peramban, yang oleh UX Bible bagian 17 disebut sakral.
 */
let registered = false;

export function registerGsap(): typeof gsap {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return gsap;
}

export { gsap, ScrollTrigger };

/**
 * Token motion. Timing dan easing adalah milik kode, tidak pernah milik CMS
 * (Technical Bible bagian 19).
 */
export const MOTION = {
  /** Gerak yang di-scrub selalu linear: kurva ganda terasa seperti bug. */
  scrubEase: "none",
  reveal: { duration: 0.9, ease: "power2.out" },
  settle: { duration: 1.2, ease: "power3.out" },
  /** Jarak perjalanan spasial, dalam persen dari elemennya sendiri. */
  travel: { desktop: 12, tablet: 8, mobile: 4 },
} as const;
