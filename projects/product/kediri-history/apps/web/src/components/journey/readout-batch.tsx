"use client";

import { useGSAP } from "@gsap/react";

import {
  debugMarkers,
  EASES,
  gsap,
  registerGsap,
  ScrollTrigger,
} from "../../modules/motion/index";

/**
 * Strip arsip (`.scene-readout`, 26×) — elemen berulang, maka
 * `ScrollTrigger.batch()`: satu entrance lembut per strip, dipicu SEKALI
 * (`once`), tidak pernah diputar ulang. Bukti bukan pertunjukan.
 *
 * Hanya strip yang berada DI BAWAH viewport saat pemasangan yang
 * disembunyikan lebih dulu. Pendaratan tautan dalam ke tengah halaman
 * meninggalkan strip-strip di atasnya sudah "terlewati" — `onEnter` tidak
 * akan pernah menyala untuk mereka, dan menyembunyikannya berarti strip itu
 * transparan selamanya saat pengunjung menggulir naik.
 *
 * Mobile dan reduced-motion: tanpa timeline, strip tampil apa adanya.
 */
export function ReadoutBatch(): null {
  useGSAP(() => {
    registerGsap();
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference) and (min-width: 48rem)",
      () => {
        const readouts = Array.from(
          document.querySelectorAll<HTMLElement>(".scene-readout"),
        );
        if (readouts.length === 0) return undefined;

        const below = readouts.filter(
          (readout) => readout.getBoundingClientRect().top > window.innerHeight,
        );
        gsap.set(below, { opacity: 0, y: 18 });

        // `markers` tidak ada di kontrak `batch()`; marker debug diberikan
        // lewat konfigurasi default sesaat, lalu dikembalikan.
        const previousDefaults = ScrollTrigger.defaults({}) as {
          markers?: boolean;
        };
        if (debugMarkers()) ScrollTrigger.defaults({ markers: true });
        const triggers = ScrollTrigger.batch(below, {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: EASES.read,
              stagger: 0.08,
              overwrite: true,
            }),
        });
        if (debugMarkers()) {
          ScrollTrigger.defaults({
            markers: previousDefaults.markers ?? false,
          });
        }

        return () => {
          for (const trigger of triggers) trigger.kill();
          gsap.set(below, { clearProps: "all" });
        };
      },
    );
    return () => media.revert();
  });
  return null;
}
