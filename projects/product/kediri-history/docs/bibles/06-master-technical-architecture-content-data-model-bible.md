# KEDIRI — A Living Civilization
## Master Technical Architecture & Content/Data Model Bible

**Version:** 0.1  
**Status:** Architecture Canon  
**Core rule:** **History must never live inside animation code.**

---

# 1. Architecture North Star

The application separates four layers:

```text
HISTORICAL TRUTH
      ↓
EDITORIAL NARRATIVE
      ↓
EXPERIENCE MODEL
      ↓
PRESENTATION & MOTION
```

A historian can correct a fact without GSAP. A motion designer can redesign a scene without rewriting truth. A frontend refactor cannot silently become a historical edit.

---

# 2. Four-Layer Ownership

## Layer 1 — Historical Truth
Entities: Event, Person, Place, Artifact, Source, EvidenceClaim, EvidenceLink, chronology, provenance, certainty.

Storage: CMS + PostgreSQL.

## Layer 2 — Editorial Narrative
Public titles, short/long narrative, localized copy, explanatory text, summaries.

Storage: CMS.

## Layer 3 — Experience Model
Scene, JourneyAct, Theme, order, featured entity relations, hero asset, evidence badge mode, choreography key.

Storage: CMS + shared constrained schemas.

## Layer 4 — Presentation & Motion
React, CSS, design tokens, GSAP, ScrollTrigger, responsive choreography, accessibility, loaders, transitions.

Storage: source code only.

---

# 3. Recommended Stack

## Application
Next.js 16 App Router, server-first rendering with Client Components only where interaction/motion requires them.

## CMS
Payload CMS.

Requirements: relations, drafts, versions, RBAC, localization, media, preview.

## Database
PostgreSQL.

Historical data is strongly relational: events connect to people, places, artifacts, sources and claims.

## Media
S3-compatible object storage, separating private masters/rights from public derivatives.

## Motion
GSAP + ScrollTrigger + `@gsap/react`, following Sentra-GSAP.

V1 remains a modular monolith.

---

# 4. System Diagram

```text
Payload Admin
     │
     ▼
PostgreSQL
     │
     ▼
Next.js server data layer
     │
     ├── semantic HTML
     └── typed Scene manifest
             │
             ▼
       client motion islands
             │
             ▼
        GSAP / ScrollTrigger
```

Media:

```text
Institutional / original master
        ↓
Private object storage
        ↓
Media master metadata
        ↓
Approved derivative
        ↓
Public delivery
```

---

# 5. Core Domain Entities

1. Scene
2. Event
3. Person
4. Place
5. Artifact
6. Source
7. EvidenceClaim
8. EvidenceLink
9. MediaAsset
10. Theme
11. JourneyAct (supporting structure)

`Scene` is not history. A Scene **presents history**.

---

# 6. Event

Represents something asserted to have occurred in time.

Examples: Kwak act, 1135 Hantang, Ganter, bridge opening, Gemeente, Gudang Garam founding, Dhoho milestone.

Use structured chronology rather than fake JavaScript dates:

```text
startYear
startMonth?
startDay?
endYear?
endMonth?
endDay?
precision:
  exact_day | month | year | range | decade | century | approximate
display
```

Never turn “1222” into `1222-01-01` just to satisfy a timestamp field.

Suggested Event model:

```text
id
slug
canonicalName
aliases[]
chronology
summary
description
people[]
places[]
artifacts[]
themes[]
claims[]
relatedEvents[]
reviewStatus
```

---

# 7. Person

Fields:

```text
canonicalName
displayName
aliases[]
titles[]
regnalNames[]
birthChronology?
deathChronology?
summary
biography
representationPolicy
```

Representation policy enum:

```text
authenticated_likeness
historical_photograph
period_portrait
symbolic_only
no_known_likeness
```

Jayabhaya: `no_known_likeness`.

Aliases are first-class data for search and scholarly naming.

---

# 8. Place

Modern coordinates and historical geography are different epistemic objects.

Fields:

```text
canonicalName
aliases[]
placeType
modernLocation?
historicalLocation:
  certainty
  description
  geometryReference?
administrativeContext
summary
history
heritageStatus?
```

Place types may include city, region, river, kingdom, settlement, archaeological_site, building, bridge, religious_site, industrial_site, transport_site, landscape, uncertain_historical_location.

Do not give Panjalu a fake exact Google Maps polygon.

---

# 9. Artifact

Physical/documentary historical object:

```text
canonicalName
aliases[]
artifactType
chronology
material
dimensions
holdingInstitution
inventoryNumber
discoveryLocation?
currentLocation?
provenance
transcription?
translation?
media[]
```

