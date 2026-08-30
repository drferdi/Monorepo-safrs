"use client";

import { useGSAP } from "@gsap/react";
import type { ReactElement } from "react";
import { useRef } from "react";

import type { JourneyMilestone } from "../../content/journey-milestones";
import { gsap, registerGsap } from "../../modules/motion/index";

/** Tiap karakter jadi span sendiri agar reveal-nya bertahap ("efek typing"). */
function typingChars(value: string) {
  const occurrences = new Map<string, number>();
  return Array.from(value, (character) => {
    const occurrence = occurrences.get(character) ?? 0;
    occurrences.set(character, occurrence + 1);
    return (
      <span
        aria-hidden="true"
        className={
          character === " "
            ? "act-milestone-char act-milestone-char--space"
            : "act-milestone-char"
        }
        data-ticker-char="true"
        key={`${character}-${occurrence}`}
      >
        {character}
      </span>
    );
  });
}

const HOLD_SECONDS = 2.6;
const CHAR_STAGGER = 0.018;
const FADE_OUT_SECONDS = 0.4;

/**
 * Tiket tonggak sejarah yang bergantian dengan efek typing (revisi Chief
 * 2026-08-30), di kepala Act I sebelum scene pertama. Berbasis WAKTU
 * (loop tak berhenti), bukan scroll — ia hidup di satu layar hero yang
 * belum digulir, sama seperti kredit dan kartu judul Prolog.
 *
 * Teks visual aria-hidden; daftar lengkapnya tetap ada untuk pembaca layar
 * lewat `<ul className="visually-hidden">` di samping (kontrak yang sama
 * dengan `PrologueVisualLabel`: lapisan animasi tidak pernah satu-satunya
 * jalan menuju maknanya).
 */
export function ActMilestoneTicker({
  milestones,
}: {
  readonly milestones: readonly JourneyMilestone[];
}): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      registerGsap();

      const media = gsap.matchMedia();
      media.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 48rem)",
        () => {
          const lines = Array.from(
            root.querySelectorAll<HTMLElement>("[data-ticker-line]"),
          );
          if (lines.length === 0) return undefined;

          root.dataset.tickerMotion = "true";
          gsap.set(lines, { autoAlpha: 0 });

          const timeline = gsap.timeline({ repeat: -1 });
          for (const line of lines) {
            const chars =
              line.querySelectorAll<HTMLElement>("[data-ticker-char]");
            gsap.set(chars, { autoAlpha: 0, y: 6 });
            timeline
              .set(line, { autoAlpha: 1 })
              .to(chars, {
                autoAlpha: 1,
                y: 0,
                duration: 0.4,
                ease: "power2.out",
                stagger: { each: CHAR_STAGGER, from: "start" },
              })
              .to({}, { duration: HOLD_SECONDS })
              .to(line, {
                autoAlpha: 0,
                duration: FADE_OUT_SECONDS,
                ease: "power2.in",
              });
          }

          return () => {
            delete root.dataset.tickerMotion;
            timeline.kill();
          };
        },
      );

      return () => media.revert();
    },
    { scope: rootRef },
  );

  return (
    <div className="act-milestone-ticker-wrap">
      <ul className="visually-hidden">
        {milestones.map((milestone) => (
          <li key={milestone.year}>
            {milestone.year} — {milestone.text}
          </li>
        ))}
      </ul>
      <div className="act-milestone-ticker" ref={rootRef} aria-hidden="true">
        {milestones.map((milestone) => (
          <p
            className="act-milestone-line"
            data-ticker-line="true"
            key={milestone.year}
          >
            <span className="act-milestone-year">
              {typingChars(milestone.year)}
            </span>
            <span className="act-milestone-sep"> — </span>
            <span className="act-milestone-text">
              {typingChars(milestone.text)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
