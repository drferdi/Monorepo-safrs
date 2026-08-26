# ScrollTrigger Patterns

## 1. Fundamental Model

ScrollTrigger maps scroll geometry to callbacks or an animation playhead. First build the animation so it works independently; only then connect it to scroll.

For a coordinated sequence, place ScrollTrigger on the parent timeline rather than giving child tweens independent scroll controllers.

```ts
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: section,
    start: 'top 75%',
    end: 'bottom 25%',
    toggleActions: 'play none none reverse',
  },
});

tl.from(title, { y: 36, autoAlpha: 0 })
  .from(media, { scale: 1.05, autoAlpha: 0 }, '<0.1');
```

## 2. Start / End

Use markers during development.

```ts
scrollTrigger: {
  trigger: section,
  start: 'top 80%',
  end: 'bottom 20%',
  markers: process.env.NODE_ENV === 'development',
}
```

If geometry is dynamic, use function values and `invalidateOnRefresh` when animation values also need recalculation.

```ts
end: () => `+=${section.offsetHeight * 1.5}`,
invalidateOnRefresh: true,
```

## 3. Initialization Order

Create triggers top-to-bottom so upstream pins are measured before downstream scenes. `ScrollTrigger.refresh()` recalculates in creation order. Use `refreshPriority` only for legitimate non-document-order dependencies.

If DOM changes immediately before refresh, `ScrollTrigger.refresh(true)` can defer until the browser has rendered the change.

## 4. Scrub

Scrub means scroll position is the controller. Use linear animation ease for deterministic mapping.

```ts
gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: {
    trigger: section,
    start: 'top top',
    end: '+=1800',
    scrub: 1,
  },
});
```

Do not combine a scrubbed child with a conflicting parent timeline playhead.

## 5. Pinning

Pin when a narrative scene stays conceptually fixed while its internal state evolves.

```ts
scrollTrigger: {
  trigger: section,
  start: 'top top',
  end: '+=2200',
  pin: true,
  scrub: 1,
}
```

Default `pinSpacing` preserves document flow. Disable it only when the layout intentionally supplies its own spacing.

Avoid animating the element whose geometry ScrollTrigger is using as the trigger/pin. Prefer:

```text
<section class="scene">        ← measured trigger
  <div class="scene__inner">   ← animated content
```

## 6. Horizontal Storytelling

```ts
const horizontal = gsap.to(track, {
  x: () => -(track.scrollWidth - innerWidth),
  ease: 'none',
  scrollTrigger: {
    trigger: wrap,
    start: 'top top',
    end: () => `+=${track.scrollWidth}`,
    pin: true,
    scrub: 1,
    invalidateOnRefresh: true,
  },
});

ScrollTrigger.create({
  trigger: card,
  containerAnimation: horizontal,
  start: 'left 80%',
});
```

`containerAnimation` requires the horizontal movement to be linear. Child triggers using `containerAnimation` cannot themselves rely on normal pinning/snapping semantics.

## 7. Batch vs Explicit Scene

Use `ScrollTrigger.batch()` for many independent, similar reveal targets. Use a scene timeline when order and overlap communicate hierarchy.

Do not batch merely to reduce code if the elements form a designed narrative sequence.

## 8. Mobile Viewports

Address-bar changes can trigger repeated mobile resize/refresh behavior. Prefer stable CSS viewport units (`svh`) for sections whose geometry should not track every browser-chrome change.

When appropriate:

```ts
ScrollTrigger.config({ ignoreMobileResize: true });
```

For severe iOS/native-scroll synchronization issues, `ScrollTrigger.normalizeScroll(true)` may help, but it moves more scroll handling onto JavaScript and should be an evidence-based opt-in.

## 9. Smooth Scroll Integration

### ScrollSmoother
Create it before downstream ScrollTriggers. It uses native page scroll while transforming its content layer to catch up.

### Lenis
Use the documented single ticker integration:

```ts
const lenis = new Lenis();
lenis.on('scroll', ScrollTrigger.update);

const update = (time: number) => lenis.raf(time * 1000);
gsap.ticker.add(update);
gsap.ticker.lagSmoothing(0);

// cleanup
gsap.ticker.remove(update);
lenis.destroy();
```

Do not simultaneously use Lenis `autoRaf` and a GSAP-driven RAF loop. Treat nested scroll, anchors, fixed elements, Safari limits, and touch behavior as explicit QA items.

## 10. Common Failure Matrix

| Symptom | Likely root cause | Corrective action |
|---|---|---|
| Trigger positions drift | fonts/media/layout changed after measurement | reserve dimensions; refresh after stability |
| Downstream trigger starts too early | upstream pin measured later | create top-to-bottom; refresh |
| Pin jumps | measured element is animated or layout changes | separate trigger/inner target; stabilize dimensions |
| Scrub feels nonlinear | non-linear tween ease | use `ease: 'none'` |
| Animation fights itself | nested/conflicting playheads | one scene timeline/controller |
| Mobile refresh storm | dynamic viewport chrome | stable units; ignore small mobile resizes where safe |
| Route return duplicates triggers | missing lifecycle cleanup | context revert/kill route-owned triggers |
| Smooth scroll desync | two RAF loops or missing update bridge | one ticker owner + ScrollTrigger update |