Published object identity and inventory metadata are protected from casual overwrite.

---

# 10. Source

Bibliographic / archival authority:

```text
title
sourceType
authors[]
institution
publisher
publicationYear/date
archiveCollection
inventoryNumber
url
doi
isbn
language
citation
rights?
accessDate?
notes
reliabilityTier
fileAsset?
```

Source types include inscription, manuscript, archival_document, law, government_record, official_statistics, museum_catalogue, photograph, map, academic_book, academic_article, thesis, newspaper, oral_history, corporate_record, community_archive, website.

A source is not automatically a historical claim.

---

# 11. EvidenceClaim — Core Integrity Entity

An EvidenceClaim represents one atomic historical proposition.

Example A:

> The Hantang inscription contains the phrase “Panjalu Jayati”.

Example B:

> The phrase is interpreted as evidence of Panjalu's victory over Janggala.

These are separate claims because the evidentiary relationship is different.

Fields:

```text
canonicalStatement
publicSummary
evidenceClass
confidence
reviewStatus
events[]
people[]
places[]
artifacts[]
sourceLinks[]
competingClaims[]
editorialNotes
reviewedBy
reviewedAt
supersededBy?
```

Evidence classes:

```text
primary_record
historical_fact
scholarly_interpretation
tradition
folklore
modern_verified_data
```

Confidence and evidence class are different. A folklore tradition can be confidently attested **as folklore** without asserting that supernatural content happened.

---

# 12. EvidenceLink

Many-to-many claim ↔ source relationships need metadata:

```text
claim
source
role:
  supports | contradicts | contextualizes | mentions
strength:
  direct | strong | moderate | weak
locator:
  page | chapter | inscriptionLine | archiveFrame | table | paragraph
note
```

This makes the knowledge system auditable and allows disagreement to be represented rather than erased.

---

# 13. Claim Status

```text
researching
needs_review
verified
approved
published
disputed
superseded
rejected
```

Only `published` may feed public production data.

Corrections are not silent overwrites. Superseded claims point to replacement claims where appropriate.

---

# 14. MediaAsset

Media is a provenance-aware entity, not a file attachment.

Fields:

```text
title
mediaType
file
masterFile?
derivativeOf?
width/height/duration
visualEvidenceClass
rightsClass
creator
institution
source
dateCreated
dateDepicted
caption
altText
transformationsAllowed[]
focalPoint
cropSafeZones
people[]
places[]
events[]
artifacts[]
sceneUsage[]
creditLine
rightsDocument?
rightsExpiresAt?
status
```

Visual classes: V0–V5 as defined in the Visual Evidence Bible.

Masters and derivatives remain linked and separate.

---

# 15. Theme

Themes create non-linear relationships without duplicating truth.

Fields:

```text
title
slug
summary
description
events[]
people[]
places[]
artifacts[]
scenes[]
heroMedia
order
status
```

---

# 16. JourneyAct

```text
order
title
subtitle
dateRangeDisplay
introCopy
visualEraKey
scenes[]
```

`visualEraKey` references code-defined design tokens. CMS does not own arbitrary colors.

---

# 17. Scene

Scene references truth; it does not duplicate it.

Suggested fields:

```text
slug
status
act
order
title
subtitle
dateDisplay
primaryEvent
supportingEvents[]
featuredClaims[]
featuredPeople[]
featuredPlaces[]
featuredArtifacts[]
featuredMedia[]
themes[]
narrativeShort
narrativeLong
evidenceBadgeMode
choreographyKey
visualVariant
heroMedia
seoTitle
seoDescription
shareMedia
```

Historical facts such as king, result and source are not copied into Scene as independent strings.

---

# 18. Canonical Relationship Direction

Store relationships once where possible; expose reverse relations virtually.

Recommended ownership:

Event owns people/places/artifacts/claims/themes.  
Scene owns primaryEvent/featuredClaims/featuredMedia.  
EvidenceLink owns claim→source.  
MediaAsset owns provenance/source.

Avoid independently maintained mirror arrays that drift.

---

# 19. CMS vs Source Code Boundary

## CMS owns
Historical records, claims, source relationships, narrative copy, localization, Scene order, featured assets, SEO text, publication states, Theme curation.

## Source code owns
React components, routing, schemas, CSS, visual tokens, GSAP, ScrollTrigger, motion presets, breakpoints, animation timing, accessibility, loaders and performance behavior.

CMS must never store selectors, transforms, scrub values, easing or ScrollTrigger start/end strings.

---

# 20. CMS Stores Intent; Code Stores Mechanics

Allowed CMS field:

`choreographyKey: bridgeConstruction`

Code registry maps that key to tested implementation.

Forbidden CMS structure:

