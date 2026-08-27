"use client";

import { useEffect } from "react";

/**
 * Pendaratan mobile/reduced di bawah chrome navigasi yang fixed.
 *
 * DeepLinkLanding menjaga keadaan baca untuk shot desktop. Pada alur vertikal
 * mobile dan reduced, yang dibutuhkan hanya offset chrome; guard ini berjalan
 * setelah layout stabil dan berhenti begitu pengunjung mengambil alih scroll.
 */
const ATTEMPTS = [320, 800, 1_450, 1_850] as const;

export function JourneySafeArea(): null {
  useEffect(() => {
    let cancelled = false;
    let timers: number[] = [];

    const clearTimers = () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers = [];
    };

    const takeOver = () => {
      cancelled = true;
      clearTimers();
    };

    const isStaticFlow = () =>
      window.matchMedia(
        "(max-width: 47.999rem), (prefers-reduced-motion: reduce)",
      ).matches;

    const land = (id: string) => {
      if (cancelled || !isStaticFlow()) return;
      const target = document.getElementById(id);
      if (!target) return;

      const nav = document.querySelector<HTMLElement>(".site-nav");
      const navHeight = nav?.getBoundingClientRect().height ?? 0;
      const targetTop =
        target.getBoundingClientRect().top + window.scrollY - navHeight - 8;
      if (Math.abs(window.scrollY - targetTop) <= 8) return;
      window.scrollTo({
        top: Math.max(0, Math.round(targetTop)),
        behavior: "auto",
      });
    };

    const start = () => {
      if (!isStaticFlow()) return;
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      clearTimers();
      cancelled = false;
      timers = ATTEMPTS.map((delay) =>
        window.setTimeout(() => land(id), delay),
      );
    };

    const onAnchorClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      if (!link) return;
      window.setTimeout(start, 0);
    };

    for (const event of ["wheel", "touchstart", "keydown"] as const) {
      window.addEventListener(event, takeOver, { passive: true });
    }
    window.addEventListener("hashchange", start);
    window.addEventListener("popstate", start);
    document.addEventListener("click", onAnchorClick, true);

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      cancelled = true;
      clearTimers();
      window.removeEventListener("load", start);
      window.removeEventListener("hashchange", start);
      window.removeEventListener("popstate", start);
      document.removeEventListener("click", onAnchorClick, true);
      for (const event of ["wheel", "touchstart", "keydown"] as const) {
        window.removeEventListener(event, takeOver);
      }
    };
  }, []);

  return null;
}
