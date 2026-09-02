import { useEffect } from "react";

/**
 * Page-level mascot moments that are not owned by another scene hook:
 *
 *   hero     — the walker greets once when its band is first seen and
 *              leans toward the CTA while it is hovered/focused
 *   footer   — the sleeper wakes (greet) on CTA hover/focus, dozes off
 *              again after four seconds, and says "z" every six
 *   privacy  — bullets stagger in once the card is on screen
 *
 * Uses window.sbMascot from useMascot; degrades to nothing without it.
 */

const WAKE_MS = 4000;
const SNORE_MS = 6000;

export function useMascotScenes(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const api = () => window.sbMascot;
    const cleanups = [];
    const timers = new Set();
    const later = (fn, ms) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    // ---------------------------------------------------------- hero
    const runner = root.querySelector(".sb-walk__runner");
    const figure = root.querySelector(".sb-walk__figure");
    const heroCta = root.querySelector("[data-hero-cta]");
    // The walk itself opens with a peek (see .sb-walk keyframes in
    // polish.css); the only scripted hero moment is the CTA lean.
    if (runner && figure) {
      if (heroCta) {
        const lean = () => api()?.set(figure, "listen");
        const walk = () => {
          if (figure.dataset.state === "listen") api()?.set(figure, "walk");
        };
        heroCta.addEventListener("pointerenter", lean);
        heroCta.addEventListener("focus", lean);
        heroCta.addEventListener("pointerleave", walk);
        heroCta.addEventListener("blur", walk);
        cleanups.push(() => {
          heroCta.removeEventListener("pointerenter", lean);
          heroCta.removeEventListener("focus", lean);
          heroCta.removeEventListener("pointerleave", walk);
          heroCta.removeEventListener("blur", walk);
        });
      }
    }

    // -------------------------------------------------------- footer
    const sleeper = root.querySelector(".sb-footer-mascot");
    const footerCta = root.querySelector("[data-footer-cta]");
    if (sleeper && footerCta) {
      let dozeTimer = 0;
      const wake = () => {
        if (!api()) return;
        api().set(sleeper, "greet");
        // greet returns to the previous state (sleep); hold idle instead.
        later(() => {
          if (sleeper.dataset.state !== "greet") api().set(sleeper, "idle");
        }, 660);
        window.clearTimeout(dozeTimer);
        dozeTimer = window.setTimeout(() => api()?.set(sleeper, "sleep"), WAKE_MS);
        timers.add(dozeTimer);
      };
      footerCta.addEventListener("pointerenter", wake);
      footerCta.addEventListener("focus", wake);
      const snore = window.setInterval(() => {
        if (sleeper.dataset.state === "sleep" && !sleeper.hasAttribute("data-offscreen")) {
          api()?.say(sleeper, "z", 1400);
        }
      }, SNORE_MS);
      cleanups.push(() => {
        footerCta.removeEventListener("pointerenter", wake);
        footerCta.removeEventListener("focus", wake);
        window.clearInterval(snore);
      });
    }

    // ------------------------------------------------------- privacy
    const privacy = root.querySelector("[data-privacy]");
    if (privacy) {
      let frame = 0;
      const check = () => {
        frame = 0;
        const rect = privacy.getBoundingClientRect();
        const shown =
          (Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)) / rect.height;
        if (shown >= 0.3) {
          privacy.setAttribute("data-in", "");
          window.removeEventListener("scroll", onScroll);
        }
      };
      const onScroll = () => {
        if (!frame) frame = window.requestAnimationFrame(check);
      };
      check();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        if (frame) window.cancelAnimationFrame(frame);
      });
    }

    return () => {
      for (const id of timers) window.clearTimeout(id);
      for (const fn of cleanups) fn();
    };
  }, [rootRef]);
}
