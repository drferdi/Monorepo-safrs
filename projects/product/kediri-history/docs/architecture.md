# Architecture

Canonical intent lives in [`bibles/06-master-technical-architecture-content-data-model-bible.md`](bibles/06-master-technical-architecture-content-data-model-bible.md)
and the execution contract in [`implementation/MASTER_IMPLEMENTATION_PLAN.md`](implementation/MASTER_IMPLEMENTATION_PLAN.md).
This file records how that canon is realised inside this capsule; it links rather than duplicates,
so no second source of truth is created.

## North star

```
HISTORICAL TRUTH → EDITORIAL NARRATIVE → EXPERIENCE MODEL → PRESENTATION & MOTION
```

A historian corrects a fact without touching GSAP. A motion designer redesigns a scene without
touching truth. A frontend refactor can never become a historical edit.

## Deployment shape

V1 is a modular monolith: one Next.js 16 App Router application that serves the public site, the
cinematic Journey, the Archive, and the Payload admin. One factual database, one media-storage
system, strict internal boundaries. Splitting the CMS into a second application would add
deployments and auth boundaries without solving a V1 problem.

```
Payload Admin → PostgreSQL → Next.js server data layer
                                   ├── semantic HTML
                                   └── typed Scene manifest → client motion islands → GSAP
```

## Module boundaries

Chief decision G03 (2026-08-26): the four architectural packages defined by the Technical Bible
are realised as strictly separated source modules under `apps/web/src/modules/`, not as physical
workspace packages. The repository standalone-capsule extraction contract rejects every symbolic
link inside the capsule tree, and `workspace:*` links produce symlinks. Packaging adapted;
responsibility did not.

| Module | Owns | May depend on | Must never depend on |
| --- | --- | --- | --- |
| `historical-domain/` | chronology, evidence classes, confidence, review status, rights and visual classes, representation policy, roles, slugs | Zod | React, Next.js, Payload, GSAP, database/CMS code |
| `content-validation/` | executable governance: `validateEvidenceClaim`, `validateEvidenceLink`, `validateMediaRights`, `validateSceneContract`, `validateHistoricalIntegrity` | Zod, `historical-domain` | React, Next.js, GSAP, Payload, database code |
| `design-system/` | tokens, typography, layout primitives, evidence-badge presentation | React, own tokens | Kediri-specific historical entities, `historical-domain`, `content-validation`, Payload, database |
| `motion/` | GSAP registration, motion tokens, effects, scene choreography registry, responsive and reduced-motion variants, lifecycle cleanup | GSAP, `@gsap/react`, React | Payload, CMS queries, database, research corpus, historical copy, `content-validation` |

Application code composes the modules. Modules never import application code. The rules are
enforced by `apps/web/tests/architecture/module-boundaries.test.ts`, which fails the build rather
than relying on prose.

## CMS versus source code

The CMS owns historical records, claims, source relationships, narrative copy, localisation, Scene
order, featured assets, SEO text, publication state, and Theme curation. Source code owns routing,
components, design tokens, CSS, accessibility behaviour, GSAP timelines, ScrollTrigger
configuration, breakpoints, easing, timing, and performance behaviour.

The CMS stores intent — `choreographyKey: bridgeConstruction`. The CMS never stores selectors,
tween JSON, durations, easing, ScrollTrigger `start`/`end`, scrub values, or transform coordinates.
A code-side motion registry maps each key to a tested implementation.

## Server-first requirement

```
CMS → server query → validated public DTO → semantic HTML → client motion island → GSAP
```

Server Components render complete semantic history first; only the minimum motion or interaction
island becomes client-side. The Journey must never become one large `'use client'` tree because
animation exists. If JavaScript fails, the cinema disappears and the historical document remains.

## Routing

`/journey` stays one continuous route with stable scene anchors (`/journey#1135-panjalu-jayati`);
26 scenes are not 26 routes. The Archive, Explore, and Sources trees are ordinary routes. Full
contract: Master Implementation Plan section 8.

## Runtime foundation

Next.js 16 App Router, React 19, Payload 3, PostgreSQL (Phase 2), S3-compatible object storage
(Phase 2), GSAP with ScrollTrigger and `@gsap/react` (Phase 12), Zod 4, `@t3-oss/env-nextjs`,
Biome, Vitest, Playwright. Node 24 and pnpm 11, pinned capsule-locally.

Deliberately absent by default, per Master Implementation Plan section 3: Redux, Zustand, React
Query, Apollo, any GraphQL client, Framer Motion, Lenis, Locomotive Scroll, Three.js, React Three
Fiber, Redis, Elasticsearch, Meilisearch, vector databases, Neo4j, Prisma, and tRPC. A new
dependency requires a demonstrated problem.

Turborepo is deferred (Chief decision G05): a single build unit does not yet justify it, and
capsule scripts stay Turbo-compatible so adding it later is purely additive.

Verified empirically on 2026-08-26: `@payloadcms/next@3.88.0` declares `next >=16.2.6 <17.0.0`,
and the production build of Next 16.3.0 with Payload 3.88.0 succeeds. The build runs
`next build --webpack` rather than the Next 16 default Turbopack build, because the Turbopack
build externalises transitive server packages through symlinks in `.next/node_modules/` and the
repository standalone verifier rejects every symlink in the capsule tree. Route output is
identical; `pnpm run dev` keeps the faster default.

## Sensitive surfaces

Environment contract, Payload access control, media rights and master separation, dependency
lockfile, token gate, boundary tests, and historical-integrity validation. Follow root
[`AGENTS.md`](../../../../AGENTS.md), [`SECURITY.md`](../../../../SECURITY.md), and
[`SAFRS_SPEC.md`](../../../../SAFRS_SPEC.md).
