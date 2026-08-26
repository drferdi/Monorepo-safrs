# Kediri — A Living Civilization
## Master Implementation Plan & Repository Blueprint

**Version:** 0.1  
**Status:** Execution Contract / Pre-Implementation  
**Goal:** Build the official Kediri historical web experience as a historically governed, CMS-backed, accessible, cinematic application without allowing historical truth to become coupled to frontend or motion code.

---

# 1. Architecture Lock

V1 is a **modular monolith**:

```text
Next.js 16
   │
   ├── Public Website
   ├── Cinematic Journey
   ├── Historical Archive
   └── Payload Admin
            │
            ▼
        PostgreSQL
            │
            ├── Historical Knowledge
            └── Editorial / CMS State

Media → S3-compatible object storage
Motion → GSAP / ScrollTrigger
```

Do **not** introduce microservices, GraphQL clients, Elasticsearch, vector databases, Redis, Kafka, separate CMS applications, graph databases, or AI layers in V1 without explicit architecture approval.

One deployment. One factual database. One media-storage system. Strict package boundaries.

---

# 2. Exact Monorepo Tree

```text
kediri-living-history/
│
├── apps/
│   └── web/
│       ├── public/
│       │   ├── icons/
│       │   ├── static/
│       │   └── social/
│       │
│       ├── src/
│       │   ├── app/
│       │   │   ├── (public)/
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── page.tsx
│       │   │   │   ├── journey/page.tsx
│       │   │   │   ├── explore/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── timeline/page.tsx
│       │   │   │   │   ├── places/page.tsx
│       │   │   │   │   ├── places/[slug]/page.tsx
│       │   │   │   │   └── themes/[slug]/page.tsx
│       │   │   │   ├── archive/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── events/[slug]/page.tsx
│       │   │   │   │   ├── people/[slug]/page.tsx
│       │   │   │   │   ├── places/[slug]/page.tsx
│       │   │   │   │   ├── objects/[slug]/page.tsx
│       │   │   │   │   └── sources/[slug]/page.tsx
│       │   │   │   ├── sources/page.tsx
│       │   │   │   ├── methodology/page.tsx
│       │   │   │   ├── accessibility/page.tsx
│       │   │   │   ├── rights/page.tsx
│       │   │   │   └── about/page.tsx
│       │   │   │
│       │   │   └── (payload)/
│       │   │       ├── admin/[[...segments]]/page.tsx
│       │   │       └── api/[...slug]/route.ts
│       │   │
│       │   ├── payload/
│       │   │   ├── payload.config.ts
│       │   │   ├── collections/
│       │   │   │   ├── Users.ts
│       │   │   │   ├── RightsDocuments.ts
│       │   │   │   ├── MediaMasters.ts
│       │   │   │   ├── MediaAssets.ts
│       │   │   │   ├── Sources.ts
│       │   │   │   ├── People.ts
│       │   │   │   ├── Places.ts
│       │   │   │   ├── Artifacts.ts
│       │   │   │   ├── Events.ts
│       │   │   │   ├── Themes.ts
│       │   │   │   ├── EvidenceClaims.ts
│       │   │   │   ├── EvidenceLinks.ts
│       │   │   │   ├── JourneyActs.ts
│       │   │   │   └── Scenes.ts
│       │   │   ├── globals/
│       │   │   │   ├── SiteSettings.ts
│       │   │   │   ├── JourneySettings.ts
│       │   │   │   ├── HistoricalMethodology.ts
│       │   │   │   └── Navigation.ts
│       │   │   ├── access/
│       │   │   ├── hooks/
│       │   │   ├── fields/
│       │   │   └── migrations/
│       │   │
│       │   ├── content/
│       │   │   ├── queries/
│       │   │   │   ├── get-journey.ts
│       │   │   │   ├── get-scene.ts
│       │   │   │   ├── get-event.ts
│       │   │   │   ├── get-person.ts
│       │   │   │   ├── get-place.ts
│       │   │   │   ├── get-artifact.ts
│       │   │   │   ├── get-source.ts
│       │   │   │   └── search-archive.ts
│       │   │   ├── mappers/
│       │   │   ├── dto/
│       │   │   ├── cache/
│       │   │   └── preview/
│       │   │
│       │   ├── components/
│       │   │   ├── journey/
│       │   │   ├── archive/
│       │   │   ├── evidence/
│       │   │   ├── explore/
│       │   │   ├── navigation/
│       │   │   └── media/
│       │   │
│       │   ├── scenes/
│       │   │   ├── SceneRenderer.tsx
│       │   │   ├── SceneShell.tsx
│       │   │   └── variants/
│       │   │
│       │   ├── env.ts
│       │   └── styles/
│       │       ├── globals.css
│       │       ├── tokens.css
│       │       └── eras.css
│       │
│       ├── next.config.ts
│       ├── playwright.config.ts
│       └── package.json
│
├── packages/
│   ├── historical-domain/
│   │   ├── src/
│   │   │   ├── chronology.ts
│   │   │   ├── evidence.ts
│   │   │   ├── media.ts
│   │   │   ├── publishing.ts
│   │   │   ├── roles.ts
│   │   │   ├── slugs.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── content-validation/
│   │   ├── src/
│   │   │   ├── evidence-claim.ts
│   │   │   ├── evidence-link.ts
│   │   │   ├── media-rights.ts
│   │   │   ├── scene-contract.ts
│   │   │   ├── historical-integrity.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── design-system/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── tokens/
│   │   │   ├── typography/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── motion/
│       ├── src/
│       │   ├── gsap.ts
│       │   ├── tokens.ts
│       │   ├── effects/
│       │   ├── scenes/
│       │   │   ├── registry.ts
│       │   │   ├── inscription-reveal.ts
│       │   │   ├── name-emerges.ts
│       │   │   ├── divided-kingdom.ts
│       │   │   ├── royal-consolidation.ts
│       │   │   ├── manuscript-world.ts
│       │   │   ├── political-fracture.ts
│       │   │   ├── bridge-construction.ts
│       │   │   ├── bridge-lift.ts
│       │   │   ├── revolution-machine.ts
│       │   │   ├── industrial-expansion.ts
│       │   │   └── runway-transition.ts
│       │   ├── responsive/
│       │   ├── transitions/
│       │   └── index.ts
│       └── package.json
│
├── scripts/
│   ├── seed-reviewed-content.ts
│   ├── import-research-corpus.ts
│   ├── validate-content.ts
│   ├── validate-rights.ts
│   ├── validate-journey.ts
│   └── verify-production.ts
│
├── tests/
│   ├── content/
│   ├── integration/
│   ├── accessibility/
│   ├── journey/
│   └── fixtures/
│
├── infra/
│   ├── docker-compose.yml
│   ├── postgres/
│   └── minio/
│
├── docs/
│   ├── bibles/
│   ├── implementation/
│   └── evidence/
│
├── .github/workflows/
│   ├── ci.yml
│   └── production-verify.yml
│
├── .env.example
├── biome.json
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── tsconfig.json
└── README.md
```

