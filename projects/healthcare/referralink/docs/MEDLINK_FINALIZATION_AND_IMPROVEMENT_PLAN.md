# MEDLINK Finalization and Improvement Plan

Status: Implementation finalized; deployment and live-provider acceptance not
run

Date: 2026-07-22

Scope: `apps/healthcare/referralink` only

## 1. Purpose

This document converts the current implementation, repository evidence, and a
fresh desktop/mobile product audit into an executable finalization backlog. It
does not authorize changes to production authentication, clinical behavior,
deployment, secrets, or patient data handling.

## 2. Evidence and constraints

The assessment used:

- repository SSOT and governance (`AGENTS.md`, `.agent/*`, and app boundary
  preflight);
- current source, manifest, scoped Git history, and working-tree status;
- the canonical Sentra design source at
  `apps/internal/sentrahub/sentra-hub.html`;
- a fresh local browser audit of SentraBoard, MedLink, Logbook, Credential,
  Sentrapedia, Notifications, and Settings at desktop and mobile viewports.

The finalization pass did not read `.env`, secrets, or PHI; invoke a live
model/provider-backed diagnosis; validate production infrastructure; or deploy.
Offline checks and provider-independent Playwright acceptance used synthetic
fixtures only.

## 3. Current product position

MEDLINK is active work, not legacy. It is a React 19 + Vite 6 + TypeScript
healthcare decision-support sandbox with a Vercel-style diagnosis API,
OpenAI-compatible provider integration, local operational workspaces, and
explicit human-review language.

Implementation evidence (2026-07-22):

- shared IndexedDB v3 storage and irreversible raw Logbook purge implemented;
- minimal schema-v2 redacted audit envelopes and metadata-only Credential
  persistence implemented;
- opaque single-use email challenges, signed eight-hour HttpOnly sessions,
  canonical origin enforcement, distributed quotas, and concurrency enforcement
  implemented with Upstash Redis REST;
- active diagnosis caching and semantic-cache artifacts removed;
- canonical Sentra light/dark design, complete 390px navigation, Indonesian UI
  glossary, accessible async states, and destructive Logbook confirmations
  implemented;
- package verification is reproducible through `test`, `test:browser`, `lint`,
  and `build`;
- Playwright acceptance covers synthetic email-code auth, same-origin session,
  diagnosis success/error states, desktop and 390px routes, both themes,
  keyboard focus return, 200% reflow equivalence, IndexedDB v3 migration,
  Credential persistence/fallback, and destructive confirmations.

This evidence describes repository code posture only. Deployment, live email,
live Redis, live model-provider, and production-infrastructure acceptance were
not run in this finalization pass.

Recent repository history and present source show that the operational workspace
milestone is substantially implemented:

| Area                       | Current evidence                                                                                                          | Finalization state                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Diagnosis                  | Versioned structured response, validation, no-cache policy, origin/session/quota/concurrency gates before provider access | Implemented; live-provider acceptance not run                         |
| SentraBoard                | Local Logbook-derived metrics and recent activity                                                                         | Implemented; depends on storage integrity and data-boundary decisions |
| Logbook                    | Schema-v2 redacted audit envelope, v3 raw-history purge, filters, confirmation, recovery status                           | Implemented; synthetic browser migration acceptance passed            |
| Credential                 | Metadata-only repository, no browser secret storage, shared v3 schema                                                     | Implemented; synthetic browser persistence/fallback acceptance passed |
| Sentrapedia                | Deterministic 144-entry reference catalog with search and compact mobile category selection                               | Implemented                                                           |
| Notifications and Settings | Redacted local signals, canonical theme preference, shared v3 schema                                                      | Implemented; synthetic authenticated browser acceptance passed        |
| Navigation                 | Desktop and focus-managed compact navigation with hash-derived active state                                               | Implemented                                                           |

The older operational workspace plan still contains unchecked task boxes even
though matching implementation commits and files exist. Those boxes are
progress-ledger drift, not proof that the product slices are absent.

## 4. Finalization outcomes and remaining acceptance

### P0 — Finalization blockers

#### F-01: Repair the shared IndexedDB schema

Status: implemented and covered by repository tests; retained-browser migration
acceptance was not run.

`logbookRepository.ts` and `credentialRepository.ts` both open
`medlink-workspace-v1` at version `1`, but each creates only its own object
store during `onupgradeneeded`. Once one repository creates the database, the
other store is never created at the same version. The observed result is
Credential and Settings falling back to session memory while Logbook remains
persistent.

Implementation status (2026-07-22): the repositories now use one version-2
database opener that idempotently provisions both stores. Contract coverage
includes legacy databases created in either repository order and an
already-complete database. A live browser migration check with retained
version-1 records remains part of release acceptance.

Required outcome:

- one shared database opener and schema version;
- idempotent creation of both `logbook` and `credentials` stores;
- a tested upgrade path for existing version-1 browser data;
- cross-repository tests covering both initialization orders;
- a visible recovery state if upgrade fails, without silently discarding
  records.

#### F-02: Establish a real server-side access boundary

