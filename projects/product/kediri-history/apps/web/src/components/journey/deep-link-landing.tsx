"use client";

import { useEffect } from "react";
import { scrollJourneyTo } from "../../modules/motion/smooth";

/**
 * Pendaratan tautan dalam pada Journey.
 *
 * Sebuah shot yang di-pin menempati rentang gulirnya sendiri. Browser melompat
 * ke ATAS elemen ketika membuka tautan dalam, dan pada shot yang di-pin atas
 * elemen adalah awal pin — yaitu kehampaan. Seorang guru yang membagikan
 * `/journey#1135-panjalu-jayati` bermaksud membagikan scene-nya, bukan awal
 * animasinya (UX Bible bagian 39: keadaan masuk lewat deep-link adalah keadaan
 * baca yang stabil).
 *
 * Koreksinya hidup DI SINI, sekali untuk seluruh halaman, bukan di dalam tiap
 * island motion. Alasannya bukan kerapian: island motion dibongkar-pasang oleh
 * `gsap.matchMedia` setiap kali kondisi media dievaluasi ulang, dan pembongkaran
 * itu membatalkan koreksi yang dijadwalkan sebelum sempat berjalan.
 *
 * Ia juga mendengarkan `hashchange`, `popstate`, dan event navigasi aplikasi,
 * karena berpindah antar-anchor di dalam Journey TIDAK memuat ulang halaman.
 * Overlay Timeline memakai `pushState`, sedangkan tautan "bab berikutnya"
 * memakai hash biasa; semuanya harus mendarat pada keadaan baca yang sama.
 *
 * Geometrinya dibaca dari ruang shot, bukan dari ScrollTrigger, sehingga
 * komponen ini tidak bergantung pada instance mana pun:
 *
 *   rentang shot = tinggi shot - tinggi viewport
 *   keadaan baca = awal shot + rentang * REST
 */
const REST = 0.74;

/**
 * Event aplikasi untuk perpindahan anchor yang memakai `pushState`.
 * `pushState` sendiri memang tidak memancarkan `hashchange`, jadi Timeline
 * mengumumkan kedatangan secara eksplisit kepada satu pemilik landing ini.
 */
export const JOURNEY_NAVIGATION_EVENT = "journey:navigate";

export function announceJourneyNavigation(id: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ readonly id: string }>(JOURNEY_NAVIGATION_EVENT, {
      detail: { id },
    }),
  );
}

/**
 * Percobaan sengaja terlambat dan berulang. Lompatan hash bawaan browser tidak
 * punya waktu yang dijamin: pada mesin lambat ia terjadi SETELAH koreksi
 * pertama dan mengembalikan gulir ke awal pin. Karena targetnya dihitung dari
 * tata letak — bukan dari instance yang bergerak — pengulangan ini konvergen,
 * tidak berosilasi.
 */
/**
 * Percobaan berulang untuk memastikan pendaratan konvergen bahkan saat
 * aset atau ScrollSmoother sedang menyelesaikan inisialisasi tata letak.
 */
const DESKTOP_ATTEMPTS = [0, 150, 450, 900, 1500] as const;
const STATIC_ATTEMPTS = [0, 150, 450, 900, 1500] as const;

function getAbsoluteTop(element: HTMLElement): number {
  const content = document.getElementById("smooth-content");
  if (content?.contains(element)) {
    let top = 0;
    let curr: HTMLElement | null = element;
    while (curr && curr !== content) {
      top += curr.offsetTop;
      curr = curr.offsetParent as HTMLElement | null;
    }
    return top;
  }
  let top = 0;
  let curr: HTMLElement | null = element;
  while (curr) {
    top += curr.offsetTop;
    curr = curr.offsetParent as HTMLElement | null;
  }
  return top;
}

export function DeepLinkLanding(): null {
  useEffect(() => {
    let cancelled = false;
    let timers: number[] = [];
    let isNavigatingProgrammatically = false;

    const clearTimers = () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers = [];
    };

    const isStaticFlow = () =>
      window.matchMedia(
        "(max-width: 47.999rem), (prefers-reduced-motion: reduce)",
      ).matches;

    const onUserScroll = () => {
      if (!isNavigatingProgrammatically) {
        cancelled = true;
        clearTimers();
      }
    };

    const land = (id: string) => {
      if (cancelled) return;
      const scene = document.getElementById(id);
      if (!scene) return;

      if (isStaticFlow()) {
        const nav = document.querySelector<HTMLElement>(".site-nav");
        const navHeight = nav?.offsetHeight ?? 0;
        const targetTop = getAbsoluteTop(scene) - navHeight - 8;
        if (Math.abs(window.scrollY - targetTop) <= 8) return;
        window.scrollTo({
          top: Math.max(0, Math.round(targetTop)),
          behavior: "auto",
        });
        return;
      }

      const shot =
        scene.closest(".scene")?.querySelector(".scene-shot") ??
        scene.querySelector(".scene-shot");
      if (!(shot instanceof HTMLElement)) return;

      const span = Math.max(0, shot.offsetHeight - window.innerHeight);
      if (span <= 0) {
        const target = getAbsoluteTop(scene);
        scrollJourneyTo(target);
        return;
      }

      const top = getAbsoluteTop(shot);
      const target = Math.round(top + span * REST);
      if (Math.abs(window.scrollY - target) <= 8) return;
      scrollJourneyTo(target);
    };

    const start = (requestedId?: string) => {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const id = requestedId ?? decodeURIComponent(hash);
      if (!id) return;

      clearTimers();
      cancelled = false;
      isNavigatingProgrammatically = true;

      const attempts = isStaticFlow() ? STATIC_ATTEMPTS : DESKTOP_ATTEMPTS;
      timers = attempts.map((delay) =>
        window.setTimeout(() => {
          land(id);
          if (delay === attempts[attempts.length - 1]) {
            isNavigatingProgrammatically = false;
          }
        }, delay),
      );
    };

    const onJourneyNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ readonly id?: unknown }>).detail;
      const id = detail?.id;
      if (typeof id !== "string" || id.length === 0) return;
      start(id);
    };

    let resizeTimer: number | undefined;
    const onResizeOrOrientation = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const hash = window.location.hash.slice(1);
        if (hash) start(hash);
      }, 200);
    };

    for (const event of ["wheel", "touchstart"] as const) {
      window.addEventListener(event, onUserScroll, { passive: true });
    }
    const onHashChange = () => start();
    const onPopState = () => start();
    const onLoad = () => start();

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("resize", onResizeOrOrientation);
    window.addEventListener("orientationchange", onResizeOrOrientation);
    window.addEventListener(JOURNEY_NAVIGATION_EVENT, onJourneyNavigation);

    if (document.readyState === "complete") start();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      cancelled = true;
      clearTimers();
      if (resizeTimer) window.clearTimeout(resizeTimer);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("resize", onResizeOrOrientation);
      window.removeEventListener("orientationchange", onResizeOrOrientation);
      window.removeEventListener(JOURNEY_NAVIGATION_EVENT, onJourneyNavigation);
      for (const event of ["wheel", "touchstart"] as const) {
        window.removeEventListener(event, onUserScroll);
      }
    };
  }, []);

  return null;
}
