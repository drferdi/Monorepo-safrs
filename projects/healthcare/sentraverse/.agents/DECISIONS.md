# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-10-08 (later) — Portrait realism: calibrated relief and a feature-first photo reveal

- Decision (Chief, 2026-10-08, "Agreed ... Execute point 1 dan 5", recorded in the local plan
  `docs/superpowers/plans/2026-10-08-portrait-realism.md`): the drawn face gets a real facial
  relief instead of brightness-as-depth, and the photograph resolves over it feature first and
  registered, not as a flat cross-fade. Everything else from the entry below stays: one face,
  the drawn face in chapter 03 and under the photo, the photo only at the very end (phase 95.5
  to 98.5), still text, no new dependency, source images unchanged.
- How: `geometry.ts` `faceDepth(u, v)` is a hand-calibrated 2.5D surface in source-image
  coordinates (head ellipsoid, nose, brow, eye sockets, cheeks, lips, chin, neck); luminance now
  only sets dot size. `faceContour(u, v)` is one reveal field for both the geometry's growth
  order and the photo mask, and `faceDissolve(contour, progress)` is its smoothstep window.
  `tactile.ts` `portraitState(phase)` gives `relief` (1 → 0 over 94.25 → 95.5, a smoothstep;
  the shader multiplies z by it and the pointer turn by it) and `reveal` (0 → 1 over 95.5 →
  98.5). `renderer.ts` carries `u_relief` and `u_reveal` and fades every vertex by 94 % once
  the skin at its birth value has resolved; the Canvas 2D fallback strokes per segment with the
  same dissolve. `portrait-reveal.ts` `createPortraitReveal(photo)` precomputes a 192 px
  contour field, repaints at most 180 steps, draws the unchanged `next/image` with
  object-fit-cover maths into `<canvas data-photo-reveal>` and masks it with `destination-in`;
  `[data-photo][data-reveal]` is `active` or `complete`, and `dispose()` clears it so reading
  mode, reduced motion and no-JavaScript keep the plain image. The photo container now fades
  in over 0.5 phase units (3 without a reveal canvas) and the final chapter enters without its
  24 px slide so the photo stays on the drawn face.
- Visible rulings for Chief to judge by eye: the pointer turn is ±0.085 rad (was ±0.22) and
  the chapter-03 sway ±0.045 rad (was ±0.23), because a flat-registered reveal cannot tolerate
  a large turn; both are single numbers in `renderer.ts`.
- Session rulings (Claude Fable 5.1): the work was found uncommitted in the shared checkout,
  authored 08:43–08:49 by another session with Task 1 complete and Task 2 written but ungated;
  it was finished rather than stashed because it breaks none of Chief's decisions and the plan
  quotes Chief's approval; the plan ledger moved from `docs/plans/active/` to the git-ignored
  `docs/superpowers/plans/` beside the design spec, so no new tracked folder reaches the
  published repo; a stray `.portrait-check.config.ts` (no base config spread) was deleted and
  the sanctioned session-only Chrome config used and deleted.
