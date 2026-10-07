# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

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
- Evidence: commits `0adef8a8`, `88705077` (card, superseded), `afcda086`, `4d0866ff` and the
  e2e/docs commit after them; node:test 13/13; browser checks of the production build at
  1280×800, 800×500 and 375×812 recorded in `HANDOFF.md` and `docs/neural-journey.md`.

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