## Why one app

Payload integrates with Next.js. Splitting CMS into a separate app adds deployments, auth/network boundaries and duplicated framework setup without solving a V1 problem. The monorepo value comes from package boundaries, not artificial service count.

---

# 3. Dependency Policy

Target versions must be re-checked at implementation time and pinned to a combination that passes full clean install/build/test. The architectural dependency set is:

## Root

```text
Node 24 LTS
pnpm 11
Turborepo 2.10+
TypeScript stable compatible line
Biome 2.5+
tsx
```

## apps/web

```text
next 16.x
react 19.x
react-dom 19.x
payload 3.x
@payloadcms/next
@payloadcms/db-postgres
@payloadcms/richtext-lexical
@payloadcms/storage-s3
gsap 3.x
@gsap/react
zod 4.x
@t3-oss/env-nextjs
sharp
```

## Testing

```text
vitest 4.x
@playwright/test
@axe-core/playwright
```

## Explicitly absent by default

```text
Redux
Zustand
React Query
Apollo
GraphQL client
Framer Motion
Lenis
Locomotive Scroll
Three.js
React Three Fiber
Redis
Elasticsearch
Meilisearch
Vector DB
Neo4j
Prisma
tRPC
```

Additional dependencies require a demonstrated problem and explicit approval.