```json
{"target":".bridge","y":-150,"scrub":1.3}
```

Do not turn the CMS into an untyped animation engine.

---

# 21. Motion Registry

Source code concept:

```text
motion/scenes/
├── registry.ts
├── inscription-reveal.ts
├── name-emerges.ts
├── divided-kingdom.ts
├── royal-consolidation.ts
├── manuscript-world.ts
├── political-fracture.ts
├── bridge-construction.ts
├── bridge-lift.ts
├── revolution-machine.ts
├── industrial-expansion.ts
└── runway-transition.ts
```

Every coordinated scene normally has one primary timeline. Child effects are composed inside it.

---

# 22. Data Flow to GSAP

Correct:

```text
CMS
 ↓
server query
 ↓
validated public DTO
 ↓
semantic HTML
 ↓
client SceneMotionRoot
 ↓
GSAP timeline
 ↓
ScrollTrigger
```

GSAP never creates the historical content.

---

# 23. Server / Client Boundary

Server Components render complete semantic history first.

Only the minimum motion/interaction island becomes client-side.

Do not make the entire Journey one giant `'use client'` tree just because GSAP exists.

---

# 24. Static Baseline

Every scene renders a useful structure before motion:

```html
<section id="1135-panjalu-jayati">
  <time>1135</time>
  <h2>Panjalu Jayati</h2>
  <p>...</p>
  <EvidenceBadge />
  <HeroMedia />
</section>
```

JavaScript failure removes cinema, not history.

---

# 25. GSAP Lifecycle

Use scoped GSAP lifecycle / context ownership. Scene owner builds and destroys its own timeline / ScrollTriggers. No orphan triggers, global mutation or selector leakage.

Responsive choreography exposes desktop/tablet/mobile/reduced variants in code; CMS never selects breakpoints.

---

# 26. Media Readiness

Do not measure ScrollTrigger geometry before critical media stabilizes.

Order:

`semantic HTML → known dimensions → critical media ready → build timeline → refresh`

---

# 27. Public Data Strategy

`/journey` gets a compact JourneyManifest containing only published Scene/Act data and essential relationships.

Do not send the entire historical database, research notes, rights records or draft sources to the browser.

Archive pages query deeper entities server-side as needed.

---

# 28. No Frontend GraphQL Requirement

Payload may expose GraphQL/REST, but co-located Next/Payload can use typed server-side data access. Do not add Apollo/React Query unless a real client-state problem appears.

---

# 29. Cache Strategy

Historical public content is highly cacheable.

Use granular tags conceptually such as:

```text
journey
scene:1135-panjalu-jayati
event:1135-hantang
artifact:prasasti-hantang
source:museum-nasional-d9
place:jembatan-lama
theme:brantas
```

Publish triggers invalidate relevant tags, not a full rebuild by default.

---

# 30. CMS Publishing Workflow

```text
RESEARCHER
  ↓ draft
EDITOR
  ↓ narrative review
HISTORICAL REVIEWER
  ↓ evidence approval
PUBLISHER
  ↓ publish
PUBLIC SITE
```

Asset Curator owns media rights/provenance.

Admin is system administration, not automatic historical authority.

Use a four-eyes principle for high-impact historical claims.

---

# 31. Publication Gates

A published EvidenceClaim requires statement, evidence class, at least one valid EvidenceLink, historical reviewer and review date.

A primary-record claim requires compatible primary evidence.

A folklore claim must have explicit folklore/tradition public labelling.

A Scene requires valid primary event, narrative, valid choreography key, rights-cleared hero media and only published featured claims.

A MediaAsset cannot publish if rights are incomplete, status is reference-only or evidence classification is missing.

---

# 32. Source / Claim Versioning

Published sources and claims are not casually hard-deleted. Use active/superseded/withdrawn/broken-link states.

Corrections preserve historical audit trail.

Enable CMS versions and drafts for the historical entities.

---

# 33. Localization

Initial locales: `id`, `en`.

One historical entity; localized public language.

Inventory numbers, dates, relationships and evidence classes remain shared.

Do not create Indonesian and English duplicate Events.

---

# 34. URL Architecture

```text
/
/journey
/explore/timeline
/explore/places/[slug]
/explore/themes/[slug]
/archive/events/[slug]
/archive/people/[slug]
/archive/places/[slug]
/archive/objects/[slug]
/archive/sources/[slug]
/sources
/about
```

Journey scenes remain anchors, not separate page routes.

Slugs are stable and redirects preserve old educational links.

---

# 35. Search

MVP search: PostgreSQL + curated aliases/synonyms. Do not add Elasticsearch, vector DB or graph DB by default.

