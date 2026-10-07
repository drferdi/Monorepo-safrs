# Sentraverse neural journey

The homepage follows the approved biological-origin-to-ecosystem brief. Its fifteen narrative
beats include the five division discoveries, in the exact requested order. Existing product,
story, insights, legal, and proxy routes remain available. The final CTA opens `/ekosistem`.

## Ownership and animation

- `components/neural/NeuralJourney.tsx` owns the semantic narrative, navigation, optional audio,
  and client lifecycle. The server page supplies homepage metadata.
- `story.ts` owns chapter boundaries and exact division names. A single GSAP ScrollTrigger pins
  the viewport and scrubs a 100-unit master timeline; named child timelines reveal each chapter.
  Desktop uses 900vh of scroll travel; mobile uses 800vh. The stage adds one viewport.
- `geometry.ts` builds seeded, irregular neuronal arbors, progenitor cells, anatomical nerve
  pathways, myelin, synaptic membranes, and a network with detailed foreground neurons and
  thousands of inexpensive distant neurons. These are artistic scientific representations,
  not patient imaging, a validated anatomical atlas, or clinical decision logic.
- `renderer.ts` batches points and lines into capsule-owned WebGL buffers. A perspective shader
  controls camera translation, rotation, growth, fog, and asynchronous illumination. Native
  WebGL avoids adding Three.js solely for this small renderer. Geometry and buffers are created
  only when their scene is first needed. There are no external models, textures, or CDN scripts.
- GSAP's ticker is the only continuous visual scheduler. Rendering stops when the document is
  hidden and skips drawing outside the journey. Buffer, shader, listener, observer, tween, and
  ScrollTrigger lifetimes are cleaned up. No new product dependencies were installed.

## Accessibility and failure behavior

- `gsap.matchMedia()` rebuilds the experience at the 768px breakpoint and when the OS reduced
  motion preference changes. Reduced motion and Read the story use normal document flow,
  static scene samples, no pinned timeline, and readable semantic chapters.
- Mobile reduces geometry, caps device pixel ratio at 1.25, draws at 30fps maximum, removes
  camera banking and cursor effects, and adds a text contrast gradient.
- WebGL initialization failure or context loss switches to Canvas 2D. If neither canvas context
  is available, the semantic text remains and no face is drawn (`data-face="unavailable"`).
  Without JavaScript, every chapter and the ecosystem destination are server-rendered in a
  linear layout.
- Sound starts OFF. Web Audio is constructed only on an explicit click, suspends when hidden,
  and closes on unmount. Cursor and magnetic CTA effects are desktop-only. The native cursor
  remains available. Navigation is keyboard accessible and a skip link opens the readable view.
- The legacy wheel interceptor is omitted only on `/`; GSAP smooths the animation playhead
  while wheel, touch, keyboard, and scrollbar input retain native behavior.

## Tactile depth and the neural face

- The journey ends on one human face, the founder's, drawn by the same renderer as every other
  scene: `public/neural-face.webp` (a 240 px grayscale copy of the portrait, never displayed)
  is read once through a 2D canvas (`face.ts` `loadPixels`), `analyseFace` turns its pixels
  into Sobel contour segments and brightness-weighted dots, `geometry.ts` `makeFace` builds
  them in the renderer's vertex format (three units wide, brighter pixels nearer the camera,
  grown outward from the centre), and `renderer.ts` draws the `face` layer from phase 93 to
  the right of the final chapter's text (above it on phones). `main[data-face]` reads `ready`
  or `unavailable`; the chapter text never depends on it. The body silhouette and the
  final-scene nervous-system draw are gone; chapter 03 keeps its anatomical drawing.
- On desktop without reduced motion the face turns up to ±0.22 rad toward the pointer and the
  points near it brighten: `tactile.ts` `faceLook` maps the pointer onto the face plane, and
  `NeuralJourney.tsx` eases `turn` and `hover` with `gsap.quickTo` on a plain look object.
- Each chapter section is a `perspective: 1000px` container and its content block preserves 3D.
  `tactile.ts` holds the pure maths (normalised pointer, speed gain, tilt, magnet pull, face
  look), covered by `tactile.test.mjs`; `face.test.mjs` covers the analysis and `makeFace`.
  `wake.ts` wires the pointer: the active chapter's `[data-marker-copy]` block leans up to 3°,
  the CTA is pulled 18 % toward the pointer and grows 4 %, buttons lift 2 px. Tracking uses
  `gsap.quickTo`; releases use `elastic.out(1, .3)`, after which trackers are rebuilt.
- Only `x, y, z, rotationX, rotationY, scale, autoAlpha` are animated. The wake is desktop-only
  (no touch, no phones, no reduced motion) and its detach kills its tweens and clears the inline
  transforms, so reading mode starts from clean elements.

## Verification

Run from this capsule:

```text
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run deploy:dry-run
```

`node scripts/pnpm.mjs run test` runs the node:test files, including `components/neural/tactile.test.mjs`
and `components/neural/face.test.mjs`. The Playwright suite in `e2e/neural.spec.ts` covers
reverse navigation, all five divisions, the face at the final chapter, mobile overflow and the
CTA in view, OS reduced-motion changes, context loss, clean reading-mode transforms, missing
WebGL, no canvas context at all, JavaScript-disabled reading, pin cleanup, connected-region
navigation, and frame timing. `e2e/smoke.spec.ts` keeps
the public-route checks and updates the old waiting-list assertion to the new ecosystem CTA.
Point `PLAYWRIGHT_BASE_URL` at a running local preview, then run:

```text
node scripts/pnpm.mjs exec playwright test e2e/neural.spec.ts e2e/smoke.spec.ts --workers=1
```

Frame samples are local evidence, not a guarantee of 60fps on every GPU. Production deployment,
Safari/iOS device testing, and final anatomical/art-direction review are separate release checks.

Implementation references: [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/),
[WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
