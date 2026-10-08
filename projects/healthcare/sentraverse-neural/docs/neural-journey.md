# Sentraverse neural journey

The journey is its own site (split out of `sentraverse` on 2026-10-09) and follows the approved
biological-origin-to-ecosystem brief. Its fifteen narrative beats include the five division
discoveries, in the exact requested order. The pages it points to (story, ecosystem, privacy,
terms) live on sentrahai.com and are linked through `sentra(path)` in `story.ts`; the final CTA
opens `https://sentrahai.com/ekosistem`.

## Ownership and animation

- `components/neural/NeuralJourney.tsx` owns the semantic narrative, navigation, optional audio,
  and client lifecycle. The server page supplies homepage metadata.
- `story.ts` owns chapter boundaries and exact division names. `timeline.ts` builds the master
  (`buildMaster`): a single GSAP ScrollTrigger pins the viewport and scrubs its 131.5 units; named
  child timelines (`scene-<id>`) reveal each chapter; the chapter buttons and the hash aliases
  jump with ScrollTrigger `labelToScroll` to the `<id>-enter` labels (phase + 1.5). The master
  is authored in phases and mapped to time through the `tempo` table (`phaseToTime`), which
  stretches the dwell on the face (phase 25–40 → 22.5–41), the network (58–66 → 57–67) and the
  ending (94–100 → 91.5–100) and keeps the rest linear; the e2e helper and the capture scripts
  scroll through the same mapping. `timeline.test.mjs` fails if any scene pushes the master past
  `MASTER_DURATION` (131.5). The travel is .09 viewport per unit on desktop (about 11.8
  viewports) and .08 on phones (about 10.5). The stage adds one viewport.
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
  scene: `public/neural-face.webp` (a 480×480 grayscale copy of the 2026-10-08 half-body portrait,
  alpha composited on black with a luminance floor, never displayed)
  is read once through a 2D canvas (`face.ts` `loadPixels`), `analyseFace` turns its pixels
  into Sobel contour segments and brightness-weighted dots, `geometry.ts` `makeFace` builds
  them in the renderer's vertex format (three units square; depth from `faceDepth`, a smooth
  relief calibrated to the portrait landmarks (nose .486/.30, eyes .425 and .545 at .235, lips,
  chin, shoulders) in source-image coordinates, so lighting, beard and clothing never become
  bumps; grown from the facial features outward along `faceContour`), and `renderer.ts`
  draws the `face` layer twice (since 2026-10-08 as a half-body bust: head, shoulders and
  folded arms, because one source drives both the drawing and the photograph): in chapter 03
  "A human architecture" (phase 25–40, growing in, swaying, the camera closing in as the signal
  chapter starts) and from phase 93 at the end, each time to the right of the chapter text
  (above it on phones). `tactile.ts` `facePlacement` bends the position and size with the
  viewport (scale .55 below aspect 1.2, 1 up to 1.45, 1.2 on wide desktops) so the head stays
  on screen on portrait tablets and clear of the text on short phones. `main[data-face]` reads `ready` or `unavailable`; the chapter text never depends on
  it. The body silhouette, the generic body drawing of chapter 03 and the final-scene
  nervous-system draw are gone.
