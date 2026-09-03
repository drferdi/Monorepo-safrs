import { ScrollTrigger } from "./gsap";

/**
 * ScrollTrigger refresh gate.
 *
 * Triggers are created as soon as each island hydrates, which is before
 * fonts have swapped and before lazy media has reported its intrinsic size.
 * Pin distances are svh-based and stable, but act-header media, the prologue
 * continuation video, and late fonts all change document height after the
 * first measurement. `ActHeaderReveal` documented the symptom in the wild
 * (a trigger firing at scrollY 0 because layout had not settled).
 *
 * One owner, mounted once per Journey page, refreshes after:
 *   - `document.fonts.ready`;
 *   - each stage/act media element reporting its size (`load` for images,
 *     `loadedmetadata` for video), for the first few sections only — later
 *     media is lazy and refreshes on its own natural resize;
 *   - the prologue continuation video starting (it swaps the source and can
 *     change the poster box).
 *
 * Refreshes are coalesced through one debounced call so a burst of media
 * events costs a single layout pass.
 */
const DEBOUNCE_MS = 120;
const CRITICAL_MEDIA_COUNT = 4;

export function attachRefreshGate(root: ParentNode = document): () => void {
  let timer: number | undefined;
  let disposed = false;

  const requestRefresh = () => {
    if (disposed) return;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = undefined;
      if (!disposed) ScrollTrigger.refresh();
    }, DEBOUNCE_MS);
  };

  const cleanups: (() => void)[] = [];

  if ("fonts" in document) {
    document.fonts.ready.then(requestRefresh).catch(requestRefresh);
  }

  const media = Array.from(
    root.querySelectorAll<HTMLImageElement | HTMLVideoElement>(
      ".stage-media img, .stage-media video, .act-header-media img, .act-header-media video, .framing-stage img",
    ),
  ).slice(0, CRITICAL_MEDIA_COUNT);

  for (const element of media) {
    if (element instanceof HTMLImageElement) {
      if (element.complete) continue;
      element.addEventListener("load", requestRefresh, { once: true });
      cleanups.push(() => element.removeEventListener("load", requestRefresh));
    } else {
      if (element.readyState >= 1) continue;
      element.addEventListener("loadedmetadata", requestRefresh, {
        once: true,
      });
      cleanups.push(() =>
        element.removeEventListener("loadedmetadata", requestRefresh),
      );
    }
  }

  const onContinuation = () => requestRefresh();
  window.addEventListener(
    "kediri:prologue-continuation-started",
    onContinuation,
  );
  cleanups.push(() =>
    window.removeEventListener(
      "kediri:prologue-continuation-started",
      onContinuation,
    ),
  );

  return () => {
    disposed = true;
    if (timer) window.clearTimeout(timer);
    for (const cleanup of cleanups) cleanup();
  };
}
