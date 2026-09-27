/**
 * Picks the diagnosis engine from the `diagnosisEngine` flag (default `'legacy'`).
 *
 * @module lib/diagnosis-engine/registry
 */

import { createLegacyEngine, type LegacyDiagnosisEngine } from './legacy-engine';
import { createMiraEngine } from './mira-engine';
import type { DiagnosisEngine, DiagnosisEngineId } from './types';

import { getDiagnosisEngineConfig } from '@/lib/iskandar-diagnosis-engine/feature-flags';

let legacyEngine: LegacyDiagnosisEngine | null = null;
let miraEngine: DiagnosisEngine | null = null;

/** The legacy engine is always available: it is the physician-facing path and the fallback. */
export function getLegacyEngine(): LegacyDiagnosisEngine {
  legacyEngine ??= createLegacyEngine();
  return legacyEngine;
}

export function getActiveDiagnosisEngine(
  engineId: DiagnosisEngineId = getDiagnosisEngineConfig().diagnosisEngine
): DiagnosisEngine {
  switch (engineId) {
    case 'legacy':
      return getLegacyEngine();
    case 'mira':
      miraEngine ??= createMiraEngine();
      return miraEngine;
  }
}
