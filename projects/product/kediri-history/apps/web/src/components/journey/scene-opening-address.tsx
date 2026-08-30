"use client";

import { useGSAP } from "@gsap/react";
import type { ReactElement } from "react";
import { useRef } from "react";

import { SCENE_OPENING_ADDRESS } from "../../content/scene-opening-address";
import {
  gsap,
  MOTION,
  registerGsap,
  ScrollTrigger,
} from "../../modules/motion/index";

/** Tiap karakter menjadi span sendiri agar reveal scroll dapat dikendalikan. */
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
            ? "opening-address-char opening-address-char--space"
            : "opening-address-char"
        }
        data-address-char="true"
        key={`${character}-${occurrence}`}
      >
        {character}
      </span>
    );
  });
}

/**
 * Sambutan pembuka Act I: satu transisi normal-flow sesudah header act dan
 * sebelum panggung 879. Naskah tetap dirender penuh di server; pada desktop
 * dan tablet tanpa reduced motion, satu timeline scrubbed menyingkap tiga
 * baris lalu memudarkan seluruh address sebelum transisi selesai.
 *
 * Mobile, reduced-motion, dan tanpa JavaScript mempertahankan teks semantik
 * yang terbaca dalam urutan dokumen biasa. Island ini memiliki satu
 * ScrollTrigger top-level sendiri, terpisah dari panggung Scene 879 yang
 * memiliki trigger pin-nya sendiri.
 */
export function SceneOpeningAddress(): ReactElement {
  const transitionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const transition = transitionRef.current;
      if (!transition) return;
      registerGsap();

      const media = gsap.matchMedia();
      media.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 48rem)",
        () => {
          const address = transition.querySelector<HTMLElement>(
            ".scene-opening-address",
          );
          const lines = Array.from(
            transition.querySelectorAll<HTMLElement>(".opening-address-line"),
          );
          const chars = lines.flatMap((line) =>
            Array.from(
              line.querySelectorAll<HTMLElement>("[data-address-char]"),
            ),
          );

          if (!address || lines.length === 0 || chars.length === 0) {
            return undefined;
          }

          // Server-rendered text is the fallback; only this motion variant
          // starts the character reveal from a hidden visual state.
          gsap.set(address, { opacity: 1 });
          gsap.set(chars, { opacity: 0, y: MOTION.read.y / 2 });

          const timeline = gsap.timeline({ paused: true });
          lines.forEach((line, index) => {
            const lineChars = Array.from(
              line.querySelectorAll<HTMLElement>("[data-address-char]"),
            );
            timeline.to(
              lineChars,
              {
                opacity: 1,
                y: 0,
                duration: 0.1,
                ease: "none",
                stagger: { amount: 0.1, from: "start" },
              },
              index * 0.08,
            );
          });

          // Reveal selesai pada 36% timeline, sehingga address lengkap dapat
          // menetap sepanjang hampir setengah jendela scroll. Fade baru mulai
          // ketika 879 telah mendekati seperempat bawah viewport.
          timeline.to(
            address,
            { opacity: 0, duration: 0.18, ease: "power1.in" },
            0.82,
          );

          const trigger = ScrollTrigger.create({
            trigger: transition,
            start: "top bottom",
            end: "bottom 75%",
            scrub: 0.25,
            invalidateOnRefresh: true,
            animation: timeline,
          });

          return () => {
            trigger.kill();
            timeline.kill();
            gsap.set([address, ...chars], { clearProps: "all" });
          };
        },
      );

      return () => media.revert();
    },
    { scope: transitionRef },
  );

  return (
    <section
      aria-label="Sambutan pembuka Act I"
      className="scene-opening-transition"
      data-scene-opening-transition="true"
      ref={transitionRef}
    >
      <div className="scene-opening-address">
        <span className="visually-hidden">
          {SCENE_OPENING_ADDRESS.map((line) => line.text).join(" — ")}
        </span>
        <div aria-hidden="true">
          {SCENE_OPENING_ADDRESS.map((line, index) => (
            <p
              className={`opening-address-line opening-address-line-${index}`}
              key={line.text}
              lang={line.lang}
            >
              {typingChars(line.text)}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
