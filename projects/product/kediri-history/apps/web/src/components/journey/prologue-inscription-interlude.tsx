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
  debugMarkers,
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
 * Scrub adalah pilihan yang disengaja: bukti diletakkan pada tempo pembaca.
 *
 * Identitas gerak (audit 2026-09-03): tiap kartu bukti masuk lewat SAPUAN
 * CLIP-PATH dari bawah — batu demi batu diletakkan — lalu pergi lewat fade
 * naik. Ini satu-satunya section yang memakai wipe sebagai entrance utama,
 * berbeda dari kredit Prolog (blur) sebelumnya dan topeng baris kartu judul
 * Babak I sesudahnya. Pin dipendekkan 550% → 420% supaya kanvas hitam tidak
 * menyisakan gulir kosong (§ G13 audit).
 *
 * Video pembuka meredup lewat tweak `prologueReveal` di `scenes.ts` (Jam 1
 * shot itu sendiri), bukan di sini — bidikan ini hanya mengurus panggung
 * gelapnya sendiri.
 *
 * Mobile dan reduced-motion tidak pernah dipin/di-scrub: seluruh konten
 * tampak statis dalam alur dokumen, konsisten dengan kontrak aksesibilitas
 * situs ("keadaan baca adalah DOM hasil server-render").
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

          gsap.set(targets, {
            opacity: 0,
            y: MOTION.read.y,
            clipPath: "inset(100% 0 0 0)",
          });

          const timeline = gsap.timeline({ paused: true });
          const slot = 1 / targets.length;
          targets.forEach((target, index) => {
            const start = index * slot;
            const wipe = slot * 0.34;
            const hold = slot * 0.38;
            const fadeOut = slot * 0.2;
            timeline.to(
              target,
              {
                opacity: 1,
                y: 0,
                clipPath: "inset(0% 0 0 0)",
                ease: MOTION.scrubEase,
                duration: wipe,
              },
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
                start + wipe + hold,
              );
            }
          });

          const trigger = ScrollTrigger.create({
            trigger: stage,
            start: "top top",
            end: "+=420%",
            pin: true,
            pinSpacing: true,
            scrub: 0.5,
            invalidateOnRefresh: true,
            markers: debugMarkers(),
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
