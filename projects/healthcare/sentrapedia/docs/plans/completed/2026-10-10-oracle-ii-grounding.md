# Oracle II Grounding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ground every Sentrapedia MIRA analysis with bounded, immutable Oracle II source/page references retrieved before inference.

**Architecture:** A server-only read-only SQLite retriever builds an `oracle-grounding-v1` bundle. The Sentrapedia gateway negotiates the service capability and forwards the bundle separately from patient facts; the local MIRA service validates it and injects it into every model prompt branch while keeping patient evidence semantics unchanged. Draft provenance stores and displays the exact retrieval snapshot.

**Tech Stack:** Next.js 16 Route Handler, TypeScript 5.9, Node 24 `node:sqlite`, SQLite FTS5, Vitest, Python/FastAPI/jsonschema/pytest.

**Spec:** `docs/specs/oracle-ii-grounding.md`

## Global Constraints

- Corpus SQLite and source files remain unchanged and are opened read-only/query-only.
- No paid inference, install, publishing, push or deploy. Startup may use the existing launcher's read-only public model metadata preflight; no provider completions are allowed.
- Grounding stays separate from patient facts; MIRA patient `evidence` retains its existing meaning.
- At most six passages and 1,600 characters per passage; lexical no-match fails before inference.
- Existing v1 MIRA clients and existing saved drafts remain valid.
- Persist source/page references as retrieval provenance, not claim-level entailment.

## Review Focus

- Generic or punctuation-only complaints must produce an actionable no-match without a model call.
- Candidate shortages must use bounded page fallback without duplicate source pages.
- A service that is reachable but lacks `oracle-grounding-v1` must fail before inference.
- Every full and fast MIRA prompt branch must receive grounding while the patient case remains byte-for-byte equivalent.
- Edited, reloaded, and regenerated drafts must retain the original citation snapshot.

---

### Task 1: Read-only Oracle II retriever

**Files:**
- Create: `src/lib/oracle-grounding.ts`
- Create: `tests/oracle-grounding.test.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: `retrieveOracleGrounding(caseData: CaseState): OracleGroundingBundle`; `OracleGroundingBundle`; `ORACLE_GROUNDING_CAPABILITY`.
- Consumes: Oracle II SQLite FTS tables and the validated `CaseState` contract.

- [x] Write failing tests for exact provenance, six-result/1,600-character bounds, candidate-first ranking, page fallback, no-match, query safety, and unchanged database SHA-256.
- Historical pre-implementation retrieval RED run: execution evidence was not retained; final7-test retrieval run was directly observed.
- [x] Implement normalized bounded FTS retrieval across candidate and curated-fact indexes, then bounded `source_pages_v2` fallback, with read-only/query-only SQLite access and immutable snapshots.
- [x] Add the narrow `/api/mira` output trace include for the SQLite asset.
- [x] Run the targeted test; expect pass.

### Task 2: Backward-compatible MIRA grounding capability

**Files:**
- Modify: `D:/DEV/gafferverse/mira-system/assist/service/contract/mira-step-request.schema.json`
- Modify: `D:/DEV/gafferverse/mira-system/assist/service/contract.py`
- Modify: `D:/DEV/gafferverse/mira-system/assist/service/prompts.py`
- Modify: `D:/DEV/gafferverse/mira-system/assist/service/engine.py`
- Modify: `D:/DEV/gafferverse/mira-system/assist/service/app.py`
- Modify: `D:/DEV/gafferverse/mira-system/assist/service/tests/test_step_api.py`

**Interfaces:**
- Consumes: `OracleGroundingBundle` JSON shape produced by Task 1.
- Produces: legacy `contractVersion: "1"` plus advertised `oracle-grounding-v1`; optional validated `grounding`; grounded prompt composition in every model branch.

- [x] Write failing service tests for capability advertising, strict envelope validation, unchanged legacy request, unchanged patient case, and quotation presence in planning/full/fast diagnosis/workup/therapy prompts.
- Historical pre-implementation service RED run: no retained evidence; final targeted50/full155 service passes were directly observed.
- [x] Extend the strict request schema without changing the response contract or legacy required fields.
- [x] Add one prompt formatter and pass grounding through engine/app to every enabled branch.
- [x] Run targeted service tests; expect pass with fake clients only.

### Task 3: Grounded gateway, persistence, and display

**Files:**
- Modify: `src/lib/mira/gateway.ts`
- Modify: `src/lib/mira/client.ts`
- Modify: `src/lib/mira/contract.ts`
- Modify: `src/lib/mira/presentation.ts`
- Modify: `src/components/document-studio.tsx`
- Modify: `tests/mira-paid.test.ts`
- Modify: `tests/mira-client.test.ts`
- Modify: `tests/mira-composer.test.ts`
- Modify: `tests/diagnosis-presentation.test.ts`
- Modify: `src/components/mira-case-form.tsx` (same validated client path; no design styling)
- Modify: `src/app/api/mira/route.ts`
- Create: `src/lib/oracle-grounding-types.ts`

**Interfaces:**
- Consumes: Task 1 retriever and Task 2 capability/envelope contract.
- Produces: fail-closed pre-inference gateway, grounded `MiraAnalysis`, immutable draft provenance, citation section and accurate source-pane label.

- [x] Write failing tests for capability negotiation, no-match/no-call behavior, bundle forwarding, client validation, saved source snapshot, legacy compatibility, regeneration, and display copy.
- [x] Observe targeted RED: five gateway/client grounding failures before their integration, followed by passing verification.
- [x] Integrate retrieval before service inference and preserve the bundle through client/presentation.
- [x] Render reference-selection citations separately and condition the source-pane caption.
- [x] Run targeted tests; expect pass.

### Task 4: Verification and capsule handoff

**Files:**
- Create: `scripts/benchmark-oracle-grounding.mjs`
- Modify: `package.json`
- Modify: `.agents/HANDOFF.md`
- Modify: `D:/DEV/gafferverse/mira-system/assist/README.md` or local handoff only if required by that repository.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: performance evidence, full gate evidence, corpus-integrity evidence, and an exact two-repository delta manifest.

- [x] Add and run a deterministic warm retrieval benchmark with no provider call.
- [x] Run Sentrapedia typecheck, lint on changed files, targeted/full tests, build, and deploy dry run.
- [x] Run the local MIRA targeted/full service tests without credentials or network calls.
- [x] Verify the SQLite SHA-256 and original corpus file state are unchanged.
- [x] Perform practical standalone/extraction verification and record any environment limitation precisely.
- [x] Add one newest capsule HANDOFF entry with files, gate exit codes, performance, risks, and next actions; keep five entries and archive older entries if the file uses discrete entries.

## Completion evidence

Completed 2026-10-10. See `docs/verification/2026-10-10-oracle-ii-grounding.md` for exact
commands, test counts, benchmark, service health and isolated extraction evidence. The retained RED execution showed five missing gateway/client grounding behaviors; historical
retrieval/service RED runs were not independently retained and are not claimed as observed.
The main build file-access failure and one schema-manifest mismatch were recorded; current
scoped gates pass. No install or paid inference ran. The dedicated local MIRA service was
started with the existing launcher; the shared 8787 process was preserved. Design remains
Claude's scope. Independent reviewer closed two P2 findings and reviewed sensitive package
and standalone contract changes. `project.contract.json` now includes the new grounding tests.
