import { useEffect } from "react";

/**
 * Marks the fixed header once content has scrolled beneath it so the
 * stylesheet can tighten the logo tile and give the nav pill a shadow.
 * Sets `data-scrolled` on <header>; see src/polish.css.
 */
const THRESHOLD = 24;

export function useHeaderState(rootRef) {
  useEffect(() => {
    const header = rootRef.current?.querySelector("header");
    if (!header) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      header.toggleAttribute("data-scrolled", window.scrollY > THRESHOLD);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [rootRef]);
}
