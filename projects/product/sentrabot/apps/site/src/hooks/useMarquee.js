import { useEffect } from "react";

/**
 * Animate .marquee-module__irIMSq__inner — original used rAF/scroll JS;
 * CSS infinite translate preserves visible marquee motion.
 */
export function useMarquee(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const styleId = "cora-marquee-anim";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes cora-marquee-left {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes cora-marquee-right {
          from { transform: translate3d(-50%, 0, 0); }
          to { transform: translate3d(0, 0, 0); }
        }
      `;
      document.head.appendChild(style);
    }

    const inners = root.querySelectorAll(".marquee-module__irIMSq__inner");
    inners.forEach((el, index) => {
      el.style.transform = "";
      el.style.willChange = "transform";
      el.style.animation = `${
        index % 2 === 0 ? "cora-marquee-left" : "cora-marquee-right"
      } ${90 + index * 15}s linear infinite`;
    });

    return undefined;
  }, [rootRef]);
}
