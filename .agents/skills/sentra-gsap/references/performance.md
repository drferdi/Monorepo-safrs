# GSAP Performance Engineering

## 1. Rendering Priorities

Prefer properties that avoid layout recalculation:

**Preferred:** `x`, `y`, `xPercent`, `yPercent`, `scale`, `rotation`, `opacity/autoAlpha`.

**Treat carefully:** `width`, `height`, `top`, `left`, margin/padding, heavy filters, large shadows, continuously changing clip geometry, and any property that forces repeated layout/paint.

GSAP's CSS documentation recommends its transform aliases (`x`, `y`, etc.) instead of repeatedly parsing transform strings; GSAP also manages `force3D: 'auto'` by default.

## 2. One Property Owner

Never combine CSS transitions with GSAP on the same property/target. This creates competing interpolation and visible lag/jitter.

```css
/* Do not put transition: transform ... on a GSAP-owned card. */
```

## 3. `will-change`

Use narrowly around known expensive motion and remove it afterward. Excessive compositor layers consume memory and can make performance worse.

```ts
gsap.set(target, { willChange: 'transform' });
gsap.to(target, {
  x: 100,
  onComplete: () => gsap.set(target, { willChange: 'auto' }),
});
```

## 4. High-Frequency Input

For pointer/mouse followers, reuse setters/tweens:

```ts
const xTo = gsap.quickTo(cursor, 'x', { duration: 0.2, ease: 'power2.out' });
const yTo = gsap.quickTo(cursor, 'y', { duration: 0.2, ease: 'power2.out' });
```

Avoid allocating a fresh `gsap.to()` on every pointer event unless overwrite/queue behavior is specifically needed.

## 5. ScrollTrigger Cost

ScrollTrigger is efficient when geometry is stable, but architecture can still cause jank:
- too many independently scrubbed scenes
- expensive callbacks every frame
- React/Vue state writes on every update
- repeated refresh calls
- large DOM mutations while scrolling
- layout properties animated inside pinned scenes

Consolidate coordinated motion under scene timelines. Use `ScrollTrigger.update()` for scroll-state synchronization; reserve `refresh()` for geometry changes.

## 6. Media Strategy

### Images
- Set intrinsic width/height or `aspect-ratio` to prevent CLS.
- Eager-load only the media needed for first-view/intro choreography.
- Lazy-load below-fold media.
- Decode/compress large hero assets before relying on them in precise ScrollTrigger measurement.

### Video
- Compress bitrate aggressively enough for target devices/networks.
- Avoid multiple autoplay videos competing for decode bandwidth.
- Use poster images when the first frame is not guaranteed ready.

### Image sequences
Hundreds of frames should not mean hundreds of visible DOM `<img>` nodes. Preload/decode strategically and render the active frame to Canvas.

### WebGL
Use WebGL for true 3D, shaders, particles, or very large graphical scene complexity—not as a prestige dependency. Synchronize one render loop with GSAP/scroll state rather than layering independent RAF loops.

## 7. Typography Cost

Split only the units that will animate. Character splitting across large bodies of text can explode DOM count. For lines, wait for fonts or use SplitText `autoSplit` + `onSplit` so reflow is handled correctly.

Avoid `text-wrap: balance` on text whose line boundaries SplitText must control.

## 8. Smooth Scroll Cost

Native scroll is the performance baseline. Add smoothing only after measuring.

ScrollSmoother transforms one content layer on top of native scroll. Lenis documents GSAP ticker synchronization, but also lists Safari frame-rate limits, iframe wheel limitations, nested-scroll considerations, and older-iOS touch caveats. Those are QA requirements, not footnotes.

## 9. Profiling Workflow

Use Chrome DevTools Performance on representative scenes:
1. Record load → hero intro.
2. Record fastest realistic scroll through pinned scenes.
3. Record pointer-heavy interaction.
4. Inspect long tasks, frames, layout, paint, scripting, and memory.
5. Disable one subsystem at a time (smooth scroll, blur, media, WebGL, SplitText, parallax) to isolate cost.
6. Repeat on a real mid-range phone.

Target a stable 60 fps experience as the baseline. 120 Hz support is desirable for light interactions on capable displays, not a universal architectural assumption.

## 10. Common Root Causes

| Symptom | Typical cause |
|---|---|
| dropped frames during pin | paint-heavy effect, huge media, layout animation |
| high CPU on scroll | many callbacks/state writes, multiple RAF loops |
| slow startup | too many plugins/scenes/media initialized immediately |
| trigger drift | images/fonts change layout after measurement |
| memory growth after navigation | missing context/ticker/listener/ScrollTrigger cleanup |
| hover lag | CSS transition fighting GSAP or tween accumulation |