---

# 4. Database & Storage Setup

## Development

`infra/docker-compose.yml` runs:

- PostgreSQL 18.x compatible current release
- MinIO

Databases:

```text
kediri_history_dev
kediri_history_staging
kediri_history_production
```

Never share production/staging DBs.

## Object storage

Logical separation:

```text
kediri-public
kediri-private
```

Public: approved derivatives only.  
Private: archive masters, TIFF/RAW, rights documents, research-only/unpublished media.

`MediaAssets` link to `MediaMasters`; public rendering never leaks private masters.

---

# 5. Environment Contract

`.env.example` contains names only:

```text
NODE_ENV=
DATABASE_URL=
PAYLOAD_SECRET=
PREVIEW_SECRET=
NEXT_PUBLIC_SITE_URL=
S3_ENDPOINT=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BUCKET=
S3_PRIVATE_BUCKET=
S3_PUBLIC_BASE_URL=
```

Validate at build/start with Zod / `@t3-oss/env-nextjs`. Missing production-critical values fail fast.

---

# 6. Payload Collections — Exact Creation Order

## 01 Users
Roles:

```text
admin
publisher
historical_reviewer
editor
researcher
asset_curator
```

DoD:
- researcher cannot publish;
- editor cannot self-approve historical evidence;
- public cannot read Users;
- role access tests pass.

## 02 RightsDocuments
Private upload metadata: title, rights type, institution, effective/expiry date, notes, file.

DoD: accessible only to admin/publisher/asset curator.

## 03 MediaMasters
Private archival masters: origin institution, inventory reference, source, rights document, checksum, media type, immutable-after-approval state.

DoD: no public read; approved master logically immutable.

## 04 MediaAssets
Public-capable derivatives with evidence class, rights class, creator, institution, dates, caption, alt, credit, focal/safe-crop, status.

DoD: cannot publish without rights/provenance/classification/alt as required.

## 05 Sources
Bibliographic/archival authority records.

DoD: can represent inscription, manuscript, law, archive, government data, museum record, academic work, newspaper, corporate record, community archive.

## 06 People
Canonical identity, aliases, titles, chronology, biography, representation policy.

DoD: aliases searchable; representation policy prevents fake-authentic imagery selection.

## 07 Places
Modern geography + historical uncertainty.

DoD: can represent Jembatan Lama precisely and Panjalu non-precisely without hacks.

## 08 Artifacts
Objects/documents with chronology, material, institution, inventory, provenance, transcription/translation, media.

DoD: can represent Hantang D.9 as a stable object record.

## 09 Events
Structured chronology, people, places, artifacts, themes, relations, review status.

DoD: year-only dates do not invent month/day.

## 10 Themes
Initial only: Brantas; Kings & Power; Words & Stories; Bridges & Movement; Work & Industry; War & Resilience.

## 11 EvidenceClaims
Atomic propositions with evidence class, confidence, review status, related entities, competing claims, reviewer, supersession.

DoD: historical/factual/tradition distinctions are first-class data.

## 12 EvidenceLinks
Claim↔Source join with role, strength and locator.

DoD: one source may support, contradict, contextualize or mention a claim; direct page/line/frame locators supported.

## 13 JourneyActs
Order, title, date range, intro copy, constrained visual-era key.

## 14 Scenes
Order, Act, public copy, primary/supporting Event relations, featured claims/entities/media, hero media, choreography key, SEO/share fields.

DoD: CMS may select `bridgeConstruction` but cannot store selectors/tweens/scrub/ease.

---

# 7. Package Boundaries

## `@kediri/historical-domain`
Allowed dependency: Zod.  
Forbidden: React, Next, Payload, GSAP, DB.

Owns chronology, evidence enums, media classifications, roles, publication states, canonical types/schemas.

## `@kediri/content-validation`
Depends on historical-domain + Zod.

Owns executable governance:

```text
validateEvidenceClaim()
validateEvidenceLink()
validateMediaRights()
validateSceneContract()
validateHistoricalIntegrity()
```

## `@kediri/design-system`
Owns typography, tokens, evidence badge, drawer/button/layout primitives. It does not know historical subjects.

