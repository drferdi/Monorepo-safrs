// Copyright 2026 Sentra. All rights reserved. Proprietary and confidential.
/**
 * SYMPHONY safety-gate detectors — vendored into medboard.
 *
 * VENDORED 2026-07-28 from `packages/sentra/sentra-nada/src/engine/`
 * (`@sentra/nada@0.0.1`, engine last touched at monorepo commit 06d8c6eb).
 * Only the two detectors medboard actually calls were taken; their type
 * contracts came with `src/types/abyss/symphony.ts`, copied from
 * `packages/shared/shared-types/src/symphony.ts` in the same change.
 *
 * Why a copy and not an import: every app under `apps/` must build and run
 * outside this monorepo (App Independence, `apps/AGENTS.md`), and today each
 * app carries its own algorithms — the Sentra packages are groundwork for a
 * client model that does not exist yet. When it does, apps consume them as
 * published versioned packages (`@sentra/nada@^x.y.z`), never `workspace:*`,
 * and this directory is deleted in that same change.
 *
 * Until then this is a snapshot and can drift from nada. Fix a detector bug in
 * BOTH places, or in neither.
 *
 * This code stays proprietary. medboard must not be published to a public
 * repository while this directory exists.
 */
export {
  anaphylaxisToSymphonyAlerts,
  detectSymphonyAnaphylaxis,
  type SymphonyAnaphylaxisInput,
  type SymphonyAnaphylaxisOrganSystem,
  type SymphonyAnaphylaxisResult,
} from './anaphylaxis'
export {
  detectSymphonyPeSuspect,
  peSuspectToSymphonyAlerts,
  SYMPHONY_PE_SUSPECT_THRESHOLD,
  type SymphonyPeSuspectCriterion,
  type SymphonyPeSuspectInput,
  type SymphonyPeSuspectResult,
} from './pe-suspect'
