"use client";

import { useGSAP } from "@gsap/react";
import type { ReactElement, ReactNode } from "react";
import { useRef } from "react";

import {
  DURATIONS,
  debugMarkers,
  EASES,
  gsap,
  registerGsap,
  ScrollTrigger,
  SplitText,
  STAGGERS,
} from "../../modules/motion/index";

/**
 * Finale — resolusi yang tenang (audit 2026-09-03; sebelumnya statis).
 *
 * Dua jam, dua tujuan:
 *   - KAMERA (scrub): citra jembatan 2026 mengecil pelan (scale 1.08 → 1)
 *     sepanjang bingkai — tangan pembaca sendiri yang menurunkan kamera.
 *   - NASKAH (dipicu sekali, diputar balik saat mundur): kalimat pemikul
 *     terkuak dari topeng baris; paragraf penutup menyusul lembut; coda
 *     berjeda panjang per baris; kalimat terakhir "Kota ini terus berlanjut."
 *     merapat dari sebaran huruf ke kursinya (tracking lewat `x` per huruf,
 *     bukan letter-spacing) — satu-satunya gerak keras di section ini, dan
 *     itulah pernyataan kuncinya.
 *
 * `display: contents`; markup di dalamnya lengkap tanpa JavaScript. Mobile
 * dan reduced-motion tidak membangun timeline.
 */
export function FinaleMotion({
  children,
}: {
  readonly children: ReactNode;
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
          const frame = root.querySelector<HTMLElement>(".finale-frame");
          const image = root.querySelector<HTMLElement>(".framing-stage");
          const master = root.querySelector<HTMLElement>(
            ".finale-frame .master-line",
          );
          const eyebrows = Array.from(
            root.querySelectorAll<HTMLElement>(
              ".finale-frame .eyebrow, .finale-frame .title-scene, .finale-frame .journey-visual-label",
            ),
          );
          const paragraphs = Array.from(
            root.querySelectorAll<HTMLElement>(".narrative-stack p"),
          );
          const coda = Array.from(
            root.querySelectorAll<HTMLElement>(".finale-coda p"),
          );
          const readout = root.querySelector<HTMLElement>(".finale-readout");
          if (!frame) return undefined;

          const triggers: ScrollTrigger[] = [];
          const timelines: gsap.core.Timeline[] = [];
          const splits: SplitText[] = [];
          const touched: HTMLElement[] = [];

          /* ---------- kamera: scale-out di-scrub ---------- */
          if (image) {
            touched.push(image);
            const camera = gsap
              .timeline({ paused: true })
              .fromTo(
                image,
                { scale: 1.08, transformOrigin: "50% 40%" },
                { scale: 1, ease: EASES.scrub, duration: 1 },
              );
            timelines.push(camera);
            triggers.push(
              ScrollTrigger.create({
                trigger: frame,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
                invalidateOnRefresh: true,
                markers: debugMarkers(),
                animation: camera,
              }),
            );
          }

          /* ---------- naskah bingkai: dipicu sekali ---------- */
          const frameTl = gsap.timeline({ paused: true });
          if (eyebrows.length > 0) {
            touched.push(...eyebrows);
            gsap.set(eyebrows, { opacity: 0, y: 12 });
            frameTl.to(
              eyebrows,
              {
                opacity: 1,
                y: 0,
                duration: DURATIONS.card,
                ease: EASES.read,
                stagger: 0.1,
              },
              0,
            );
          }
          if (master) {
            const split = SplitText.create(master, {
              type: "lines",
              mask: "lines",
            });
            splits.push(split);
            gsap.set(split.lines, { yPercent: 110 });
            frameTl.to(
              split.lines,
              {
                yPercent: 0,
                duration: 1.1,
                ease: EASES.cine,
                stagger: STAGGERS.linesEach,
              },
              0.2,
            );
          }
          timelines.push(frameTl);
          triggers.push(
            ScrollTrigger.create({
              trigger: frame,
              start: "top 55%",
              invalidateOnRefresh: true,
              markers: debugMarkers(),
              toggleActions: "play none none reverse",
              animation: frameTl,
            }),
          );

          /* ---------- bacaan + coda: dipicu sekali ---------- */
          if (readout && (paragraphs.length > 0 || coda.length > 0)) {
            const readTl = gsap.timeline({ paused: true });
            if (paragraphs.length > 0) {
              touched.push(...paragraphs);
              gsap.set(paragraphs, { opacity: 0, y: 14 });
              readTl.to(
                paragraphs,
                {
                  opacity: 1,
                  y: 0,
                  duration: DURATIONS.read,
                  ease: EASES.read,
                  stagger: 0.12,
                },
                0,
              );
            }
            const last = coda[coda.length - 1];
            const quiet = coda.slice(0, -1);
            if (quiet.length > 0) {
              touched.push(...quiet);
              gsap.set(quiet, { opacity: 0 });
              readTl.to(
                quiet,
                {
                  opacity: 1,
                  duration: DURATIONS.dwell,
                  ease: EASES.sine,
                  stagger: 0.35,
                },
                0.4,
              );
            }
            if (last) {
              touched.push(last);
              const split = SplitText.create(last, { type: "chars" });
              splits.push(split);
              const chars = split.chars;
              const middle = (chars.length - 1) / 2;
              chars.forEach((char, index) => {
                gsap.set(char, { opacity: 0, x: (index - middle) * 14 });
              });
              readTl.to(
                chars,
                {
                  opacity: 1,
                  x: 0,
                  duration: 1.3,
                  ease: EASES.settle,
                  stagger: { amount: 0.4, from: "center" },
                },
                quiet.length > 0 ? 1.2 : 0.4,
              );
            }
            timelines.push(readTl);
            triggers.push(
              ScrollTrigger.create({
                trigger: readout,
                start: "top 78%",
                invalidateOnRefresh: true,
                markers: debugMarkers(),
                toggleActions: "play none none reverse",
                animation: readTl,
              }),
            );
          }

          return () => {
            for (const trigger of triggers) trigger.kill();
            for (const timeline of timelines) timeline.kill();
            for (const split of splits) split.revert();
            if (touched.length > 0) gsap.set(touched, { clearProps: "all" });
          };
        },
      );

      return () => media.revert();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
