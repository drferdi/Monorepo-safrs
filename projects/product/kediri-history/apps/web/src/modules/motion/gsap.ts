import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

import { CUSTOM_EASES } from "./tokens";

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
     * Ease sinematik untuk Jam 2 (naskah yang di-TRIGGER) didaftarkan sekali
     * dari token pusat (`tokens.ts`). Jam 1 (kamera yang di-scrub) tetap
     * linear.
     */
    for (const ease of CUSTOM_EASES) {
      CustomEase.create(ease.name, ease.path);
    }
    registered = true;
  }
  return gsap;
}

/*
 * Token motion hidup di `tokens.ts` (data murni, tanpa efek samping) dan
 * diekspor ulang di sini supaya seluruh import lama `MOTION` tetap berlaku.
 */
export { DURATIONS, EASES, MOTION, STAGGERS } from "./tokens";
export { CustomEase, gsap, ScrollSmoother, ScrollTrigger, SplitText };

/**
 * Saklar debug motion. HANYA dibaca di dalam effect (bukan saat render) agar
 * markup server dan klien identik. Aktif bila URL memuat `motionDebug=1`
 * atau build diset `NEXT_PUBLIC_MOTION_DEBUG=1`. Tidak pernah aktif di
 * produksi tanpa salah satu saklar itu.
 */
export function isMotionDebug(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_MOTION_DEBUG === "1") return true;
  try {
    return (
      new URLSearchParams(window.location.search).get("motionDebug") === "1"
    );
  } catch {
    return false;
  }
}

/** Marker ScrollTrigger hanya di balik saklar debug — tidak pernah di produksi. */
export function debugMarkers(): boolean {
  return isMotionDebug();
}

interface MotionDebugHandle {
  readonly gsap: typeof gsap;
  readonly ScrollTrigger: typeof ScrollTrigger;
  activeTriggers(): number;
}

declare global {
  interface Window {
    __kediriMotion?: MotionDebugHandle;
  }
}

/**
 * Memaparkan pegangan inspeksi (`window.__kediriMotion`) di balik saklar
 * debug, sehingga e2e dan DevTools dapat menghitung ScrollTrigger yang hidup
 * (`activeTriggers()`) tanpa membongkar modul.
 */
export function exposeMotionDebug(): void {
  if (!isMotionDebug()) return;
  window.__kediriMotion = {
    gsap,
    ScrollTrigger,
    activeTriggers: () => ScrollTrigger.getAll().length,
  };
}