The historical knowledge system is graph-like conceptually, but PostgreSQL relationships are sufficient.

---

# 36. Validation / DTO Layer

Define shared schemas for Event, Scene, EvidenceClaim, MediaAsset, etc.

Generate CMS types, then map raw documents into narrower **public DTOs**. Never pass raw CMS docs through the whole UI tree because they may contain internal notes, private media references, rights data and unpublished relationships.

Suggested structure:

```text
src/content/
├── queries/
├── mappers/
├── schemas/
├── dto/
├── cache/
└── preview/
```

Components do not perform ad-hoc CMS queries.

---

# 37. Content Technology Principle

Core historical truth is not MDX-first. MDX may serve essays/methodology, but relational claims, sources, objects and rights belong in structured data.

Production history may not live in React constants or GSAP callbacks.

---

# 38. Media Storage

Recommended logical buckets:

```text
historical-master-private/
historical-public-derivatives/
modern-production-master/
modern-public-derivatives/
rights-documents-private/
```

Do not send museum TIFF masters directly to browsers.

IIIF may be considered later if deep-zoom archival use genuinely warrants it; it is not an MVP blocker.

---

# 39. Client State

Allowed minimal client state:

- current scene;
- current act;
- sound preference;
- reduced-motion mode;
- journey resume position.

Do not load all Events/Sources/Claims into global state.

Meaningful navigation state belongs in URLs.

---

# 40. Security

Public frontend: read-only published data.  
CMS: authenticated.  
Database: not public.  
Masters/rights: private.  
Draft preview: authenticated / signed.

Do not expose unrestricted CMS admin APIs simply because the framework generates them.

---

# 41. Backup / Preservation

Back up PostgreSQL, media masters, rights documentation, CMS configuration and source code.

Git is not an archive backup.

Preservation priority:

# EVIDENCE FIRST.

Code can be rebuilt. Lost provenance may not be.

---

# 42. Testing

Required layers:

- schema tests;
- relationship tests;
- content-contract tests;
- semantic render tests;
- motion lifecycle tests;
- route/deep-link tests;
- accessibility tests;
- historical-integrity tests.

Automated historical checks should catch conditions such as:

- folklore rendered with Historical Fact badge;
- reference-only image published;
- Scene linked to draft Claim;
- primary-record badge without published evidence;
- rights-invalid public media;
- unknown choreography key.

---

# 43. Build-Time Integrity

Production deploy should fail on critical content integrity problems.

Conceptual report:

```text
Scenes................ valid
Claims................ sourced
Broken relations...... 0
Rights failures........0
Draft claims public....0
Invalid evidence badge.0
Unknown motion keys....0
```

CI checks history as well as code.

---

# 44. Recommended Repository Modules

```text
apps/web
packages/historical-domain
packages/content-validation
packages/design-system
packages/motion
payload
scripts
tests
docs
```

`historical-domain` contains enums/types/chronology/evidence schemas but no React, GSAP or database connection.

`motion` contains GSAP but no CMS/data fetching/historical copy.

`content-validation` converts historical governance into executable checks.

---

# 45. Explicit Non-Architecture for V1

Do not prematurely add:

- microservices;
- Kafka/RabbitMQ;
- graph database;
- vector database;
- Elasticsearch/OpenSearch;
- CMS abstraction factory;
- separate content API service;
- AI assistant.

A modular monolith is the correct starting point.

---

# 46. Current Research Import Rule

The supplied Kediri research files are inputs, not automatically approved database truth.

Import process:

`source files → draft records → atomic EvidenceClaims → EvidenceLinks → historical review → approved → published`

This is necessary because the corpus mixes primary-history claims, later interpretation, modern statistics and folklore, and contains known inconsistencies.

---

# 47. Final Architecture Rules

1. Facts never originate in React.
2. Claims never originate in GSAP.
3. Scenes reference history; they do not own it.
4. Sources support atomic claims.
5. Folklore is explicitly typed.
6. Media carries provenance and rights.
7. Motion receives presentation-ready data only.
8. Server renders meaning before animation.
9. CMS owns content intent; code owns mechanics.
10. Published historical records are versioned, not silently overwritten.
11. No Scene ships with unresolved critical evidence or rights.
12. Archive remains useful without GSAP.
13. Journey remains meaningful without JavaScript.
14. PostgreSQL is the single factual datastore.
15. Object storage holds media; Git does not become the archive.
16. V1 is a modular monolith.
17. New infrastructure must justify its existence.
18. Every historical claim remains traceable.

# EVIDENCE IS DATA. HISTORY IS RELATIONAL. NARRATIVE IS EDITORIAL. CINEMA IS PRESENTATION. NEVER CONFUSE THEM.