- The ending is THE LEGACY (Chief 2026-10-09, "film chapter"; see that entry in
  `DECISIONS.md`): after the SENTRA chapter the neural field dissolves into the founder's film.
  The final chapter, phases 94–100 over 40 of the master's 131.5 units, is `LegacyScene.tsx`
  (`[data-legacy]`): a void, the film box `[data-film]` (the film's last frame as the
  `next/image` still poster with a `<canvas data-film-canvas>` over it) and a vignette, complete
  by `legacy.module.css` alone for reading mode and the no-JavaScript page. `timeline.ts`
  `legacyScene` runs three labelled beats from the `legacy` knobs: `dissolve` ("The human
  behind the system" over the last of the field at 94.5, then the void closes over the canvases
  from 94.6 to 96 while the film fades in to .85 from 95 to 96.2, so the one blends into the
  other with no black between; the canvases stop drawing at `covered` 96), `film` (a plain
  clock `{ time }` tweened without easing from 0 to the clip's 10.1 s between 95.8 and 99, whose
  `onUpdate` hands the clip time to `film.ts`, which draws that time's frame into the canvas:
  GSAP's image-sequence pattern, 120 WebP frames at 12 fps in `public/legacy-film/v1/`, extracted
  from the clip in Chrome by `scripts/legacy-film/extract.mjs`, because the clip has a single
  keyframe and a seeked `<video>` costs up to ~220 ms a frame; nothing loads until the story
  reaches the network chapter (phase 60, about five viewports before the film; Chief 2026-10-09:
  pay for the film only on the way to it), then frame 0 and frame 119 first and the rest in
  order, six at a time, one retry each, a failed frame recorded in `data-missing`; a frame not yet
  loaded is stood in for by the nearest loaded one; the folder is versioned and served
  `immutable` (`next.config.mjs`), so a re-export goes into a new folder with `FILM.version`; the
  last frame holds to 100) and `legacy` (the title, "Every universe begins with a vision.", the signature, the brand
  line and the way on, from 99). The film stands large: its box is the clip's width to 92 % of
  its height (the watermark at the foot of the source is cropped by `object-position: 50% 0`),
  `min(88cqh, 994px, 94cqw × 1016/832)` tall on wide screens (near native, capped by the stage),
  92 cqw wide on phones, right of centre on screens from 1024 px so the words have the left,
  centred below; its edges dissolve into the void under a top and bottom fade and a radial
  falloff, and its grade is `brightness(.6) contrast(1.05) saturate(.55)` (the clip's own world
  kept, darkened: "jangan terlalu terang"). The poster is hidden in cinematic mode and the
  canvas outside it, so the shared mask never doubles; `settleLegacy` clears what the scene
  tweened. The drawn face no longer returns before the final chapter (the network dissolves from
  94 straight into the void and the film; the feature-first photo reveal of 2026-10-08 and its
  shader relief were removed on 2026-10-09). The last beat is the morph (Chief 2026-10-09, "sebagian wajah
  saya berubah menjadi persyarafan neuron"; `morph.ts`): over the held last frame a front sweeps
  in from the left side of the face as seen (`MORPH.cut.side`, Chief's call) between 99.05 and 99.9 (`legacy.morph`, a plain `{ value }`
  tween without easing whose `onUpdate` hands the progress to the module); the flesh it passes
  darkens to the void and, a few pixels behind, the face's own edges and light return as the
  material of chapters 03 and 14 (`face.ts` on the frame's face crop, the glyphs above the
  hairline flattened out), with somas on the densest features, links, axons growing out of the
  face, a seam with motes drifting off it, and signals on a repeating GSAP timeline as in
  `signal.ts`. It is drawn into `<canvas data-film-morph>` at twice the frame's resolution under
  the film's mask but none of its grade; the journey's ticker drives the living layer past
  `covered`, the still layer is redrawn only when the front moves, and `data-morph` records the
  progress. Its analysis starts with the film's preload. Reduced motion never builds it. After
  a re-export, `scripts/legacy-film/measure.mjs` draws the new last frame with a grid, the
  `MORPH.face` ellipse, the crop, the hairline and the analysis, so those knobs can be read off.
- Chapter titles reveal behind line masks (2026-10-08, "ending"): after `document.fonts.ready`,
  inside the cinematic matchMedia context, `SplitText.create` splits every chapter `h2` once
  (`mask: 'lines'`, `aria: 'auto'`, no `autoSplit`; the centered titles, chapters 07, 14 and
  the legacy, also into chars) and reverts it on teardown; `buildMaster` sets each line to `yPercent` 110
  and slides it up over 1 with a .12 stagger as the chapter enters, and the centered titles
  instead fade their chars in from the centre out (`stagger: { amount: .6, from: 'center' }`).
  The `h2` markup is one `<span>` per title line with a space between (the reading view and the
  no-JavaScript page keep the line breaks); the block rule in `journey.module.css` applies only
  to those first-level spans so SplitText's own wrappers keep their inline flow. Descenders are
  clipped by the mask only while a line is still sliding up. The text never moves with the
  pointer; reading mode and reduced motion get the plain headings.
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
  again at phase 93 as the face returns; the division chapters and the centered chapters 07
  and 14 also give their text a soft multi-layer `text-shadow` halo (no backdrop shape), and
  the big centered titles sit at 92 % white with a faint light edge so the thin strokes blend
  with the field instead of cutting it.
- Only `x, y, scale, autoAlpha` are animated on elements; the final chapter's film clock is a
  plain object, not an element, and hands each clip time to `film.ts` to draw. The wake is
  desktop-only (no touch, no phones, no reduced motion) and its detach kills its tweens and
  clears the inline transforms, so reading mode starts from clean elements.

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

## One living organism (2026-10-09)

The brief `docs/superpowers/plans/2026-10-09-one-living-visual-organism.md` (a local working
note) asked for the journey to read as one organism evolving from cell to Sentraverse. Everything
below rides the existing master timeline, renderer and ticker. There is no new ScrollTrigger,
no new loop and no new dependency.

- **Motion signatures** (`timeline.ts`: `ease`, `signatures`, `chapterSignature`, `motionOf`).
  - Each chapter's panel enters on its phase's curve and duration: origin and growth on
    `expo.out`, the signal on `power2.out`, the synapse and SENTRA on `sine.inOut`, the network
    on `power3.inOut`.
  - Titles reveal on `expo.out`. Exits stay an accelerating .8.
- **Stage camera** (`timeline.ts`: `cameraKeys`, `cameraAt`; `renderer.ts`: `u_stage`, `toScreen`,
  `project`).
  - One virtual camera over every canvas layer, never over the text. The master tweens it to
    each chapter's framing over the chapter's first four phases, on that chapter's curve.
  - Framing per chapter: zoom 0.94–1.09, pan ≤ .03 viewport height, roll ≤ .005 rad.
  - Phones take half of every move and no roll. Reduced motion keeps the identity.
  - The WebGL shader, the Canvas 2D fallback and the hub hit test share one projection.
- **The carrier** (`handoff.ts`: `hosts`, `HANDOFF`, `looks`, `hubBlend`; `renderer.ts`: `sceneAt`,
  `carrier`, `host`; the `[data-carrier]` span).
  - One soft point of light is handed from host to host: origin, progenitor, soma, mind (the
    face's forehead), impulse, cleft, centre, hub, unified.
  - It travels over the two phases before each host takes it. Its size, colour and breathing
    follow the host, and each division's hub gives it that division's colour.
  - It fades into the legacy's void from 94 to 95.5.
  - The renderer projects it through the same `sceneAt` views it draws with, so it sits on what
    is drawn. Reading mode, no JavaScript and the text-only fallback show no carrier.
- **The flagship reveal, network to constellation** (`geometry.ts`: `ringSeat`, `nearestHub`,
  `RECEDE` = 4, `GATHER` = 3.5; `timeline.ts`: `reveal`; shader `a_target`, `u_order`, `u_sync`).
  - Every network vertex carries a constellation target. Foreground neurons that grew within
    `GATHER` of a hub move onto a ring around it, the n-th a golden angle on from the last.
  - The outer neurons keep their place, and the distant field recedes `RECEDE` into the fog. The
    frame keeps its depth while five structured clusters form.
  - `u_order` rises from 60.5 to 65. `u_sync` puts the six lanes on the centre's beat from 60 to
    65.5 and again into SENTRA (90–92). The dust thins with `u_order`.
  - SENTRAVERSE keeps its reveal at the chapter start (DECISIONS).
- **The opening words** (`timeline.ts`: `revealHero`, `HERO_FAINT`).
  - The words arrive in this order: "Intelligence", then "begins", then "as connection." as one
    softer phrase, then the full stop takes a brief glow. It plays once per load.
  - Until the experience is ready the words wait at .08 opacity, never hidden. Reduced motion and
    no-JS read at once.
- **Neural trace** (`[data-progress-tick]`, `[data-progress-head]`). A signal head rides the line
  at the master's progress, and each chapter's tick sits at its place in the travel, the active
  one lit. The transport buttons stay the keyboard path.
- **Pointer** (`Look.node`, `u_attract`, `[data-cursor-label]`). Pointing at a division eases its
  hub's nodes brighter and draws them 5 % toward the hub; the cursor names the division. Only the
  network attracts. Touch, phones and reduced motion are unchanged.
- **Hygiene**:
  - Off-screen chapters are `inert` beside `aria-hidden`.
  - The colophon year comes from the server.
  - `app/robots.ts` and the Organization JSON-LD ship now. Canonical, sitemap and the Open Graph
    image wait for the domain.

## Verification

Run from this capsule:

```text
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run deploy:dry-run
```

`node scripts/pnpm.mjs run test` runs every `*.test.mjs` under `components/` (a glob,
so a new test file runs without touching `package.json`; CI runs it on every push):
`tactile.test.mjs` (magnet pull, face placement and look), `face.test.mjs` (the analysis,
`makeFace`, the feature-first growth order), `morphology.test.mjs`, `signal.test.mjs`,
`film.test.mjs` (frame mapping, the versioned files on disk, the load order), `morph.test.mjs`
(the region, the front, the crop, the seeded neurons, the pulse lanes) and `timeline.test.mjs`
(the master's 131.5 units, the phase mapping and its dwells, the labels, the title reveals, the
legacy's dissolve, film, morph and text beats, the settled state). The Playwright suite in
`e2e/neural.spec.ts` (local only for now, Chief 2026-10-09) covers the WebGL renderer staying
active (a shader that fails to link would fall back to Canvas 2D silently), the activity cycle
playing only in the network window and parking under reduced motion, reverse navigation, all
five divisions, the film (the dissolve, the frame following the scroll, the morph read off the
canvas pixels: tissue on the left of the face at 100, the right untouched, nothing at 98.5, a
phone resize, reading mode), the film's loading (no frame before the network chapter, frame 0
and 119 first, all 120 by the end, none missing, `Cache-Control` immutable), the legacy's words
and layout on every breakpoint, mobile overflow, OS reduced-motion changes, context loss,
missing WebGL, no canvas context, JavaScript-disabled reading, pin cleanup, connected-region
navigation and frame timing. `e2e/smoke.spec.ts` checks the page loads with the journey as its main landmark and reaches the
way on to sentrahai.com.

Performance targets (Chief 2026-10-09, "sesuaikan best practice"): the Core Web Vitals "good"
thresholds at the 75th percentile — LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 — and no film bytes
before the visitor heads for the film. Measured 2026-10-09 on `next start` locally in Chrome:
375×812 with Fast 4G (9 Mbps, 60 ms) and 4× CPU throttling LCP 1,420 ms, CLS 0, 578 KB until
network idle, 0 film frames; 1280×800 unthrottled LCP 304 ms, CLS 0. Field data (Vercel Speed
Insights) is the release check; INP is not measured locally.

Point `PLAYWRIGHT_BASE_URL` at a running local preview, then run:

```text
node scripts/pnpm.mjs exec playwright test e2e/neural.spec.ts e2e/smoke.spec.ts --workers=1
```

Frame samples are local evidence, not a guarantee of 60fps on every GPU. Production deployment,
Safari/iOS device testing, and final anatomical/art-direction review are separate release checks.

Implementation references: [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/),
[WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
