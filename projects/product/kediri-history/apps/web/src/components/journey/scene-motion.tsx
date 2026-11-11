"use client";

import { useGSAP } from "@gsap/react";
import type { ReactElement, ReactNode } from "react";
import { useRef } from "react";
import type { MotionVariant } from "../../modules/motion/index";
import { attachScene, gsap, registerGsap } from "../../modules/motion/index";

/**
 * Island motion untuk satu scene.
 *
 * Ia membungkus HTML scene yang sudah dirender server dengan `display: contents`
 * sehingga tidak menambah satu pun kotak layout — sejarahnya tetap markup yang
 * sama, dan komponen ini hanya menempelkan gerak di atasnya. Tidak ada teks
 * yang dibuat di sini.
 *
 * Empat varian, empat desain (Sentra-GSAP responsive; UX Bible bagian 26 dan
 * 28). Mobile bukan desktop yang dikecilkan, dan reduced motion bukan versi
 * rusak. `gsap.matchMedia` memilih satu varian dan mengembalikan pembersihnya;
 * pemilik scene yang memiliki teardown-nya, sehingga tidak ada ScrollTrigger
 * yatim ketika rute berganti.
 */
export function SceneMotion({
  choreographyKey,
  children,
}: {
  readonly choreographyKey: string;
  readonly children: ReactNode;
}): ReactElement {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;
      registerGsap();

      const media = gsap.matchMedia();
      media.add(
        {
          reduced: "(prefers-reduced-motion: reduce)",
          mobile:
            "(prefers-reduced-motion: no-preference) and (max-width: 47.999rem)",
          tablet:
            "(prefers-reduced-motion: no-preference) and (min-width: 48rem) and (max-width: 63.999rem)",
          desktop:
            "(prefers-reduced-motion: no-preference) and (min-width: 64rem)",
        },
        (context) => {
          const conditions = context.conditions as
            | Record<MotionVariant, boolean>
            | undefined;
          const variant: MotionVariant = conditions?.reduced
            ? "reduced"
            : conditions?.mobile
              ? "mobile"
              : conditions?.tablet
                ? "tablet"
                : "desktop";
          // Nilai balik ini adalah pembersih varian: GSAP memanggilnya ketika
          // kondisi media berubah atau konteks di-revert.
          return attachScene({ root: element, variant }, choreographyKey);
        },
      );

      return () => media.revert();
    },
    { scope: root, dependencies: [choreographyKey] },
  );

  return (
    <div ref={root} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
