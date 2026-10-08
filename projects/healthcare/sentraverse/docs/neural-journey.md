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
  thousands of inexpensive distant neurons. Since 2026-10-08 every neuron grows from an
  SWC-shaped compartment tree (`makeMorphology`, see "Neuron morphology, lighting and the
  activity cycle"). These are artistic scientific representations, not patient imaging, a
  validated anatomical atlas, or clinical decision logic.
- `renderer.ts` batches points and lines into capsule-owned WebGL buffers. A perspective shader
  controls camera translation, rotation, growth, fog, and asynchronous illumination. Native
  WebGL avoids adding Three.js solely for this small renderer. Geometry and buffers are created
  only when their scene is first needed. The lit layers (the neuron and the network) carry a
  parallel normals buffer and are shaded with a key light, a rim light, occlusion and an
  impulse-only specular. There are no external models, textures, or CDN scripts.
- GSAP's ticker drives every frame, and one paused, repeating GSAP timeline (`signal.ts`)
  schedules the network activity inside it; there is no second animation loop. Rendering stops
  when the document is hidden and skips drawing outside the journey. Buffer, shader, listener, observer, tween, and
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
  them in the renderer's vertex format (three units wide; depth from `faceDepth`, a smooth
  portrait-calibrated relief in source-image coordinates, so lighting, beard and clothing never
  become bumps; grown from the facial features outward along `faceContour`), and `renderer.ts`
  draws the `face` layer twice: in chapter 03
  "A human architecture" (phase 25–40, growing in, swaying, the camera closing in as the signal
  chapter starts) and from phase 93 at the end, each time to the right of the chapter text
  (above it on phones). `tactile.ts` `facePlacement` bends the position and size with the
  viewport so the head stays on screen on portrait tablets and clear of the text on short
  phones. `main[data-face]` reads `ready` or `unavailable`; the chapter text never depends on
  it. The body silhouette, the generic body drawing of chapter 03 and the final-scene
  nervous-system draw are gone.
- At the very end the founder's photograph itself resolves over the drawn face (Chief
  2026-10-08): `public/portrait-ferdi.webp` (1038×1062, not LFS) is rendered by `next/image`
  inside the final chapter (`[data-photo]`), placed by `tactile.ts` `faceBox` in the same box
  the renderer draws the face in (desktop, tablets and phones alike, re-placed on resize), and
  resolves from phase 95.5 to 98.5 feature first (2026-10-08, "portrait realism"): `tactile.ts`
  `portraitState(phase)` gives `relief` (the drawn face settles flat onto the photo plane from
  phase 94.25 to 95.5, and its turn fades with it) and `reveal` (0 → 1 over 95.5 → 98.5);
  `portrait-reveal.ts` `createPortraitReveal` paints the unchanged `next/image` through a
  192 px alpha mask computed from the same `faceContour`/`faceDissolve` field the geometry
  grows along, onto a `<canvas data-photo-reveal>` inside `[data-photo]`, so nose, eyes and
  lips appear before cheeks, hair, jaw and shoulders, and the drawn vertices fade (94 %) where
  the skin has resolved. `[data-photo][data-reveal]` reads `active` (canvas shown, image
  hidden) or `complete` (the image itself, full resolution); the attribute is removed when the
  cinematic build is torn down. The final chapter enters without its 24 px slide so the photo
  stays registered on the drawn face. A radial mask and a slight desaturation blend it with the
  field. In reading mode and without JavaScript the photo sits in the flow beside the text
  (above it on phones); the cinematic placement and the reveal are cleared when the mode changes.
- On desktop without reduced motion the face turns up to ±0.085 rad toward the pointer (chapter
  03 also sways ±0.045 rad; both were ±0.22 and ±0.23 before 2026-10-08) and the
  points near it brighten: `tactile.ts` `faceLook` maps the pointer onto the face plane, and
  `NeuralJourney.tsx` eases `turn` and `hover` with `gsap.quickTo` on a plain look object.
- The chapter text never moves with the pointer (Chief 2026-10-08). `tactile.ts` holds the pure
  maths (magnet pull, face placement, face look), covered by `tactile.test.mjs`; `face.test.mjs`
  covers the analysis and `makeFace`. `wake.ts` wires the pointer to the controls only: the CTA
  is pulled 18 % toward the pointer and grows 4 %, buttons lift 2 px. Tracking uses
  `gsap.quickTo`; releases use `elastic.out(1, .3)`, after which the trackers are rebuilt.
- From the network chapter on, the text sits over bright neurons, so a scrim (`[data-scrim]`,
  the page background at 60 %) fades in over the canvas and under the text at phase 58 and lifts
  again at phase 94 as the face returns; the division chapters and the centered chapters 07
  and 14 also give their text a soft multi-layer `text-shadow` halo (no backdrop shape), and
  the big centered titles sit at 92 % white with a faint light edge so the thin strokes blend
  with the field instead of cutting it.
- Only `x, y, scale, autoAlpha` are animated. The wake is desktop-only (no touch, no phones, no
  reduced motion) and its detach kills its tweens and clears the inline transforms, so reading
  mode starts from clean elements.

## Neuron morphology, lighting and the activity cycle

Points 2, 3 and 4 of the neural-realism spec (Chief 2026-10-08, "Setuju, implementasikan poin 2
sampai 4 sesuai spec"; the spec itself is the git-ignored
`docs/superpowers/specs/2026-10-08-sentraverse-neural-realism-spec.md`). Points 1 (pointer
parallax on the face) and 5 (colour after detail and a shoulder fade in the reveal) are not built.