Status: implemented. The historical browser-trusted boundary described below has
been superseded by opaque challenges, Redis-backed signed sessions, same-origin
enforcement, distributed quotas, and provider-denial tests.

The browser session is stored in `localStorage`, while `/api/diagnosis` does not
demonstrate server-side session verification. CORS configuration also advertises
a wildcard origin. Client-only gating and process-local rate limiting are not
production authorization controls.

Required outcome:

- an approved production identity/session mechanism;
- authorization enforced inside the diagnosis API before provider invocation;
- rate limiting keyed to a trustworthy identity and shared runtime store;
- an explicit allowlist for production origins and a reviewed credential policy;
- negative tests for unauthenticated, unauthorized, and cross-origin requests.

This is a protected auth/deployment boundary and requires explicit approval
before implementation.

#### F-03: Decide and enforce the clinical-data retention boundary

Status: resolved as minimal retention. IndexedDB v3 irreversibly clears legacy
raw Logbook history and stores only the ten-field schema-v2 audit envelope.

Logbook currently retains raw query text and diagnosis output in browser
IndexedDB for up to 90 days and 500 records. A synthetic-data warning is helpful
but is not a technical control against real patient data.

Required decision and outcome:

- approve whether raw narrative storage is allowed at all;
- if allowed, define consent, redaction, retention, deletion, export, and
  device-sharing behavior;
- if not allowed, store a minimal redacted event envelope instead of raw
  clinical text;
- keep human review, uncertainty, provenance, and auditability visible.

#### F-04: Restore an executable verification contract

The package contains test files but has no `test` script. `.agent/VALIDATION.md`
targets `@the-abyss/referralink`, while the package name is `medlink`. Therefore
the documented package filter is stale and the repository has no single reliable
finalization command.

Implementation status (2026-07-22): resolved in Task 1 with a deterministic
recursive Node test runner, package-local `test`, `lint`, and `build` commands,
and an explicit separation between offline checks, browser-storage acceptance,
auth-denial acceptance, and provider-backed checks.

Required outcome:

- correct the package identity in validation documentation;
- add or document one deterministic test runner command;
- group browser-free unit/contract tests separately from provider and browser
  checks;
- make the smallest lint/typecheck, test, build, and browser acceptance sequence
  explicit.

### P1 — Product and experience completion

#### F-05: Migrate the UI to the canonical Sentra design contract

Status: implemented with exact canonical light/dark tokens, font roles, theme
preference, sharp surfaces, 1440px frame, and 12-column grid signature.

The current runtime uses a dark-only Carbon/DB01 layer with extensive hex
colors, rounded surfaces, and accumulated stylesheet overrides. It conflicts
with the mandatory canonical Sentra system.

Required outcome:

- canonical OKLCH light and dark tokens;
- Epilogue, Open Sans, and JetBrains Mono roles;
- a user-controlled `data-theme` light/dark toggle;
- sharp editorial surfaces and canonical mono uppercase controls;
- 1440 px content frame, page gutters, and 12-column grid-overlay signature;
- remove superseded style layers after parity is verified rather than adding
  another override block.

#### F-06: Make every workspace reachable and correctly identified on mobile

Status: implemented with a focus-managed compact menu, Escape handling,
hash-derived active state, Settings access, and mobile logout.

At 390 px, the horizontal navigation exposes only the first destinations;
Credential, Sentrapedia, and Settings are hidden. A directly opened Sentrapedia
route still presents MedLink as the visually active item.

Required outcome:

- an explicit compact navigation pattern with all destinations reachable;
- correct active-route semantics for direct links and refreshes;
- visible overflow/menu affordance without relying on horizontal discovery;
- keyboard and screen-reader operability;
- preserved clinical guardrails within the first useful viewport.

#### F-07: Improve Sentrapedia information density

Status: implemented with separated result rows and a compact native category
selector at narrow widths.

The catalog works, but category controls dominate the mobile viewport and
adjacent entry metadata is difficult to scan on desktop.

Required outcome:

- clearer entry boundaries and metadata hierarchy;
- compact mobile category selection;
- preserved search and deterministic catalog behavior;
- accessible empty, loading, and no-result states.

#### F-08: Complete product-state and accessibility coverage

Status: repository contracts and provider-independent browser acceptance passed
for announced error states, responsive navigation, destructive confirmation,
keyboard focus return, and 200% reflow equivalence. Screen-reader testing and
measured contrast validation remain not run.

The Playwright pass covers synthetic success/error states, email-code auth,
destructive confirmations, keyboard navigation, focus return, and a halved CSS
viewport as the 200% desktop reflow equivalent. It does not claim live-provider
behavior, production identity infrastructure, screen-reader conformance, or
measured color contrast.

Required outcome:

- approved synthetic fixtures for success, partial, timeout, malformed, and
  provider-failure states;
- keyboard and focus-order acceptance checks;
- contrast measurements for small labels, timestamps, warnings, and status
  colors;
- non-color status cues and announced live-state changes;
- confirmation and recovery behavior for clear/delete actions.

### P2 — Debt reduction and SSOT reconciliation

#### F-09: Remove or reclassify inactive semantic-cache artifacts

