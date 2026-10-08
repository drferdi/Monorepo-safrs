# Sentraverse Neural

The cinematic neural journey of Sentra as its own site: a pinned stage scrubbed by the scroll
through fifteen chapters — from a single connection, through neurons, signal and synapse, to the
five Sentra divisions and SENTRA — ending on THE LEGACY, the founder's film, whose last frame
turns the left side of the face into neural tissue.

Status: active. Split out of the `sentraverse` capsule on 2026-10-09; the history up to the
split lives in that capsule's git history and `.agents/DECISIONS.md`.

## Boundaries

- In scope: the home page journey (`app/page.tsx` → `components/neural/NeuralJourney.tsx`), its
  WebGL renderer with Canvas 2D fallback, the film frames in `public/legacy-film/<version>/`,
  and their tests.
- Out of scope: the rest of sentrahai.com (story, ecosystem, insights, privacy, terms), which
  stays in `sentraverse`; this site links to it.
- Human owner: Chief (dr. Ferdi Iskandar)

## Interfaces

- Consumes: nothing at runtime (no API, no environment variables).
- Exposes: one static page, `/`, plus the film frames under `/legacy-film/<version>/`.

## Stack

Next.js 16 (App Router, webpack build), React 19, gsap 3.15 (ScrollTrigger, SplitText),
Tailwind 4 for its preflight only, TypeScript 5.9, Node 24, pnpm 11.21.0 with its own lockfile.

## Commands

See `AGENTS.md` "Commands" and `project.contract.json`. Quick start from this folder:

```bash
node scripts/pnpm.mjs install --frozen-lockfile
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run start
```

Then open http://127.0.0.1:4346.

## Where things are

| Path | Role |
| --- | --- |
| `components/neural/story.ts` | The chapters, `phaseOf(id)`, and `sentra(path)` for links to sentrahai.com |
| `components/neural/timeline.ts` | The master timeline, the phase-to-time tempo, THE LEGACY's beats |
| `components/neural/NeuralJourney.tsx` | `gsap.matchMedia` lifecycle, the pinned ScrollTrigger, pointer, sound, reading mode, film preload |
| `components/neural/renderer.ts`, `geometry.ts`, `signal.ts` | The neural field and its activity cycle |
| `components/neural/film.ts`, `morph.ts`, `LegacyScene.tsx` | The film as a scrubbed frame sequence and the face that becomes neural tissue |
| `scripts/legacy-film/` | Re-export the frames and re-measure the morph |
| `docs/neural-journey.md` | The full design record, knobs, tests and performance targets |

---

_Architected and built by Drferdi._
