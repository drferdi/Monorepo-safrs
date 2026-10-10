import { flushSync } from "react-dom";

// A short cross-fade for changes that remove or reflow content (dialogs closing, sidebar, panels),
// which CSS alone cannot fade out. Opacity only; reduced motion and older browsers apply the change at once.
export function smooth(update: () => void) {
  if (typeof document.startViewTransition !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { update(); return; }
  document.startViewTransition(() => flushSync(update));
}