- Known, not fixed (Chief's call): on a 768×1024 portrait tablet the opaque photo's left edge
  (x ≈ 396) overlaps the end of the description line (text block 600 px wide, to x ≈ 661); the
  drawn face sat there before, the photo makes it visible. Knobs: `facePlacement` scale for
  aspect < 1.2 (.7) or a narrower text block on portrait tablets.
- Evidence: typecheck 0, lint 0 (two pre-existing `img` warnings), node:test 14/14 (three new
  tests in `face.test.mjs`: depth independent of lighting, feature-first and exactly reversible
  dissolve, relief registered before the first skin pixel), build 0, deploy:dry-run 0,
  Playwright 14/14 through the installed Chrome against the production preview (two new tests:
  feature-first canvas alpha with reversal and the full image at the end; late image load and a
  phone resize). Browser checks of the production build at 1280×800 (phase 96.5, 98.7, chapter
  03), 375×812 (96.5, 98.7, reading mode), 768×1024 (97) and 800×500 (98.7). `public/` unchanged.

## 2026-10-08 — The journey ends on the founder's face drawn as neural tissue

- Decision (Chief, 2026-10-07 and 2026-10-08): one human face only, the founder's own; no photo
  and no card — the face is formed by the same WebGL lines and glowing points as every other
  scene; the final chapter keeps its text on the left with the face on the right (above the text
  on phones); chapter 03's anatomical drawing stays; the body silhouette and the final-scene body
  draw are gone; no dependency added (`@gsap/react` is not installed).
- How: `public/neural-face.webp` (240 px grayscale, lossless, never displayed; WebP because
  `*.png` under `public/` is Git LFS and Vercel would receive a pointer file) is read through a
  2D canvas by `components/neural/face.ts`, which turns it into Sobel contour segments thinned
  along the gradient and brightness-weighted dots; `geometry.ts` `makeFace` builds them in the
  renderer's vertex format; `renderer.ts` draws the `face` layer from phase 93 with a pointer
  turn (±0.22 rad) and a glow on the points near the pointer (`tactile.ts` `faceLook`). The
  pointer wake (`wake.ts`) tilts the active chapter's text block, pulls the CTA and lifts
  buttons with `gsap.quickTo` trackers rebuilt after each elastic spring; its detach clears the
  inline transforms so reading mode starts clean.
- Rulings on the way: dot eligibility reads the raw pixel so the blur paints no halo outside a
  contour; the `Tissue` constructor's parameter property became an explicit field so Node's
  type stripping can import `geometry.ts` in tests; the wake targets `[data-marker-copy]`
  rather than the first child, because division chapters start with their marker line; float
  products in tests are compared with a tolerance.
- Same day, after the review and a look in the browser, Chief added: chapter 03 "A human
  architecture" drops the generic body drawing and shows the face too (it grows in, sways and
  the camera closes in as the signal chapter starts); the chapter text must never move with the
  pointer (the text-block tilt, `perspective` and `preserve-3d` were removed; the CTA pull and
  button lift stay); from the network chapter on a scrim darkens the canvas under the text
  (page background at 60 %, phase 58 → 94) and the division chapters give their text a soft
  three-layer `text-shadow` halo (a radial backdrop was tried first and rejected as harsh).
  The fresh-context review also led to `facePlacement`
  (the face bends with the viewport: scaled to .7 and pulled in on portrait tablets, sized to
  the band above the text on short phones, with a 90 px chapter padding under 701 px tall) and
  to a touch guard on every wake handler.
- Later that day, after the halo build: the centered titles "SENTRAVERSE" (chapter 07) and
  "SENTRA" (chapter 14) were still harsh, so they get the same soft halo, 92 % white and a faint
  light edge ("harus blend tapi jelas"); and Chief asked for his real face at the end ("di
  akhir munculkan wajah image asli saya"). The photograph `public/portrait-ferdi.webp` (from
  `88705077`, WebP so not LFS) is rendered by `next/image` in the final chapter and placed by
  `tactile.ts` `faceBox` in the box the renderer draws the face in, resolving from phase 95.5
  to 98.5 while the drawn face stops turning; a radial mask and a slight desaturation blend it
  with the field. The drawn face stays in chapter 03 and under the photo. In reading mode and
  without JavaScript the photo sits in the flow beside the text (above it on phones); the
  cinematic placement is cleared on a mode change. Rulings: the photo is placed with a one-time
  `gsap.set` of `left/top/width/height` on build and resize (not tweened), only `autoAlpha` is
  animated; the drawn face is kept under the photo rather than removed so the end still reads
  as the network becoming the person.
- Evidence: commits `0adef8a8`, `88705077` (card, superseded), `afcda086`, `4d0866ff`,
  `9dc2c9a6`, `aa1a67ce`, `a8595851`, `c455a20e`, `a2345850`, `eb64660a`, `fb71a429`;
  node:test 11/11; Playwright 12/12 through the installed Chrome against the production
  preview; browser checks of the production build at 1280×800, 800×500 and 375×812 recorded in
  `HANDOFF.md` and `docs/neural-journey.md`.

## 2026-09-26 — Migrated from abyss-monorepo into SAFRS

- Decision: The legacy folder `abyss-monorepo/apps/healthcare/sentraverse` was copied as it is
  to `projects/healthcare/sentraverse`. Source: legacy commit
  `762e48cb4bb1967e2132e7b530e8f2a7f4231c59` plus one untracked, not-ignored file
  (`app/privacy/tiktok…txt`, a public domain-verification file).
- Not copied: `.agent/`, `.claude/`, `.codex/`, `graphify-out/`, `CLAUDE.md`, `.env.local`,
  `node_modules/`, `.next/`, `.turbo/`, `.vercel/`, the npm `package-lock.json`.
- Toolchain: pnpm 9.15.0 became pnpm 11.21.0 with a fresh capsule lockfile and
  `nodeLinker: hoisted`; Node 22 became Node 24. The pnpm 9 override block was dropped;
  `pnpm audit` on 2026-09-26 required `next` 16.3.6 (was 16.2.11, RCE advisory) plus
  overrides `postcss >=8.5.23` and `sharp >=0.35.4`, and then reported no known vulnerabilities.
- `test` runs the existing node:test suite; the Playwright smoke stays as `test:e2e` because
  it needs locally installed browsers.
- Absolute legacy paths in comments and docs were rewritten; legacy `AGENTS.md` was replaced
  and its scoped rules kept.
