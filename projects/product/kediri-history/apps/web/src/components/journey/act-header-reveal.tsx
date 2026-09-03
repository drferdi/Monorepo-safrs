"use client";

import { useGSAP } from "@gsap/react";
import type { ReactElement, ReactNode } from "react";
import { useRef } from "react";

import {
  debugMarkers,
  EASES,
  gsap,
  MOTION,
  registerGsap,
  ScrollTrigger,
  SplitText,
  STAGGERS,
} from "../../modules/motion/index";

/**
 * Kartu judul act (chapter title card).
 *
 * Tiga mode, satu bahasa (audit 2026-09-03):
 *
 *   `card`       — judul terkuak dari TOPENG BARIS (SplitText `mask: "lines"`,
 *                  yPercent 110 → 0), label/paragraf/tiket menyusul lembut;
 *                  media latar (bila ada) dolly-in. Dipicu SEKALI saat
 *                  digulir masuk, diputar balik saat digulir keluar ke atas —
 *                  kartu judul adalah satu peristiwa, bukan bidikan berjam
 *                  kamera; karena itu bukan scrub.
 *   `wipe`       — seperti `card`, tetapi media latar masuk lewat SAPUAN
 *                  clip-path dari bawah (tirai terbuka) alih-alih dolly.
 *   `scrubWords` — kartu berteks panjang tanpa media (Babak III): judul tetap
 *                  topeng baris, tetapi PARAGRAFNYA disorot kata demi kata
 *                  mengikuti posisi gulir (scrub). Refleksi dibaca pada tempo
 *                  pembaca, bukan dipertunjukkan — maka di sini scrub adalah
 *                  pilihan yang benar.
 *
 * `display: contents` — tidak menambah satu kotak layout pun; markup di
 * dalamnya sudah lengkap tanpa JavaScript (SSR baseline tetap tampak penuh).
 * Mobile dan reduced-motion tidak pernah membangun timeline.
 */
export type ActHeaderMode = "card" | "wipe" | "scrubWords";

