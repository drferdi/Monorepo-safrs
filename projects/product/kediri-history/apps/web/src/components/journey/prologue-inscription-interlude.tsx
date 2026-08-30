"use client";

import { useGSAP } from "@gsap/react";
import type { ReactElement } from "react";
import { useRef } from "react";

import {
  INSCRIPTION_EVIDENCE,
  INSCRIPTION_INTERLUDE_EYEBROW,
  INSCRIPTION_INTERLUDE_INTRO,
  INSCRIPTION_INTERLUDE_OUTRO,
} from "../../content/prologue-interlude";
import {
  gsap,
  MOTION,
  registerGsap,
  ScrollTrigger,
} from "../../modules/motion/index";

/**
 * Jeda "bukti prasasti" (revisi Chief 2026-08-30: scroll-driven, bukan timer).
 *
 * Bidikan sendiri, di luar registry koreografi shot — bukan Jam 1/Jam 2 milik
 * `scenes.ts`/`director.ts`, karena kontennya bukan naskah CMS. Satu timeline
 * di-scrub LANGSUNG oleh ScrollTrigger (bukan di-trigger lalu bermain sendiri):
 * enam target reveal (label+pembuka, empat kartu bukti, penutup) bergiliran
 * tampak persis mengikuti posisi gulir — maju menyingkap, mundur menyembunyikan.
 * Video pembuka meredup lewat tweak `prologueReveal` di `scenes.ts` (Jam 1
 * shot itu sendiri), bukan di sini — bidikan ini hanya mengurus panggung
 * gelapnya sendiri.
 *
 * Mobile dan reduced-motion tidak pernah dipin/di-scrub: seluruh konten
 * tampak statis dalam alur dokumen, konsisten dengan kontrak aksesibilitas
 * situs ("keadaan baca adalah DOM hasil server-render").
 *
 * Video lanjutan sebagai reveal terakhir SUDAH DIBUANG (revisi Chief
 * 2026-08-30) — kalimat penutup kembali jadi beat terakhir, tertahan sampai
 * bidikan berakhir.
 */
export function PrologueInscriptionInterlude(): ReactElement {
  const stageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const stage = stageRef.current;
      if (!stage) return;
      registerGsap();

      const media = gsap.matchMedia();
      media.add(
        {
          motion:
            "(prefers-reduced-motion: no-preference) and (min-width: 48rem)",
        },
        (context) => {
          if (!context.conditions?.motion) return undefined;

          const targets = Array.from(
            stage.querySelectorAll<HTMLElement>(".interlude-reveal"),
          );
          if (targets.length === 0) return undefined;

          gsap.set(targets, { opacity: 0, y: MOTION.read.y });

          const timeline = gsap.timeline({ paused: true });
          const slot = 1 / targets.length;
          targets.forEach((target, index) => {
            const start = index * slot;
            const fadeIn = slot * 0.32;
            const hold = slot * 0.38;
            const fadeOut = slot * 0.22;
            timeline.to(
              target,
              { opacity: 1, y: 0, ease: MOTION.scrubEase, duration: fadeIn },
              start,
            );
            // Beat terakhir tetap terbaca sampai bidikan berakhir — tidak pergi.
            if (index < targets.length - 1) {
              timeline.to(
                target,
                {
                  opacity: 0,
                  y: -MOTION.read.y,
                  ease: MOTION.scrubEase,
                  duration: fadeOut,
                },
                start + fadeIn + hold,
              );
            }
          });

          const trigger = ScrollTrigger.create({
            trigger: stage,
            start: "top top",
            end: "+=550%",
            pin: true,
            pinSpacing: true,
            scrub: 0.5,
            invalidateOnRefresh: true,
            animation: timeline,
          });

          return () => {
            trigger.kill();
            timeline.kill();
            gsap.set(targets, { clearProps: "all" });
          };
        },
      );

      return () => media.revert();
    },
    { scope: stageRef },
  );

  return (
    <section
      className="interlude-scene"
      aria-label="Bukti prasasti nama Kadiri"
    >
      <div className="interlude-stage" ref={stageRef}>
        <div className="interlude-frame">
          <div className="interlude-reveal interlude-intro-group">
            <p className="interlude-eyebrow">{INSCRIPTION_INTERLUDE_EYEBROW}</p>
            <p className="interlude-intro">{INSCRIPTION_INTERLUDE_INTRO}</p>
          </div>
          <ol className="interlude-evidence">
            {INSCRIPTION_EVIDENCE.map((item) => (
              <li className="interlude-card interlude-reveal" key={item.source}>
                <span className="interlude-card-tag">{item.tag}</span>
                {item.quote ? (
                  <p className="interlude-quote">{item.quote}</p>
                ) : null}
                {item.body ? (
                  <p className="interlude-body">{item.body}</p>
                ) : null}
                <p className="interlude-source">
                  {item.source} — {item.date}
                </p>
              </li>
            ))}
          </ol>
          <p className="interlude-outro interlude-reveal">
            {INSCRIPTION_INTERLUDE_OUTRO}
          </p>
        </div>
      </div>
    </section>
  );
}
