import { useEffect } from "react";

/**
 * Scroll-driven reveal for the demo iPad conversation.
 *
 * Markup contract (see src/html/Demo*.html and Features.html):
 *   [data-seq-runway]         element whose scroll span drives one sequence
 *   [data-seq-mode="enter"]   short runway: cascade on first entry instead
 *   [data-seq="N"]            revealed once step >= N
 *   [data-seq-until="M"]      removed from layout once step >= M
 *
 * Two modes, because the page has two shapes of section:
 *
 * - scroll (default) — for tall sticky sections. Steps come from scroll
 *   position, so the reveal tracks the reader instead of running ahead of
 *   them, and scrubbing backwards rewinds it.
 * - enter — for sections only one screen tall, where there is no scroll
 *   distance to map onto. Steps cascade once, on first entry.
 *
 * Honours prefers-reduced-motion by showing the final state immediately.
 */

const STYLE_ID = "sentra-demo-sequence";
const EASE = "cubic-bezier(.16,1,.3,1)";

/** Fraction of the runway consumed before the first step advances. */
const LEAD_IN = 0.06;
/** Fraction of the runway over which all steps unlock. */
const SPAN = 0.72;
/** Gap between steps in enter mode, in ms. */
const STEP_DELAY = 480;
/** How much of an enter-mode runway must be on screen before it starts. */
const ENTER_THRESHOLD = 0.35;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-seq] {
      opacity: 0;
      transform: translateY(1.1cqw) scale(.985);
      transition: opacity .5s ${EASE}, transform .5s ${EASE};
      will-change: opacity, transform;
    }
    [data-seq][data-seq-in] {
      opacity: 1;
      transform: none;
    }
    /* Retiring is done with an attribute, never el.style.display: several
       sequenced elements carry display:flex in their own inline style, and
       clearing the property would silently strip it. */
    [data-seq][data-seq-out] {
      display: none !important;
    }
    @keyframes sb-typing {
      0%, 60%, 100% { opacity: .28; transform: translateY(0); }
      30%           { opacity: 1;   transform: translateY(-18%); }
    }
    @media (prefers-reduced-motion: reduce) {
      [data-seq] { transition: none; }
      [data-seq] > span { animation: none !important; }
    }
  `;
  document.head.appendChild(style);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function useDemoSequence(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const runways = Array.from(root.querySelectorAll("[data-seq-runway]"));
    if (runways.length === 0) return undefined;

    injectStyle();

    const groups = runways.map((runway) => {
      const items = Array.from(runway.querySelectorAll("[data-seq]"));
      const maxStep = items.reduce((max, el) => Math.max(max, Number(el.dataset.seq) || 0), 0);
      return {
        runway,
        items,
        maxStep,
        lastStep: -1,
        onEnter: runway.dataset.seqMode === "enter",
      };
    });

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Apply a step to one group; skips DOM writes when nothing changed. */
    const paint = (group, step) => {
      if (step === group.lastStep) return;
      group.lastStep = step;

      for (const el of group.items) {
        const from = Number(el.dataset.seq) || 0;
        const until = Number(el.dataset.seqUntil) || Number.POSITIVE_INFINITY;
        const retired = step >= until;

        if (retired) {
          el.setAttribute("data-seq-out", "");
        } else {
          el.removeAttribute("data-seq-out");
        }
        if (!retired && step >= from) {
          el.setAttribute("data-seq-in", "");
        } else {
          el.removeAttribute("data-seq-in");
        }
      }
      reactMascot(group, step);
    };

    /**
     * Mascot reactions, derived from what the latest visible step shows so
     * the same rule serves every iPad tree (see MOTION_PLAN.md §3.3/3.5):
     *   typing dots      → think ("…")
     *   asks permission  → listen
     *   "Diizinkan"      → celebrate (one-shot)
     *   draft ready      → greet (one-shot)
     * Runways without a mascot (the features iPad) are left alone.
     */
    const reactMascot = (group, step) => {
      const api = window.sbMascot;
      if (!api) return;
      const avatar = group.runway.querySelector(".sb-mascot");
      if (!avatar) return;
      const visible = group.items.filter(
        (el) => el.hasAttribute("data-seq-in") && Number(el.dataset.seq) === step,
      );
      const last = visible[visible.length - 1];
      const text = last?.textContent || "";
      let state = "idle";
      if (last?.querySelector('[style*="sb-typing"]')) state = "think";
      else if (/Diizinkan/.test(text)) state = "celebrate";
      else if (/izin/i.test(text)) state = "listen";
      else if (/draf/i.test(text)) state = "greet";
      if (state === "think") api.say(avatar, "…", 1200);
      if (avatar.dataset.state !== state) api.set(avatar, state);
    };

    if (reduceMotion) {
      for (const group of groups) paint(group, group.maxStep);
      return undefined;
    }

    // Visibility is measured from getBoundingClientRect rather than an
    // IntersectionObserver: IO resolves against the real visual viewport, so it
    // never fires under device-metrics emulation (responsive preview, devtools
    // device mode) even while the element is plainly on screen. One measurement
    // path also means enter and scroll mode cannot disagree.
    const entering = groups.filter((group) => group.onEnter);
    const scrolling = groups.filter((group) => !group.onEnter);
    const timers = new Set();

    for (const group of entering) paint(group, 0);

    const startCascade = (group) => {
      group.started = true;
      for (let step = 1; step <= group.maxStep; step += 1) {
        timers.add(window.setTimeout(() => paint(group, step), (step - 1) * STEP_DELAY));
      }
    };

    let frame = 0;
    let lastY = Number.NaN;

    const measure = () => {
      const viewport = window.innerHeight;

      for (const group of entering) {
        if (group.started) continue;
        const rect = group.runway.getBoundingClientRect();
        if (rect.height === 0) continue;
        const shown = (Math.min(rect.bottom, viewport) - Math.max(rect.top, 0)) / rect.height;
        if (shown >= ENTER_THRESHOLD) startCascade(group);
      }

      for (const group of scrolling) {
        const rect = group.runway.getBoundingClientRect();

        // The desktop and mobile demo sections are swapped by a media query,
        // so one of them always measures zero. Leave it parked at step 1 —
        // otherwise it would be fully revealed the moment a resize shows it.
        if (rect.height === 0) {
          paint(group, 1);
          continue;
        }

        const travel = rect.height - viewport;
        const progress = travel > 0 ? clamp(-rect.top / travel, 0, 1) : rect.top < viewport ? 1 : 0;

        const t = clamp((progress - LEAD_IN) / SPAN, 0, 1);
        paint(group, clamp(Math.ceil(t * group.maxStep), 1, group.maxStep));
      }
    };

    // Two triggers on purpose. The rAF loop is the primary one and is cheap:
    // it reads a rect per runway, bails when the page has not moved, and
    // paint() skips DOM writes when the step is unchanged. Browsers pause rAF
    // while the document is hidden, which is fine — nothing needs to animate
    // then — but it also means a hidden document must catch up on becoming
    // visible again, hence the visibilitychange handler. The scroll and resize
    // listeners are a safety net for embedders that drive scrolling in ways
    // that keep rAF quiet.
    const tick = () => {
      frame = window.requestAnimationFrame(tick);
      const y = window.scrollY;
      if (y === lastY && entering.every((group) => group.started)) return;
      lastY = y;
      measure();
    };

    const nudge = () => {
      lastY = Number.NaN;
      measure();
    };

    measure();
    frame = window.requestAnimationFrame(tick);
    window.addEventListener("scroll", nudge, { passive: true });
    window.addEventListener("resize", nudge);
    document.addEventListener("visibilitychange", nudge);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", nudge);
      window.removeEventListener("resize", nudge);
      document.removeEventListener("visibilitychange", nudge);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [rootRef]);
}
