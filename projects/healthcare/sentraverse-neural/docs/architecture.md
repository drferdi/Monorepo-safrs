# Architecture

One static page. The design record, with every knob and its reason, is `neural-journey.md`;
this file is the map.

## Components

- `app/page.tsx` renders `components/neural/NeuralJourney.tsx`, a client component.
- `NeuralJourney.tsx` builds everything inside one `gsap.matchMedia` context (reverted on
  unmount): the master timeline from `timeline.ts`, one pinned ScrollTrigger that scrubs it, the
  pointer (`tactile.ts`), optional sound, reading mode, and the film preload.
- `story.ts` holds the chapters and their phases (`phaseOf(id)` throws on an unknown id) and
  `sentra(path)` for the links to sentrahai.com.
- `renderer.ts` draws the neural field from `geometry.ts` in WebGL, with a Canvas 2D fallback;
  `signal.ts` is the activity cycle; `face.ts` and `morph.ts` grow the face and the tissue.
- `LegacyScene.tsx` and `film.ts` draw the film as a frame sequence on a canvas, driven by the
  master's clock (`ease: 'none'`).

## Boundaries and dependencies

- No API, no environment variables, no data store. Runtime dependencies are pinned in
  `package.json` and `pnpm-lock.yaml`.
- Outbound links only to `https://sentrahai.com`.
- `next.config.mjs` sets the security headers (CSP `default-src 'self'`) and serves
  `/legacy-film/:version/*` with `Cache-Control: public, max-age=31536000, immutable`.

## Failure modes

- No WebGL or a shader that fails to link: the Canvas 2D fallback draws the field.
- No canvas context or JavaScript disabled: the chapter text is readable as a plain page.
- WebGL context loss: the renderer switches to its Canvas 2D fallback (`renderer.ts`); reduced
  motion parks the activity cycle.
- A frame not loaded yet: the film draws the nearest loaded one, earlier first (`nearestLoaded`
  in `film.ts`); the e2e checks all 120 arrive.