Status: implemented. Active cache code, health endpoint, response fields, and
the package dependency were removed. The root lockfile was regenerated from all
41 active workspace manifests and passes frozen lockfile validation.

The historical cache artifacts listed in the original finding are no longer in
the active runtime or MEDLINK importer.

#### F-10: Reconcile progress and project documentation

Status: app README, environment contract, finalization plan, and execution plan
reconciled. Root `.agent/**` remains local/protected and was not committed by
this task. The existing untracked `PROJECT_CURRENT_STATUS_REPORT.md` was not
modified.

Update the README and local `.agent` continuity records to describe the
operational workspaces, current package identity, storage model, security
posture, and verification commands. Reconcile the unchecked July 21 plan against
implemented commits instead of treating it as an open task list. Review the
untracked `PROJECT_CURRENT_STATUS_REPORT.md` separately because it is already
stale relative to current source and Git history.

#### F-11: Normalize language and microcopy

Status: implemented through typed `UI_COPY`, a single canonical synthetic-data
guardrail, Indonesian navigation/actions/states, and stable public errors.

The interface mixes Indonesian and English labels. Define product locale
behavior and apply one terminology glossary to navigation, status, clinical
guardrails, actions, and errors.

## 5. Historical visual audit baseline

| Audit step                | General health                | Primary finding                                                                |
| ------------------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| 1. SentraBoard, desktop   | Functional                    | Clear metrics; visual system is not canonical Sentra                           |
| 2. MedLink, desktop       | Functional empty state        | Strong human-review framing; excessive empty space and low-contrast microcopy  |
| 3. Logbook, desktop       | Functional                    | Useful filters; raw narrative retention requires policy and enforcement        |
| 4. Credential, desktop    | Degraded                      | Persistent metadata storage unavailable due to shared DB schema collision      |
| 5. Sentrapedia, desktop   | Functional but dense          | Weak entry separation and filter affordance                                    |
| 6. Notifications, desktop | Functional                    | Tiny timestamps and status semantics need accessibility checks                 |
| 7. Settings, desktop      | Degraded                      | Correctly reports session fallback; theme control is absent                    |
| 8. MedLink, mobile        | Partially usable              | Core form reflows; navigation overflow hides destinations                      |
| 9. Sentrapedia, mobile    | Route works, navigation fails | Destination is hidden and MedLink appears active; filters consume the viewport |

This table records the pre-implementation audit and is retained for provenance;
its findings are superseded where section 4 records an implemented outcome. No
WCAG conformance claim is made without the pending browser/accessibility pass.

## 6. Recommended execution sequence

### Gate 0 — Reconcile the baseline

1. Confirm package identity and mark implemented plan tasks from source/commit
   evidence.
2. Establish the test command and capture a clean pre-change baseline.
3. Record explicit product decisions for authentication, raw narrative
   retention, and Credential scope.

Exit criterion: one trustworthy backlog and one reproducible validation
sequence.

### Gate 1 — Correct storage and protected boundaries

1. Implement the shared IndexedDB schema upgrade and cross-order tests.
2. Finalize the clinical-data storage policy and enforce it.
3. After explicit approval, implement server-side auth, durable rate limiting,
   and origin policy.

Exit criterion: no silent session fallback; no provider call without server
authorization; approved data handling is technically enforced.

### Gate 2 — Converge on the canonical design system

1. Introduce canonical tokens, typography, layout frame, and theme state.
2. Migrate shared shell/navigation/controls before workspace-specific surfaces.
3. Remove superseded DB01 overrides as each slice reaches parity.

Exit criterion: both themes, canonical components, and no legacy override stack
controlling migrated screens.

### Gate 3 — Finish mobile and accessibility behavior

1. Replace hidden/overflow-dependent navigation with a complete compact pattern.
2. Correct route-active semantics and Sentrapedia density.
3. Validate keyboard, focus, contrast, zoom, status announcements, and
   destructive actions.

Exit criterion: every workspace is reachable and operable at desktop and 390 px
without hidden core actions.

### Gate 4 — Release evidence

1. Run unit/contract tests, typecheck, build, and approved browser scenarios.
2. Capture provider-independent synthetic states and production-like auth denial
   states.
3. Review the scoped diff, update SSOT, and publish remaining limitations.

Exit criterion: all P0 items closed, P1 acceptance criteria met, and remaining
P2 debt explicitly owned.

## 7. First implementation slice

Start with F-01 only: create a shared IndexedDB schema module, add the version-1
upgrade path, and prove both repository initialization orders. This is the
smallest bounded change that removes a user-visible failure and stabilizes
SentraBoard, Logbook, Credential, and Settings before broader visual work.

## 8. Decisions required before protected work

1. Is MEDLINK intended to become publicly reachable production software, or
   remain an internal/synthetic sandbox?
2. May Logbook retain raw clinical narrative locally, and if so under what
   retention and consent policy?
3. Should Credential remain metadata-only with no browser secret storage, or
   integrate with an approved server-side vault?
4. Is the canonical Sentra migration a full replacement of the current DB01
   layer, as required by repository policy, or is an explicitly approved one-off
   exception intended?
