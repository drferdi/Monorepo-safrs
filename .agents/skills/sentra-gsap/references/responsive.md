# Responsive Motion & Accessibility

## 1. Principle

Responsive motion is not desktop motion scaled down. Layout, input modality, viewport behavior, battery/CPU budget, and motion sensitivity change the appropriate choreography.

Use CSS media queries for layout and `gsap.matchMedia()` for animation lifecycle/behavior.

## 2. MatchMedia Pattern

`ScrollTrigger.matchMedia()` is deprecated; use `gsap.matchMedia()`.

```ts
const mm = gsap.matchMedia();

mm.add({
  desktop: '(min-width: 1024px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  mobile: '(max-width: 767px)',
  reduce: '(prefers-reduced-motion: reduce)',
  coarse: '(pointer: coarse)',
}, (context) => {
  const { desktop, tablet, mobile, reduce, coarse } = context.conditions!;

  if (reduce) {
    // functional states / short fades only
    return;
  }

  if (desktop && !coarse) {
    // richer pin/parallax/pointer interactions
  } else if (tablet) {
    // shorter, simpler scene
  } else if (mobile) {
    // native vertical reading and minimal pinning
  }
});

// owner cleanup
mm.revert();
```

GSAP automatically records and reverts animations/ScrollTriggers created inside active matchMedia handlers.

## 3. Device Strategy

### Desktop / fine pointer
Can support richer pinned narratives, subtle parallax, horizontal chapters, custom cursor, and layered typography—subject to profiling.

### Tablet
Reduce concurrent layers, pin length, parallax distance, and pointer-specific affordances. Test both orientations.

### Mobile / coarse pointer
Prefer native vertical flow. Minimize pinning, remove cursor systems, reduce text travel and stagger depth, avoid decorative horizontal-scroll traps, and keep touch response direct.

## 4. Reduced Motion

`prefers-reduced-motion` is a first-class motion condition.

Disable/rework:
- smooth scrolling
- long scrub sequences
- large spatial travel/rotation
- ambient infinite movement
- heavy parallax
- nonessential pinning
- kinetic text that disrupts reading order

Retain:
- immediate state changes
- short opacity fades where useful
- focus/press feedback
- functional visibility changes

Motion cannot be the sole carrier of information.

If a smooth-scroll library offers a version-specific reduced-motion option, verify it against the installed version; do not rely on undocumented options. The robust fallback is to not instantiate smoothing under the reduced-motion condition.

## 5. Mobile Viewport Stability

Dynamic browser chrome can change viewport height repeatedly. For pinned scenes whose geometry should remain stable, prefer `svh` or a static calculated fallback over depending on continuous `dvh` changes.

Where validated:

```ts
ScrollTrigger.config({ ignoreMobileResize: true });
```

This is not permission to ignore real orientation/layout changes; explicitly test them and refresh when actual geometry changes.

## 6. `normalizeScroll()`

Use `ScrollTrigger.normalizeScroll(true)` only for documented jitter/synchronization problems that justify putting more scroll handling on the JS thread. It is not standard boilerplate.

## 7. SplitText Responsiveness

Line splitting is geometry-sensitive. Modern SplitText can re-split when fonts load or width changes via `autoSplit`; create the animation inside `onSplit()` and return it so SplitText can clean/rebuild correctly.

For nested links/interactive content, default SplitText ARIA may hide inner semantics. Use a screen-reader-only semantic copy and a visual `aria-hidden` animated copy when needed.

## 8. Touch and Hover

Never make an interaction depend on hover. Use `pointer: fine/coarse`, keyboard focus, and touch behavior explicitly. A custom cursor is decorative enhancement only.

## 9. Resize / Orientation QA

For each responsive breakpoint verify:
- resize across breakpoint and back repeatedly
- portrait ↔ landscape
- browser address bar expansion/collapse
- page entered at non-zero scroll position
- route away/back
- fonts loaded slowly
- hero media loaded slowly
- reduced motion toggled then `gsap.matchMediaRefresh()` if application preference changes at runtime

The correct result is not merely “no exception”; it is clean reverted styles, no duplicate triggers, and sensible choreography for the new condition.