export function ActHeaderReveal({
  enabled,
  mode = "card",
  children,
}: {
  readonly enabled: boolean;
  readonly mode?: ActHeaderMode;
  readonly children: ReactNode;
}): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || !enabled) return;
      registerGsap();

      /*
       * `root` sendiri `display: contents` (sengaja — tidak menambah kotak
       * layout), yang berarti `getBoundingClientRect()`-nya SELALU nol.
       * ScrollTrigger memakai rect itu untuk trigger — tanpa `closest`,
       * ambangnya kebaca "sudah lewat" sejak scrollY 0 dan kepicu instan
       * (terbukti: reveal selesai bermain sebelum digulir sama sekali).
       * `<header>` pembungkus asli-lah yang punya geometri sungguhan.
       */
      const triggerElement = root.closest("header") ?? root;

      const media = gsap.matchMedia();
      media.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 48rem)",
        () => {
          const headerMedia =
            root.querySelector<HTMLElement>(".act-header-media");
          const title = root.querySelector<HTMLElement>(".title-scene");
          const paragraphs = Array.from(
            root.querySelectorAll<HTMLElement>(".lead.measure"),
          );
          const rest = [
            root.querySelector<HTMLElement>(".archive-label"),
            ...(mode === "scrubWords" ? [] : paragraphs),
            root.querySelector<HTMLElement>(".act-milestone-ticker-wrap"),
          ].filter((element): element is HTMLElement => element !== null);

          if (rest.length === 0 && !headerMedia && !title) return undefined;

          const cleanups: (() => void)[] = [];

          /* ---------- media + pendukung: satu timeline yang dipicu ---------- */
          const timeline = gsap.timeline({ paused: true });
          if (headerMedia) {
            if (mode === "wipe") {
              gsap.set(headerMedia, {
                clipPath: "inset(100% 0 0 0)",
                scale: 1.06,
                transformOrigin: "50% 100%",
              });
              timeline.to(
                headerMedia,
                {
                  clipPath: "inset(0% 0 0 0)",
                  scale: 1,
                  duration: 1.3,
                  ease: EASES.settle,
                },
                0,
              );
            } else {
              gsap.set(headerMedia, { opacity: 0, scale: 1.08 });
              timeline.to(
                headerMedia,
                {
                  opacity: 1,
                  scale: 1,
                  duration: MOTION.settle.duration,
                  ease: MOTION.settle.ease,
                },
                0,
              );
            }
          }
          if (rest.length > 0) {
            gsap.set(rest, { opacity: 0, y: 20 });
            timeline.to(
              rest,
              {
                opacity: 1,
                y: 0,
                duration: MOTION.reveal.duration,
                ease: MOTION.reveal.ease,
                stagger: 0.12,
              },
              headerMedia ? 0.35 : 0.15,
            );
          }

          /* ---------- judul: topeng baris ---------- */
          let revealed = false;
          let titleTween: gsap.core.Tween | undefined;
          let titleSplit: SplitText | undefined;
          if (title) {
            /*
             * `autoSplit` membelah ulang saat font selesai dimuat atau lebar
             * berubah; `onSplit` mengembalikan tween baru dan SplitText
             * sendiri yang me-revert tween lama. Keadaan "sudah terkuak"
             * dipulihkan agar re-split di tengah halaman tidak menyembunyikan
             * judul lagi.
             */
            titleSplit = SplitText.create(title, {
              type: "lines",
              mask: "lines",
              autoSplit: true,
              onSplit: (self) => {
                const tween = gsap.from(self.lines, {
                  yPercent: 110,
                  duration: 1.05,
                  ease: EASES.cine,
                  stagger: STAGGERS.linesEach,
                  paused: true,
                });
                if (revealed) tween.progress(1);
                titleTween = tween;
                return tween;
              },
            });
          }

          /*
           * Callback eksplisit (setara `toggleActions: "play none none
           * reverse"`) supaya tween judul yang dibuat ulang oleh autoSplit
           * ikut dikendalikan. Begitu di-refresh (font/video metadata
           * mengubah tinggi di atasnya), ScrollTrigger mengecek ulang posisi
           * aktual — `once` + play manual pernah terbukti kepicu di scrollY 0
           * dan tidak pernah membetulkan diri.
           */
          const trigger = ScrollTrigger.create({
            trigger: triggerElement,
            start: "top 75%",
            invalidateOnRefresh: true,
            markers: debugMarkers(),
            onEnter: () => {
              revealed = true;
              timeline.play();
              titleTween?.play();
            },
            onLeaveBack: () => {
              revealed = false;
              timeline.reverse();
              titleTween?.reverse();
            },
          });
          cleanups.push(() => trigger.kill());

          /* ---------- Babak III: kata demi kata mengikuti gulir ---------- */
          if (mode === "scrubWords" && paragraphs.length > 0) {
            const wordSplit = SplitText.create(paragraphs, { type: "words" });
            gsap.set(wordSplit.words, { opacity: 0.18 });
            const reading = gsap.timeline({ paused: true }).to(
              wordSplit.words,
              {
                opacity: 1,
                ease: "none",
                duration: 1,
                stagger: { each: 1, ease: "none" },
              },
              0,
            );
            const readingTrigger = ScrollTrigger.create({
              trigger: triggerElement,
              start: "top 62%",
              end: "bottom 58%",
              scrub: 0.4,
              invalidateOnRefresh: true,
              markers: debugMarkers(),
              animation: reading,
            });
            cleanups.push(() => {
              readingTrigger.kill();
              reading.kill();
              wordSplit.revert();
            });
          }

          return () => {
            for (const cleanup of cleanups) cleanup();
            timeline.kill();
            titleTween?.kill();
            titleSplit?.revert();
            gsap.set([...(headerMedia ? [headerMedia] : []), ...rest], {
              clearProps: "all",
            });
          };
        },
      );

      return () => media.revert();
    },
    { scope: rootRef, dependencies: [enabled, mode] },
  );

  return (
    <div
      className="act-header-reveal"
      ref={rootRef}
      style={{ display: "contents" }}
    >
      {children}
    </div>
  );
}
