"use client";

import { useGSAP } from "@gsap/react";
import type { ReactElement } from "react";
import { useRef } from "react";

import { attachBrantasThread } from "../../modules/motion/brantas-thread";
import { gsap, registerGsap } from "../../modules/motion/gsap";

/** Lapisan dekoratif: garis statis tetap ada pada mobile/reduced. */
export function BrantasVisualThread(): ReactElement {
  const root = useRef<SVGSVGElement>(null);

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
          desktopTablet:
            "(prefers-reduced-motion: no-preference) and (min-width: 48rem)",
        },
        (context) => {
          const conditions = context.conditions as
            | { desktopTablet?: boolean }
            | undefined;
          return conditions?.desktopTablet
            ? attachBrantasThread(element)
            : undefined;
        },
      );
      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <svg
      ref={root}
      className="brantas-visual-thread"
      data-brantas-thread="true"
      aria-hidden="true"
      viewBox="0 0 184 100"
      preserveAspectRatio="none"
    >
      <path
        className="brantas-visual-thread__static"
        data-brantas-path="true"
        d="M 0 58 C 18 47 34 61 51 55 C 68 49 82 49 96 53 C 109 57 122 55 134 45 C 144 37 153 30 164 27 C 171 25 177 24 184 24"
      />
    </svg>
  );
}