## `@kediri/motion`
Owns GSAP registration, ScrollTrigger, tokens, effects, scene choreography, responsive motion, cleanup. It never queries CMS and contains no historical copy.

---

# 8. Route Contract

```text
/
/journey
/journey#879-first-mark
/journey#1135-panjalu-jayati
...
/explore
/explore/timeline
/explore/places
/explore/places/[slug]
/explore/themes/[slug]
/archive
/archive/events/[slug]
/archive/people/[slug]
/archive/places/[slug]
/archive/objects/[slug]
/archive/sources/[slug]
/sources
/methodology
/accessibility
/rights
/about
/admin
```

Journey remains one route with stable scene anchors.

---

# 9. Research Corpus Import Rule

Never auto-publish uploaded markdown/text research.

Pipeline:

```text
source corpus
  ↓
import-research-corpus.ts
  ↓
draft records
  ↓
reviewStatus = needs_review
  ↓
atomic EvidenceClaims
  ↓
EvidenceLinks
  ↓
historical review
  ↓
approved
  ↓
published
```

The source corpus contains both valuable material and known issues; therefore it is preserved exactly but treated as research input.

---

# 10. Implementation Phases

## PHASE 0 — Lock ground truth

Create/freeze Bibles, implementation plan, architecture guardrails and Sentra-GSAP skill/resources.

### DoD
- all planning canon stored in repo;
- agents can read it locally;
- architecture change requires explicit approval;
- implementation does not begin from memory/chat alone.

---

## PHASE 1 — Repository & runtime foundation

Create pnpm workspace, Turborepo, Next.js/Payload shell, Biome, TypeScript, Vitest, Playwright, env validation, CI.

### DoD
From clean checkout:

