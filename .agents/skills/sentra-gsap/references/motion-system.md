# Motion System

These values are project recommendations, not GSAP API defaults. Tune by prototype, but keep one coherent grammar.

## 1. Motion Tokens

```ts
export const motion = {
  duration: {
    micro: 0.18,
    interaction: 0.28,
    reveal: 0.62,
    major: 0.86,
    cinematic: 1.1,
  },
  stagger: {
    ui: 0.055,
    word: 0.04,
    char: 0.018,
  },
  ease: {
    enter: 'power3.out',
    exit: 'power2.in',
    move: 'power2.inOut',
    direct: 'none',
  },
};
```

Use CustomEase only when a distinctive branded curve adds real value. Do not invent a new easing for every section.

## 2. Motion Grammar

### Entrance
Default language: modest transform + opacity.

```ts
gsap.from(target, {
  y: 32,
  autoAlpha: 0,
  duration: motion.duration.reveal,
  ease: motion.ease.enter,
});
```

Avoid combining translation + scale + rotation + blur + skew by default.

### Exit
Shorter and less theatrical than entrance unless a route transition concept requires otherwise.

### Interaction feedback
Buttons/cards should acknowledge hover/press quickly. Keep travel small and preserve hit-target geometry.

### Scroll scrub
Treat scroll as direct input: `ease: 'none'`. The scroll curve already controls time.

## 3. Timeline Composition

Use labels and the position parameter instead of scattered delays.

```ts
const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

tl.addLabel('intro')
  .from(kicker, { y: 16, autoAlpha: 0, duration: 0.45 })
  .from(title, { y: 52, autoAlpha: 0, duration: 0.8 }, '-=0.2')
  .addLabel('content')
  .from(copy, { y: 24, autoAlpha: 0, duration: 0.55 }, '-=0.35');
```

Use stagger for related peers; use explicit timeline placement for hierarchy.

## 4. Typography

Choose the lowest split granularity needed:
- lines → editorial reveals
- words → rhythm/readability
- chars → expressive display typography only

Modern SplitText supports `mask`, `autoSplit`, `onSplit`, built-in ARIA handling, and `revert()`.

```ts
SplitText.create(title, {
  type: 'lines,words',
  mask: 'lines',
  autoSplit: true,
  onSplit(self) {
    return gsap.from(self.words, {
      yPercent: 105,
      autoAlpha: 0,
      stagger: 0.035,
      duration: 0.75,
      ease: 'power3.out',
    });
  },
});
```

If split text contains interactive nested elements, do not assume the default ARIA strategy preserves those semantics. Use an accessible duplicate/visual-only copy pattern where required.

## 5. Image Motion

Preferred primitives:
- overflow/clip wrapper + inner image transform
- scale 1.05 → 1
- subtle yPercent parallax
- clip-path/mask when the reveal concept needs shape

Do not animate image width/height continuously to simulate zoom.

## 6. SVG Motion

- Move/scale/rotate `<g>` groups where possible.
- DrawSVG for purposeful line construction.
- MorphSVG when two shapes need a meaningful transformation.
- MotionPath for actual path-following movement.
- Optimize SVG before animation; remove unnecessary path complexity.

## 7. Cursor / Pointer Motion

Desktop pointer-follow interactions should use `quickTo()` or equivalent reused setters, not allocate a new tween object on every pointer event.

Never make a custom cursor the only hover/focus indication. Disable cursor-specific experiences on touch.

## 8. Page Transition Language

Transitions should reinforce spatial/navigation logic. A simple robust system is:
1. input lock
2. outgoing content short exit
3. overlay/brand layer covers viewport
4. route switches behind cover
5. geometry stabilizes
6. overlay reveals incoming route
7. input unlock

Keep route transitions short enough that navigation still feels immediate.

## 9. Loader Language

A loader must correspond to actual asset readiness. Use progress only when measurable. Prefer a short intro handoff over an artificial 2–4 second cinematic wait on every visit.

## 10. Restraint Rules

Before adding any effect ask:
1. What attention or narrative purpose does it serve?
2. Is the same information readable without it?
3. Does it compete with another active motion?
4. Is the mobile version still useful?
5. Can one simpler transform communicate the same intent?
