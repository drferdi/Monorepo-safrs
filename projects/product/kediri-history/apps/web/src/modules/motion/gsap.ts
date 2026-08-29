import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/**
 * Registrasi GSAP terpusat (Sentra-GSAP: daftarkan plugin sekali di satu modul
 * GSAP pusat).
 *
 * Stack motion adalah 100% GSAP resmi (direktif Chief 2026-08-28): core,
 * ScrollTrigger, ScrollSmoother, SplitText, CustomEase. Tidak ada Lenis,
 * tidak ada Locomotive, tidak ada library ketiga.
 *
 * ScrollSmoother adalah subsistem OPT-IN per rute (Journey) dan hanya untuk
 * varian desktop/tablet tanpa preferensi reduced-motion — lihat
 * `modules/motion/smooth.ts`. Ia mempertahankan scrollbar native sehingga
 * restorasi scroll peramban tetap hidup; mobile dan reduced tetap scroll
 * native murni.
 */
let registered = false;

export function registerGsap(): typeof gsap {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, CustomEase);
    /*
     * Ease sinematik untuk Jam 2 (naskah yang di-TRIGGER): berangkat cepat,
     * mendarat sangat lembut. Jam 1 (kamera yang di-scrub) tetap linear.
     */
    CustomEase.create("cine", "M0,0 C0.16,1 0.3,1 1,1");
    registered = true;
  }
  return gsap;
}

export { CustomEase, gsap, ScrollSmoother, ScrollTrigger, SplitText };

/**
 * Token motion. Timing dan easing adalah milik kode, tidak pernah milik CMS
 * (Technical Bible bagian 19).
 *
 * MODEL DUA-JAM (hasil teardown bombon.rs / jasminadenner.com, 2026-08-28):
 *   Jam 1 — KAMERA: dolly, cahaya, parallax, pemisahan wilayah → di-scrub
 *            linear oleh gulir.
 *   Jam 2 — NASKAH: tarikh, kalimat pemikul, beat editorial → di-TRIGGER
 *            pada ambang progres, lalu bermain di jamnya sendiri dengan ease
 *            ekspresif. Naskah yang ikut jam kamera terasa mekanis; itulah
 *            akar keluhan "tulisannya tidak bergerak seperti GSAP".
 */
export const MOTION = {
  /** Gerak yang di-scrub selalu linear: kurva ganda terasa seperti bug. */
  scrubEase: "none",
  reveal: { duration: 0.9, ease: "power2.out" },
  settle: { duration: 1.2, ease: "power3.out" },
  /** Jarak perjalanan spasial, dalam persen dari elemennya sendiri. */
  travel: { desktop: 12, tablet: 8, mobile: 4 },
  /** Jam 2 — naskah yang di-trigger. */
  text: {
    ease: "cine",
    line: { duration: 0.85, stagger: 0.09, travel: 115 },
    char: { duration: 1.1, stagger: 0.05 },
    unit: { duration: 0.55, stagger: 0.1 },
  },
  /**
   * Register BACA (direktif editorial Chief 2026-08-29): naskah di atas citra
   * muncul lembut — offset kecil, tanpa pantulan, tanpa rotasi. Register
   * sinematik "cine" tetap milik kredit pembuka dan kartu judul.
   */
  read: { y: 16, duration: 1, stagger: 0.15, ease: "power2.out" },
  /** Parallax latar ambient: halus, -8 sampai -12 persen. */
  parallax: { from: 4, to: -10 },
  /** Kelembutan ScrollSmoother pada varian yang memakainya. */
  smooth: 1.1,
} as const;