```text
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

all succeed.

No historical content implementation required yet.

---

## PHASE 2 — PostgreSQL + object storage

Add PostgreSQL + MinIO locally; wire Payload Postgres/S3 adapters; separate public/private storage.

### DoD
- migrations work from empty DB;
- CMS boots;
- public derivative works;
- private master inaccessible unauthenticated;
- persistent local volumes survive restart;
- env contract complete.

---

## PHASE 3 — Historical domain package

Implement chronology, evidence class, confidence, review status, rights class, visual class, representation policy and role schemas.

### DoD
Tests prove:
- exact day/year/range/approximate chronology;
- year-only does not invent date;
- invalid enums fail;
- folklore cannot silently coerce into historical fact;
- package imports no app/framework/motion/database code.

---

## PHASE 4 — CMS foundation

Build Users, RightsDocuments, MediaMasters, MediaAssets, Sources; RBAC; drafts; versions.

### DoD
- researcher creates Source but cannot publish;
- asset curator manages rights;
- public cannot read masters;
- approved derivative public;
- rollback/version works;
- draft/published clearly separated.

---

## PHASE 5 — Historical knowledge collections

Build People, Places, Artifacts, Events, Themes, EvidenceClaims, EvidenceLinks **before Scenes**.

### DoD
System can represent without hacks:

`Jayabhaya → 1135 Event → Prasasti Hantang D.9 → Claim “contains Panjalu Jayati” → Museum source → direct EvidenceLink`.

---

## PHASE 6 — Publishing governance

Implement validation package and publish hooks.

Minimum rules:

- published claim requires source;
- primary-record claim requires compatible source;
- folklore requires visible classification;
- Scene cannot use draft claim;
- public asset requires valid rights;
- R5/reference-only cannot publish;
- superseded claim not canonical.

### DoD
Bad fixtures fail. Valid fixtures pass. CI blocks critical historical-integrity failures.

---

## PHASE 7 — Seed a canonical vertical slice

Seed only three reviewed slices first:

1. 879 Kwak;
2. 1135 Hantang / Panjalu Jayati;
3. 1869 Jembatan Lama.

This tests ancient, royal and colonial-engineering domains.

### DoD
Each has Event, Claim, Source, EvidenceLink, Artifact where relevant, approved media/placeholder with correct status, public archive page.

No animation required.

---

## PHASE 8 — Archive first

Build public archive event/person/place/object/source pages and `/sources`.

### DoD
With JavaScript disabled, user can open Hantang, see date/significance, see what it supports/does not support, view provenance/source and navigate related records.

This proves history works without cinema.

---

## PHASE 9 — Explore layer

Build Timeline, Places and Themes; Postgres search; curated aliases.

### DoD
Non-expert can find Panjalu Jayati, Jembatan Lama, Jayabaya and Brantas without knowing internal terminology.

---

## PHASE 10 — Semantic Journey

Create JourneyActs and Scenes. Render all scenes as semantic vertical HTML **without GSAP first**.

### DoD
`/journey` remains understandable with JavaScript off. Dates, headings, copy, images, evidence links and Act transitions work. Deep anchors work.

---

## PHASE 11 — Journey UX

Implement Timeline jump, Evidence Drawer, Next Chapter, Back/Forward restoration, Journey↔Archive context, resume, sound state, keyboard focus and skip link.

### DoD
Critical flow works:

`1135 Journey → Evidence → Hantang Archive → Back → exact 1135 context`.

Direct URL, refresh and browser history work without intro replay.

---

## PHASE 12 — GSAP foundation

Create motion registry, GSAP initialization, effect conventions, responsive/reduced lifecycle.

Contract:

`Scene.choreographyKey → motion registry → timeline factory`

### DoD
One test Scene mounts, animates, resizes, supports reduced motion, cleans every trigger/timeline, and never changes historical copy.

---

## PHASE 13 — First three hero scenes

Implement:

- 879 `inscriptionReveal`
- 1042 `dividedKingdom`
- 1135 `royalConsolidation`

### DoD per Scene
Pass desktop, tablet, representative Android, iPhone, reduced motion, keyboard, direct deep-link, route return, slow media, resize and orientation change.

---

## PHASE 14 — Engineering / transformation heroes

Implement 1869 bridgeConstruction, 1912 bridgeLift, revolutionMachine, industrialExpansion, runwayTransition.

### Evidence gate
1912 exact movement waits for exact archive confirmation. Meritjan exact mortar imagery waits for claim verification.

### DoD
Motion communicates the historical concept without adding unsupported detail.

---

## PHASE 15 — Remaining supporting scenes

Reuse a constrained library of patterns such as artifactReveal, editorialReveal, mapProgression, politicalShift, archiveTransition, documentarySequence, networkExpansion and modernReveal.

### DoD
Complete Journey without duplicated engines, competing triggers or scene hacks leaking globally.

---

## PHASE 16 — Final visual assets

Replace placeholders only with rights-approved, evidence-classified, metadata-complete responsive media.

### DoD
`validate:rights` reports zero public rights failures, zero missing evidence classes, zero reference-only public assets, zero critical credit omissions.

---

## PHASE 17 — Mobile choreography

Individually design desktop/tablet/mobile/reduced variants. Never shrink desktop as “responsive.”

### DoD
No trapped scroll, excessive pins, horizontal accidents, tiny targets, mouse-only interactions or browser-chrome text clipping.

---

## PHASE 18 — Accessibility

Manual + automated testing: keyboard, screen reader, 200% zoom, narrow reflow, reduced motion, high text size, touch, sound off.

### DoD
Target WCAG 2.2 AA and zero known critical/serious automated accessibility violations on primary routes.

---

## PHASE 19 — Performance

Initial target budgets:

```text
LCP ≤ 2.5 s
CLS ≤ 0.1
INP ≤ 200 ms
```

Also enforce: no whole-archive client payload, no all-scenes preload, no WebGL by default, no perpetual heavy blur, no uncontrolled trigger count.

### DoD
Representative mid-range Android remains usable and smooth, not just developer workstation.

---

## PHASE 20 — Historical production verification

Create `pnpm verify:production`.

Conceptual output:

```text
Journey scenes.............. valid
Published claims............ all sourced
Broken relations............ 0
Public rights failures...... 0
Draft claims in production.. 0
Invalid evidence badges..... 0
Unknown choreography keys... 0
Missing required alt text... 0
Broken scene anchors........ 0
```

Any critical non-zero condition blocks release.

---

## PHASE 21 — End-to-end tests

Playwright scenarios:

- Home → Journey
- Home → Explore
- direct 1135 entry
- Timeline → 1869
- Journey → Evidence
- Evidence → Archive
- Archive → Journey
- Back / Forward restoration
- mobile Timeline
- reduced-motion Journey
- sound opt-in
- alias search
- 404
- semantic content without JS where feasible in test setup

### DoD
Primary supported browser-engine suite passes.

---

## PHASE 22 — Deployment

Staging first. Production only after:

`CI + content integrity + rights + historical review + accessibility + E2E + performance = PASS`.

Deployment must be reproducible from repo + environment + migrations with no manual server surgery.

---

# 11. CI Contract

Every PR:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm validate:content
pnpm validate:rights
pnpm validate:journey
pnpm build
```

