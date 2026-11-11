"use client";

import { useGSAP } from "@gsap/react";
import { exposeMotionDebug, registerGsap } from "../../modules/motion/gsap";
import { attachRefreshGate } from "../../modules/motion/refresh";

/**
 * Mounted once on the Journey page. Owns the ScrollTrigger refresh gate
 * (fonts + critical media) and, behind the debug flag only, the
 * `window.__kediriMotion` inspection handle. Renders nothing.
 *
 * Both run inside the effect, never during render, so server and client
 * markup stay identical (hydration contract).
 */
export function MotionRefreshGate(): null {
  useGSAP(() => {
    registerGsap();
    exposeMotionDebug();
    return attachRefreshGate();
  });
  return null;
}
