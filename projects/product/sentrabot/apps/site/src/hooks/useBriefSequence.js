import { useEffect } from "react";

/**
 * Scroll choreography for the "Brief" stage.
 *
 * Markup contract (src/html/Brief.html):
 *   [data-brief-runway]      tall wrapper whose scroll span drives the scene
 *   [data-brief-stage]       the sticky 100svh viewport inside the runway
 *   [data-brief="phone"]     lock-screen phone (notifications)
 *   [data-brief="cards"]     wrapper of six notification cards
 *   [data-brief="panel"]     the "Brief Hari Ini" digest, clipped to the screen
 *   [data-brief="shell"]     white phone shell the digest lives in
 *
 * Story, as a function of runway progress p in [0, 1]:
 *   0.00–0.12  lock screen holds
 *   0.12–0.45  notifications burst out of the phone into a fan
 *   0.50–0.72  they converge back and dissolve; the phone turns into the
 *              white shell
 *   0.66–1.00  the digest slides up inside the shell and settles
 *
 * Honours prefers-reduced-motion by showing the settled state immediately.
 */

/** Fan targets per card: x as a fraction of stage width, y of stage height, rotation in deg. */
const FAN = [
  [-0.34, -0.3, -9],
  [-0.41, 0.0, -4],
  [-0.33, 0.3, 7],
  [0.34, -0.3, 9],
  [0.41, 0.0, 4],
  [0.33, 0.3, -7],
];

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function useBriefSequence(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const runway = root.querySelector("[data-brief-runway]");
    if (!runway) return undefined;

    const stage = runway.querySelector("[data-brief-stage]");
    const phone = runway.querySelector('[data-brief="phone"]');
    const cards = Array.from(runway.querySelectorAll('[data-brief="cards"] > div'));
    const panel = runway.querySelector('[data-brief="panel"]');
    const panelInner = panel?.querySelector(":scope > div:not(.sb-statusbar)");
    const shell = runway.querySelector('[data-brief="shell"]');
    if (!stage || !phone || !panel || !panelInner || !shell) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let lastP = -1;

    const paint = (p) => {
      if (p === lastP) return;
      lastP = p;

      const stageRect = stage.getBoundingClientRect();
      const W = stageRect.width;
      const H = stageRect.height;
      // Screen bounds come from the shell so the digest is clipped to the
      // device regardless of breakpoint. Bezel measured on the shell art:
      // ≈2.6% of width on the sides, ≈1.6% of height top and bottom. Safe
      // areas keep content clear of the camera island and home indicator.
      const shellRect = shell.getBoundingClientRect();
      const bezelX = shellRect.width * 0.026;
      const bezelY = shellRect.height * 0.016;
      const screenTop = shellRect.top - stageRect.top + bezelY;
      const screenBottom = stageRect.bottom - shellRect.bottom + bezelY;
      const screenLeft = shellRect.left - stageRect.left + bezelX;
      const screenRight = stageRect.right - shellRect.right + bezelX;
      const screenW = W - screenLeft - screenRight;
      const screenH = H - screenTop - screenBottom;
      const safeTop = shellRect.height * 0.062;
      const safeBottom = shellRect.height * 0.04;
      const radius = shellRect.width * 0.075;
      const pad = Math.round(screenW * 0.04);

      panel.style.setProperty("--sb-screen-top", `${screenTop.toFixed(1)}px`);
      panel.style.setProperty("--sb-screen-left", `${screenLeft.toFixed(1)}px`);
      panel.style.setProperty("--sb-screen-w", `${screenW.toFixed(1)}px`);
      panel.style.setProperty("--sb-screen-pad", `${pad}px`);
      panel.style.setProperty("--sb-safe-top", `${safeTop.toFixed(1)}px`);
      panelInner.style.width = `${Math.round(screenW - pad * 2)}px`;

      // Cards: burst (staggered) then converge.
      const back = easeInOut(seg(p, 0.5, 0.72));
      cards.forEach((el, i) => {
        const [fx, fy, rot] = FAN[i % FAN.length];
        const out = easeOut(seg(p, 0.12 + i * 0.035, 0.42 + i * 0.035));
        const k = out * (1 - back);
        const scale = 0.55 + 0.45 * k;
        const x = fx * W * k;
        const y = fy * H * k;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(rot * k).toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        el.style.opacity = Math.min(out, 1 - back).toFixed(3);
      });

      // Phone → shell crossfade.
      const swap = easeInOut(seg(p, 0.56, 0.74));
      phone.style.opacity = (1 - swap).toFixed(3);
      phone.style.transform = `scale(${(1 - 0.03 * swap).toFixed(3)})`;
      shell.style.opacity = swap.toFixed(3);

      // Digest: fade + slide in with its heading at the top of the screen,
      // then scroll down to rest on its last section.
      const enter = easeOut(seg(p, 0.66, 0.8));
      const settle = easeInOut(seg(p, 0.8, 1));
      const innerH = panelInner.getBoundingClientRect().height;
      // Inner sits at the stage bottom by layout; translate it so its top
      // starts under the status bar, then scroll to its bottom edge if it
      // is taller than the screen.
      const yTop = screenTop + safeTop + innerH - H;
      const yBottom = -screenBottom - safeBottom;
      const yRest = innerH > screenH - safeTop - safeBottom ? yBottom : yTop;
      const slide = (1 - enter) * 56;
      const y = yTop + (yRest - yTop) * settle + slide;
      panel.style.opacity = enter.toFixed(3);
      panel.style.clipPath = `inset(${screenTop.toFixed(1)}px ${screenRight.toFixed(1)}px ${screenBottom.toFixed(1)}px ${screenLeft.toFixed(1)}px round ${radius.toFixed(1)}px)`;
      panelInner.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;

      // Mascot peeks from behind the device once the digest has settled.
      const peek = stage.querySelector(".sb-brief-peek");
      if (peek) {
        peek.style.setProperty("--sb-shell-half", `${(shellRect.width / 2).toFixed(1)}px`);
        const shown = p >= 0.96;
        if (shown !== peek.hasAttribute("data-shown")) {
          peek.toggleAttribute("data-shown", shown);
          if (shown) window.sbMascot?.set(peek, "celebrate");
        }
      }
    };

    if (reduceMotion) {
      paint(1);
      return undefined;
    }

    let frame = 0;
    let lastY = Number.NaN;

    const measure = () => {
      const rect = runway.getBoundingClientRect();
      const travel = rect.height - stage.clientHeight;
      const progress =
        travel > 0 ? clamp(-rect.top / travel, 0, 1) : rect.top < window.innerHeight ? 1 : 0;
      paint(Math.round(progress * 1000) / 1000);
    };

    const tick = () => {
      frame = window.requestAnimationFrame(tick);
      const y = window.scrollY;
      if (y === lastY) return;
      lastY = y;
      measure();
    };

    const nudge = () => {
      lastY = Number.NaN;
      lastP = -1;
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
    };
  }, [rootRef]);
}