Main/pre-release adds:

```text
pnpm test:e2e
pnpm verify:production
```

Historical-integrity failures are not warning-only.

---

# 12. Root Command Vocabulary

```text
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm format
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm db:migrate
pnpm db:seed
pnpm cms:types
pnpm validate:content
pnpm validate:rights
pnpm validate:journey
pnpm verify
pnpm verify:production
```

`pnpm verify` is the standard local pre-handoff command.

---

# 13. V1 Definition of Done

V1 is not complete merely because every GSAP scene exists.

| Domain | Release condition |
|---|---|
| History | Every public factual claim maps to approved EvidenceClaim |
| Evidence | Every public claim has valid EvidenceLink(s) |
| Folklore | Tradition/folklore visibly classified |
| Media | Every public asset has provenance + rights |
| Archive | Independent of cinematic Journey |
| Journey | Meaningful without JavaScript |
| Navigation | Major scenes have stable deep links |
| Browser | Back/Forward context restoration correct |
| Motion | No leaked GSAP timelines / ScrollTriggers |
| Mobile | Native choreography exists |
| Reduced Motion | Complete first-class experience |
| Accessibility | WCAG 2.2 AA target |
| Performance | Agreed Core Web Vitals budgets |
| Search | Curated historical aliases supported |
| CMS | Draft → review → approve → publish works |
| Security | Private masters/rights not public |
| Deployment | Reproducible clean deployment |
| QA | Primary E2E browser matrix passes |
| Governance | Critical validation failure blocks deploy |

---

# 14. Agent Non-Negotiables

These rules are intended to be copied into repository agent governance:

```text
DO NOT replace the approved architecture.

DO NOT move historical facts into React or GSAP.

DO NOT encode history in choreography configuration.

DO NOT publish imported research automatically.

DO NOT invent missing historical data.

DO NOT add dependencies without a demonstrated requirement.

DO NOT introduce smooth scrolling by default.

DO NOT introduce WebGL/Three.js unless a scene has proven need.

DO NOT create mobile behavior by shrinking desktop.

DO NOT bypass EvidenceClaim.

DO NOT expose private masters or rights documents.

DO NOT make animation necessary to understand history.

DO NOT optimize spectacle at the expense of historical accuracy,
accessibility, navigation, or performance.

WHEN IMPLEMENTATION CONFLICTS WITH A BIBLE,
THE AGENT MUST STOP THE CONFLICTING CHANGE —
NOT “IMPROVE” THE BIBLE SILENTLY.
```

---

# 15. Build Sequence — One Line

```text
SPEC LOCK
→ MONOREPO
→ DATABASE + STORAGE
→ DOMAIN MODEL
→ CMS
→ EVIDENCE GOVERNANCE
→ SMALL VERIFIED DATASET
→ ARCHIVE
→ EXPLORE
→ SEMANTIC JOURNEY
→ JOURNEY UX
→ GSAP FOUNDATION
→ 3 HERO PROTOTYPES
→ REMAINING HEROES
→ SUPPORTING SCENES
→ FINAL ASSETS
→ MOBILE
→ ACCESSIBILITY
→ PERFORMANCE
→ HISTORICAL INTEGRITY
→ E2E
→ PRODUCTION
```

Do not invert this into “build the 879 hero first and solve history/CMS/accessibility later.”

The objective is not a breathtaking demo that becomes an unmaintainable government site. The objective is a **historically governed digital institution whose public face happens to be world-class cinema**.
