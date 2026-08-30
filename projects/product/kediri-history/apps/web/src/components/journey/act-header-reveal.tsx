"use client";

import { useGSAP } from "@gsap/react";
import type { ReactElement, ReactNode } from "react";
import { useRef } from "react";

import {
  gsap,
  MOTION,
  registerGsap,
  ScrollTrigger,
} from "../../modules/motion/index";

/**
 * Kemunculan kartu judul act saat digulir masuk (revisi Chief 2026-08-30) —
 * media latar (video/citra) dolly-in halus, lalu label/judul/paragraf/tiket
 * menyusul dengan stagger. Satu timeline, ScrollTrigger `once` di atasnya
 * (bukan scrub — kartu judul adalah satu peristiwa kemunculan, bukan bidikan
 * berjam kamera). `enabled` membungkus keputusan act mana yang memakainya;
 * act lain tetap statis, sama seperti sebelum revisi ini.
 *
 * `display: contents` — tidak menambah satu kotak layout pun; markup di
 * dalamnya sudah lengkap tanpa JavaScript (SSR baseline tetap tampak penuh).
 */
export function ActHeaderReveal({
  enabled,
  children,
}: {
  readonly enabled: boolean;
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
          const rest = [
            root.querySelector<HTMLElement>(".archive-label"),
            root.querySelector<HTMLElement>(".title-scene"),
            ...Array.from(root.querySelectorAll<HTMLElement>(".lead.measure")),
            root.querySelector<HTMLElement>(".act-milestone-ticker-wrap"),
          ].filter((element): element is HTMLElement => element !== null);

          if (rest.length === 0 && !headerMedia) return undefined;

          if (headerMedia) {
            gsap.set(headerMedia, { opacity: 0, scale: 1.08 });
          }
          gsap.set(rest, { opacity: 0, y: 20 });

          const timeline = gsap.timeline({ paused: true });
          if (headerMedia) {
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
          timeline.to(
            rest,
            {
              opacity: 1,
              y: 0,
              duration: MOTION.reveal.duration,
              ease: MOTION.reveal.ease,
              stagger: 0.12,
            },
            headerMedia ? 0.25 : 0,
          );

          /*
           * `toggleActions` (bukan `once` + `onEnter` manual) — begitu
           * di-refresh (mis. setelah video metadata atau font baru selesai
           * dimuat, mengubah tinggi pin di atasnya), ScrollTrigger menge-cek
           * ULANG posisi aktual dan membetulkan sendiri keadaan play/reverse.
           * `once` + play manual pernah terbukti kepicu di scrollY 0 karena
           * ukuran dokumen belum settle saat trigger pertama dibuat, dan
           * begitu terpicu langsung mati selamanya — tidak pernah membetulkan
           * diri.
           */
          const trigger = ScrollTrigger.create({
            trigger: triggerElement,
            start: "top 75%",
            toggleActions: "play none none reverse",
            invalidateOnRefresh: true,
            animation: timeline,
          });

          return () => {
            trigger.kill();
            timeline.kill();
            gsap.set([...(headerMedia ? [headerMedia] : []), ...rest], {
              clearProps: "all",
            });
          };
        },
      );

      return () => media.revert();
    },
    { scope: rootRef, dependencies: [enabled] },
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
