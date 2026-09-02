import { gsap, ScrollTrigger } from "./gsap";

/**
 * A shared visual motif, deliberately separate from the historical narrative.
 * Every path has the same M/C command count so GSAP can interpolate `d` safely
 * without MorphSVG.
 */
export interface BrantasPathState {
  readonly anchor: string;
  readonly commandCount: 6;
  readonly d: string;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeDasharray: string;
  readonly opacity: number;
}

export const BRANTAS_PATH_STATES = [
  {
    anchor: "prologue-2026",
    commandCount: 6,
    d: "M 0 58 C 15 34 22 78 38 54 C 54 30 60 76 76 52 C 89 34 94 60 100 48",
    stroke: "var(--kediri-river-deep)",
    strokeWidth: 3,
    strokeDasharray: "0",
    opacity: 0.56,
  },
  {
    anchor: "1042-river-divides-kingdom",
    commandCount: 6,
    d: "M 0 62 C 16 39 25 70 39 48 C 52 26 67 69 78 42 C 88 25 94 62 100 36",
    stroke: "var(--kediri-copper)",
    strokeWidth: 2,
    strokeDasharray: "0",
    opacity: 0.52,
  },
  {
    anchor: "1678-river-fortress",
    commandCount: 6,
    d: "M 0 67 C 13 50 28 30 42 53 C 57 78 64 25 78 47 C 90 67 94 28 100 39",
    stroke: "var(--kediri-copper)",
    strokeWidth: 2,
    strokeDasharray: "0.8 0.8",
    opacity: 0.54,
  },
  {
    anchor: "1869-brantas-bridge",
    commandCount: 6,
    d: "M 0 70 C 16 56 25 42 41 56 C 54 69 67 20 79 42 C 90 61 95 24 100 27",
    stroke: "var(--kediri-iron)",
    strokeWidth: 1.5,
    strokeDasharray: "0.45 0.45",
    opacity: 0.5,
  },
  {
    anchor: "2024-2026-river-to-runway",
    commandCount: 6,
    d: "M 0 73 C 17 66 27 60 43 59 C 59 58 73 31 84 29 C 93 27 97 20 100 17",
    stroke: "var(--kediri-black)",
    strokeWidth: 4,
    strokeDasharray: "0",
    opacity: 0.6,
  },
] as const satisfies readonly BrantasPathState[];

function stateVars(state: BrantasPathState) {
  return {
    attr: { d: state.d },
    opacity: state.opacity,
    stroke: state.stroke,
    strokeDasharray: state.strokeDasharray,
    strokeWidth: state.strokeWidth,
  };
}

/** One scoped ScrollTrigger; all anchor-relative morphs share its timeline. */
export function attachBrantasThread(root: SVGSVGElement): () => void {
  const path = root.querySelector<SVGPathElement>("[data-brantas-path]");
  const content = document.getElementById("historical-content");

  if (!path || !content) return () => undefined;

  const timeline = gsap.timeline({ paused: true });

  const anchorProgress = (state: BrantasPathState) => {
    const anchor = document.getElementById(state.anchor);
    if (!anchor) return 0;

    const contentTop = content.getBoundingClientRect().top + window.scrollY;
    const anchorTop = anchor.getBoundingClientRect().top + window.scrollY;
    const scrollSpan = Math.max(content.scrollHeight - window.innerHeight, 1);
    return gsap.utils.clamp(0, 1, (anchorTop - contentTop) / scrollSpan);
  };

  const rebuildTimeline = () => {
    const states = BRANTAS_PATH_STATES.map((state) => ({
      ...state,
      progress: anchorProgress(state),
    }));

    timeline.clear();
    gsap.set(path, stateVars(states[0]));

    for (let index = 1; index < states.length; index += 1) {
      const previous = states[index - 1];
      const next = states[index];
      timeline.fromTo(
        path,
        stateVars(previous),
        {
          ...stateVars(next),
          duration: Math.max(next.progress - previous.progress, 0.001),
          ease: "none",
        },
        previous.progress,
      );
    }

    const finalState = states[states.length - 1];
    if (finalState.progress < 1) {
      timeline.to(path, {
        ...stateVars(finalState),
        duration: Math.max(1 - finalState.progress, 0.001),
        ease: "none",
      }, finalState.progress);
    }
  };

  rebuildTimeline();

  const scrollTrigger = ScrollTrigger.create({
    animation: timeline,
    end: "bottom bottom",
    invalidateOnRefresh: true,
    onRefresh: (self) => {
      rebuildTimeline();
      timeline.progress(self.progress);
    },
    scrub: true,
    start: "top top",
    trigger: content,
  });

  return () => {
    scrollTrigger.kill();
    timeline.kill();
  };
}
