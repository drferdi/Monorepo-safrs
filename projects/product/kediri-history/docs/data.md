# Data

Canonical model: [`bibles/06-master-technical-architecture-content-data-model-bible.md`](bibles/06-master-technical-architecture-content-data-model-bible.md)
sections 5 to 18. Evidence and media policy:
[`bibles/03-historical-visual-asset-evidence-bible.md`](bibles/03-historical-visual-asset-evidence-bible.md).
This file records the operational rules that bind agents working in this capsule.

## Datastore

PostgreSQL is the single factual datastore; historical data is strongly relational. Media lives in
S3-compatible object storage, split into public derivatives and private masters. Git is not an
archive backup. Both arrive in Phase 2; Phase 1 defines only the environment contract.

## Core entities

`Event · Person · Place · Artifact · Source · EvidenceClaim · EvidenceLink · MediaAsset · Theme ·
JourneyAct · Scene`

A Scene **presents** history; it does not own it. Historical facts such as ruler, outcome, or
source are never copied into a Scene as independent strings. A Scene holds relations
(`primaryEvent`, `featuredClaims`, `featuredMedia`) plus editorial copy and a `choreographyKey`.

Chronology is structured, never coerced into a timestamp: `startYear`, optional month and day, and
an explicit `precision` of `exact_day | month | year | range | decade | century | approximate`.
The year 1222 never becomes `1222-01-01` to satisfy a date field.

## Evidence model

Every public claim resolves through `EvidenceClaim → EvidenceLink → Source`.

Evidence classes, which must never be collapsed into one another:

`primary_record · historical_fact · scholarly_interpretation · tradition · folklore · modern_verified_data`

Evidence class and confidence are different axes. A folklore tradition can be confidently attested
**as folklore** without asserting that its supernatural content occurred.

`EvidenceLink` carries `role` (`supports | contradicts | contextualizes | mentions`), `strength`,
and a `locator` (page, chapter, inscription line, archive frame, table, paragraph). Disagreement
between sources is represented, never erased.

Claim status: `researching · needs_review · verified · approved · published · disputed ·
superseded · rejected`. Only `published` may feed public production data. Corrections are not
silent overwrites; superseded claims point at their replacement.

## Media provenance and rights

`MediaAsset` is a provenance-aware entity, not a file attachment. Visual evidence classes V0 to V5
and rights classes R0 to R5 are independent questions: authenticity and permission are decided
separately. Masters and derivatives stay linked and stored apart. Public rendering never leaks a
private master, and R5 reference-only assets never publish.

Publication gates: a published `EvidenceClaim` requires a statement, an evidence class, at least
one valid `EvidenceLink`, a historical reviewer, and a review date. A `MediaAsset` cannot publish
without complete rights, provenance, evidence classification, and required alternative text.

## Research corpus rule

`research/original/` is **preserved unchanged** and is **not** production truth. It is never
edited to correct it, and never auto-published.

```
source corpus → import script → draft records (reviewStatus = needs_review)
   → atomic EvidenceClaims → EvidenceLinks → historical review → approved → published
```

The corpus knowingly mixes primary history, later interpretation, modern statistics, and folklore,
and contains identified problems that must not be repeated as production fact. Among them: the
arithmetic describing 2026 as the 1,142nd year (879 to 2026 is **1,147** years), the
historiographic status of Prasasti Carama, the exact 1912 bridge-lifting mechanism, the PG Meritjan
mortar-production claim and its calibres, and the company-specific 70.5% PDRB attribution.

No import has been performed. Phase 1 implements no collections and imports no corpus data.

## Localisation

Initial locales `id` and `en`. One historical entity, localised public language. Inventory numbers,
dates, relationships, and evidence classes are shared. Indonesian and English duplicate Events are
never created.

## Public data strategy

`/journey` receives a compact manifest containing only published Scene and Act data plus essential
relationships. The full historical database, research notes, rights records, and draft sources are
never sent to the browser. Archive routes query deeper entities server-side.

## Security

The public frontend reads published data only. The CMS is authenticated, the database is not
public, masters and rights documents are private, and draft preview is authenticated or signed.
Payload generated admin APIs are not left unrestricted merely because the framework produces them.

`DATABASE_URL`, `PAYLOAD_SECRET`, `PREVIEW_SECRET`, and object-storage credentials live only in
untracked environment files. `.env.example` carries variable names and never values.
