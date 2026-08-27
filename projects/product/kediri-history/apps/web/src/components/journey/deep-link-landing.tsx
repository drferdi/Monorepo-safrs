"use client";

import { useEffect } from "react";

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
const DESKTOP_ATTEMPTS = [300, 750, 1400] as const;
const STATIC_ATTEMPTS = [320, 800, 1_450, 1_850] as const;

export function DeepLinkLanding(): null {
  useEffect(() => {
    let cancelled = false;
    let timers: number[] = [];

    const clearTimers = () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers = [];
    };

    const isStaticFlow = () =>
      window.matchMedia(
        "(max-width: 47.999rem), (prefers-reduced-motion: reduce)",
      ).matches;

    /** Kehendak pengunjung selalu menang: sekali ia menggulir, koreksi berhenti. */
    const takeOver = () => {
      cancelled = true;
      clearTimers();
    };

    const land = (id: string) => {
      if (cancelled) return;
      const scene = document.getElementById(id);
      if (!scene) return;

      if (isStaticFlow()) {
        const nav = document.querySelector<HTMLElement>(".site-nav");
        const navHeight = nav?.getBoundingClientRect().height ?? 0;
        const targetTop =
          scene.getBoundingClientRect().top + window.scrollY - navHeight - 8;
        if (Math.abs(window.scrollY - targetTop) <= 8) return;
        window.scrollTo({
          top: Math.max(0, Math.round(targetTop)),
          behavior: "auto",
        });
        return;
      }

      const shot = scene.closest(".scene")?.querySelector(".scene-shot");
      if (!(shot instanceof HTMLElement)) return;

      const span = shot.offsetHeight - window.innerHeight;
      if (span <= 0) return;

      const top = shot.getBoundingClientRect().top + window.scrollY;
      const target = Math.round(top + span * REST);
      if (Math.abs(window.scrollY - target) <= 8) return;
      window.scrollTo({ top: target, behavior: "auto" });
    };

    const start = (requestedId?: string) => {
      const id =
        requestedId ?? decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      // Setiap kedatangan baru membatalkan jadwal sebelumnya dan memulihkan
      // hak koreksi, termasuk setelah pengunjung sempat menggulir sendiri.
      clearTimers();
      cancelled = false;
      const attempts = isStaticFlow() ? STATIC_ATTEMPTS : DESKTOP_ATTEMPTS;
      timers = attempts.map((delay) =>
        window.setTimeout(() => land(id), delay),
      );
    };

    const onJourneyNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ readonly id?: unknown }>).detail;
      const id = detail?.id;
      if (typeof id !== "string" || id.length === 0) return;

      // Ini satu-satunya lompatan awal untuk Timeline. Setelahnya, percobaan
      // tertunda di atas mengantar scene ke keadaan baca setelah geometry dan
      // refresh motion selesai.
      document.getElementById(id)?.scrollIntoView({ block: "start" });
      start(id);
    };

    for (const event of ["wheel", "touchstart", "keydown"] as const) {
      window.addEventListener(event, takeOver, { passive: true });
    }
    const onHashChange = () => start();
    const onPopState = () => start();
    const onLoad = () => start();
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onPopState);
    window.addEventListener(JOURNEY_NAVIGATION_EVENT, onJourneyNavigation);

    if (document.readyState === "complete") start();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      cancelled = true;
      clearTimers();
      window.removeEventListener("load", onLoad);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener(JOURNEY_NAVIGATION_EVENT, onJourneyNavigation);
      for (const event of ["wheel", "touchstart", "keydown"] as const) {
        window.removeEventListener(event, takeOver);
      }
    };
  }, []);

  return null;
}
