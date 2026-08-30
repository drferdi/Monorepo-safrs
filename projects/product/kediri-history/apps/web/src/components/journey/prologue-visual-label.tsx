"use client";

import { useGSAP } from "@gsap/react";
import { useRef, useState } from "react";

import { gsap, registerGsap } from "../../modules/motion/index";
import { PROLOGUE_CONTINUATION_STARTED_EVENT } from "./prologue-video-sequence";

type LabelState = "idle" | "typing" | "complete" | "hidden";

function visualCharacters(value: string) {
  const occurrences = new Map<string, number>();
  return Array.from(value, (character) => {
    const occurrence = occurrences.get(character) ?? 0;
    occurrences.set(character, occurrence + 1);
    return (
      <span
        aria-hidden="true"
        className={
          character === " "
            ? "prologue-visual-label__char prologue-visual-label__char--space"
            : "prologue-visual-label__char"
        }
        data-label-char="true"
        key={`${character}-${occurrence}`}
      >
        {character}
      </span>
    );
  });
}

/**
 * Disclosure epistemik Prolog: teks semantic selalu lengkap, sedangkan
 * karakter visual hanya menjadi lapisan presentasi setelah video Daha mulai.
 */
export function PrologueVisualLabel({
  label,
  detail,
}: {
  readonly label: string;
  readonly detail: string;
}) {
  const visualLabelRef = useRef<HTMLParagraphElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const startedRef = useRef(false);
  const [state, setState] = useState<LabelState>("idle");

  useGSAP(
    (_, contextSafe) => {
      const visualLabel = visualLabelRef.current;
      if (!visualLabel) return;
      registerGsap();

      const characters =
        visualLabel.querySelectorAll<HTMLElement>("[data-label-char]");
      const timeline = gsap.timeline({
        paused: true,
        onComplete: () => setState("hidden"),
      });
      timelineRef.current = timeline;

      // The server/no-JS baseline remains complete; JS-enhanced motion starts
      // with the visual layer hidden while the semantic sibling stays exposed.
      gsap.set(visualLabel, { autoAlpha: 0 });
      gsap.set(characters, { autoAlpha: 0, y: 6 });

      timeline
        .addLabel("reveal", 0)
        .call(() => setState("typing"), [], "reveal")
        .set(visualLabel, { autoAlpha: 1 }, "reveal")
        .to(
          characters,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.24,
            ease: "power2.out",
            stagger: { each: 0.018, from: "start" },
          },
          "reveal",
        )
        .addLabel("complete")
        .call(() => setState("complete"), [], "complete")
        .to(
          visualLabel,
          {
            autoAlpha: 0,
            duration: 0.5,
            ease: "power2.in",
          },
          "complete+=3",
        );

      const handleContinuationStarted = () => {
        if (startedRef.current) return;
        startedRef.current = true;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          gsap.set(visualLabel, { autoAlpha: 1, y: 0 });
          gsap.set(characters, { autoAlpha: 1, y: 0 });
          setState("complete");
          return;
        }

        timelineRef.current?.restart();
      };
      const safeHandleContinuationStarted = contextSafe
        ? contextSafe(handleContinuationStarted)
        : handleContinuationStarted;
      window.addEventListener(
        PROLOGUE_CONTINUATION_STARTED_EVENT,
        safeHandleContinuationStarted,
      );

      return () => {
        window.removeEventListener(
          PROLOGUE_CONTINUATION_STARTED_EVENT,
          safeHandleContinuationStarted,
        );
        timeline.kill();
        timelineRef.current = null;
      };
    },
    { scope: visualLabelRef },
  );

  return (
    <div className="prologue-visual-label-shell">
      <span className="visually-hidden" data-label-semantic="true">
        {label} {detail}
      </span>
      <p
        ref={visualLabelRef}
        className="prologue-visual-label"
        data-label-state={state}
        aria-hidden="true"
      >
        <span
          className="prologue-visual-label__line prologue-visual-label__line--primary"
          data-label-line="primary"
        >
          {visualCharacters(label)}
        </span>
        <span
          className="prologue-visual-label__line prologue-visual-label__line--secondary"
          data-label-line="secondary"
        >
          {visualCharacters(detail)}
        </span>
      </p>
    </div>
  );
}
