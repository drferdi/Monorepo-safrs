import { useEffect } from "react";

/**
 * Mascot state system.
 *
 * Markup contract (see MOTION_PLAN.md §1):
 *   .sb-mascot[data-state]        one mascot; state drives CSS in polish.css
 *   .sb-mascot__lid               face-coloured eyelid overlays (blink)
 *   .sb-mascot__pupil             pupils that follow the pointer (gaze)
 *   .sb-mascot__bubble            small speech bubble ("…", "z")
 *
 * States: idle | walk | greet | listen | think | celebrate | sleep | error.
 * greet and celebrate are one-shots: they play once and return to the
 * previous state on animationend. Everything is exposed on window.sbMascot
 * so the scene hooks (demo, brief, pricing) can drive states without
 * importing React state.
 *
 * Honours prefers-reduced-motion: no blink, no gaze, one-shots resolve to
 * their end state immediately. Mascots that are off-screen get
 * data-offscreen so their idle loops can be paused by CSS.
 */

const ONE_SHOT = new Set(["greet", "celebrate"]);
const BLINK_MIN = 4000;
const BLINK_SPREAD = 3000;
const BLINK_MS = 120;

export function useMascot(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const mascots = Array.from(root.querySelectorAll(".sb-mascot"));
    if (mascots.length === 0) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover)").matches;
    const timers = new Set();
    const later = (fn, ms) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };

    // Blink, randomised per mascot so they never blink in sync.
    const scheduleBlink = (el) => {
      later(
        () => {
          if (!el.hasAttribute("data-offscreen") && el.dataset.state !== "sleep") {
            el.setAttribute("data-blink", "");
            later(() => el.removeAttribute("data-blink"), BLINK_MS);
          }
          scheduleBlink(el);
        },
        BLINK_MIN + Math.random() * BLINK_SPREAD,
      );
    };
    if (!reduceMotion) mascots.forEach(scheduleBlink);

    // One-shots return to whatever state they interrupted.
    const onAnimationEnd = (event) => {
      const el = event.currentTarget;
      if (event.target !== el) return;
      if (ONE_SHOT.has(el.dataset.state)) {
        el.dataset.state = el.dataset.prev || "idle";
        delete el.dataset.prev;
      }
    };
    for (const el of mascots) el.addEventListener("animationend", onAnimationEnd);

    // Pause idle loops while off-screen.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
        }
      },
      { rootMargin: "20%" },
    );
    for (const el of mascots) io.observe(el);

    // Gaze: pupils follow the pointer within ±1, set as --gx/--gy.
    let gazeFrame = 0;
    let pointer = null;
    const applyGaze = () => {
      gazeFrame = 0;
      if (!pointer) return;
      for (const el of mascots) {
        if (el.hasAttribute("data-offscreen")) continue;
        const r = el.getBoundingClientRect();
        const gx = (pointer.x - (r.left + r.width / 2)) / 220;
        const gy = (pointer.y - (r.top + r.height / 2)) / 220;
        el.style.setProperty("--gx", Math.max(-1, Math.min(1, gx)).toFixed(2));
        el.style.setProperty("--gy", Math.max(-1, Math.min(1, gy)).toFixed(2));
      }
    };
    const onPointerMove = (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!gazeFrame) gazeFrame = window.requestAnimationFrame(applyGaze);
    };
    if (!reduceMotion && canHover) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    const api = {
      set(el, state) {
        if (!el) return;
        if (ONE_SHOT.has(state)) {
          if (reduceMotion) return;
          if (!ONE_SHOT.has(el.dataset.state)) el.dataset.prev = el.dataset.state;
          // Restart the animation even if the same one-shot is requested twice.
          el.dataset.state = "";
          void el.offsetWidth;
        }
        el.dataset.state = state;
      },
      say(el, text, ms = 1600) {
        const bubble = el?.querySelector(".sb-mascot__bubble");
        if (!bubble) return;
        bubble.textContent = text;
        bubble.hidden = false;
        later(() => {
          bubble.hidden = true;
        }, ms);
      },
      reduceMotion,
    };
    window.sbMascot = api;

    return () => {
      for (const id of timers) window.clearTimeout(id);
      if (gazeFrame) window.cancelAnimationFrame(gazeFrame);
      window.removeEventListener("pointermove", onPointerMove);
      for (const el of mascots) el.removeEventListener("animationend", onAnimationEnd);
      io.disconnect();
      if (window.sbMascot === api) delete window.sbMascot;
    };
  }, [rootRef]);
}