- Morphology. `geometry.ts` `makeMorphology(seed, size, depth)` returns a compartment tree in the
  Allen Institute SWC shape (type 1 soma, 2 axon, 3 basal dendrite, 4 apical dendrite; a radius
  and a parent index per compartment) and `Tissue.neuron` emits it. Each trunk is a chain of
  7–20 steps (about .13 × size each) whose heading is a persistent random walk, so paths
  meander; it tapers only to 70 % of its root radius and does the bulk of its thinning at the
  splits, as reconstructions do: at a seeded .45–.8 of its nominal length it bifurcates by the
  Rall 3/2 rule (daughter radius = parent radius × share^(2/3), share .55–.75), and most chains
  also shed one or two collaterals part-way (.18–.32 share by the same rule, the chain going on
  thinner), which makes the arbor bushy (the hero has 345 chains and over 200 bifurcations).
  6–9 basal trunks (root radius .05 × size) sweep 270° away from the apical trunk (.075 × size,
  1.8× longer); one axon (.04 × size, 3.4× longer, one branching level shallower) ends in 25–40
  vesicle particles.
- Drawing (Chief 2026-10-08, "fokus pada realistic dan dramatic visual", replacing the spec's
  parallel strands, which read as striped cables). Every compartment is one core line whose
  brightness follows its radius. On neurons of size .5 and up, shafts down to `SHEATH_RADIUS`
  (.008) add a sheath of soft sprites one radius apart (at least .015, sparser at phone density)
  whose size slot is the shaft radius; the tag carries +50 for them and the vertex shader turns
  that world radius into pixels through `u_scale` and the canvas height (`u_height`, 2.8× wide
  because a gaussian sprite reads as solid over about a third of its width, clamped at 120 px),
  so thickness, taper and glow come from area at every chapter's scale (.055 in the synapse
  swarm, .22 in chapter 05, .8 for the daughters, 1.6 for the hero). Their dendrites carry
  spines (tiny points just off the shaft) at desktop density. The soma is a 1:.85:.8 ellipsoid
  of membrane dots at 38 % of the colour over faint world-sized body sprites with a warm amber
  nucleus, so it reads as a translucent cell with a core rather than a white star; the small
  network neurons keep the soma body but no shaft sheath or spines. The Canvas 2D fallback
  skips sheath sprites. `morphology.test.mjs` pins the tree validity, the taper and the Rall
  ratios within one step, the bushiness and tortuosity, the sheath (sizes, lanes, the size
  gate), the soma body, the spines, the normals and the vertex budgets (lines at most 1.3× the
  pre-spec baseline at density .85 and 1.1× at .35; hero points 12k, phone network points 40k).
- Lighting. Lit layers (`makeNeuron`, `makeNetwork`) carry a parallel 4-float normals buffer (a
  unit radial normal from the soma plus a tag); unlit layers receive a constant normal through
  `vertexAttrib4f` and `u_lit = 0`, so their look is unchanged. The vertex shader puts the key
  light at (−.4, .7, .6) with ambient .6 + .55 × facing in a warm (1, .94, .86) tint, a rim
  of pow(1 − |n·eye|, 3) × .35 in cool (.62, .78, 1), occlusion that darkens the far side to
  .7, and a specular pow(32) × .9 only where the pulse or the activity passes. A focus plane at
  the camera distance (`u_focus`) widens and fades points by their distance from it (circle of
  confusion clamped to 0–1, up to +100 % size and −60 % alpha), so distant tissue softens while
  the primary neuron stays sharp.
- Activity. `signal.ts` `createSignalCycle(gsap, signal, { reduced })` builds one paused,
  repeating GSAP timeline that runs six lanes (the five hubs and the network centre), each
  offset .45 s, through the causal chain: the impulse travels the axon 0 → 1 over 1.15 s
  (`power1.in`); on arrival the terminal flashes to 1.6× over .15 s; vesicle release runs 0 → 1
  over .38 s; .09 s later the next lane responds (rise .2 s to a peak re-rolled per repeat in
  .6–1, decay .75 s). The tempo re-rolls in .8–1.25 on every repeat (`repeatRefresh`,
  `onRepeat`). The timeline writes `u_signal[6]` as (impulse, terminal, release, response) per
  lane and the shader keys each vertex by its tag (`lane + 100 × kind`): axon strands light
  where the front passes and flash at the terminal, particles move .35 units along their normal
  and fade in and out with the release, soma and dendrites brighten with the response.
  `NeuralJourney.tsx` plays the cycle only in the synapse-to-network window (phase 49–94);
  `main[data-signal]` reads `active` or `paused`; reduced motion parks it at the first
  terminal; the Canvas 2D fallback draws no particles. `signal.test.mjs` pins the labels, the
  causal chain values, the per-repeat variation and the window.
- Cost (measured 2026-10-08 with the geometry builders): the normals buffer adds 16 bytes per
  lit vertex, about 4.1 MB at density .85 (+29 % over the 14.4 MB of vertex data) and 1.1 MB
  at .35 (+22 %). At density .85 the hero neuron has 6,657 point and 4,892 line vertices (the
  original builder: 3,178 and 17,930) and the network 167,954 and 90,272 (original 149,968 and
  137,056).

## Verification

Run from this capsule:

```text
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run deploy:dry-run
```

`node scripts/pnpm.mjs run test` runs the node:test files, including `components/neural/tactile.test.mjs`,
`face.test.mjs`, `morphology.test.mjs` and `signal.test.mjs`. The Playwright suite in
`e2e/neural.spec.ts` covers the WebGL renderer staying active (a shader that fails to link
would fall back to Canvas 2D silently), the activity cycle playing only in the network window
and parking under reduced motion,
reverse navigation, all five divisions, the drawn face and the photograph at the final chapter
(feature-first alpha of the reveal canvas, exact reversal, the full image at the end, a late
image load, a phone resize, and reading mode and no canvas context), mobile overflow and the
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
