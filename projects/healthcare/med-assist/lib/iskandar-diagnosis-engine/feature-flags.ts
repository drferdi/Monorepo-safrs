export type DiagnosisEngineMode = 'legacy' | 'shadow' | 'mira';

function parseDiagnosisEngineMode(value: unknown): DiagnosisEngineMode {
  return value === 'shadow' || value === 'mira' ? value : 'legacy';
}

export interface DiagnosisEngineFeatureConfig {
  enableTrajectoryBridge: boolean;
  enableTherapy: boolean;
  // Build-time default model; overridable per-installation via Settings UI
  // (see openai-key-store.ts). The API key is NEVER read from env — it is a
  // secret and must not be inlined into the shipped bundle.
  openaiModel: string;
  openaiTimeoutMs: number;
  fallbackToKBOnly: boolean;
  // If KB top-1 matchScore >= this threshold, skip LLM call entirely
  llmSkipHighConfidenceThreshold: number;
  // Which diagnosis engine the physician sees (lib/diagnosis-engine/run-diagnosis.ts):
  // 'legacy' only; 'shadow' runs MIRA in the background (audited, not awaited); 'mira' shows
  // MIRA and falls back to legacy when MIRA fails. Anything else, including unset, is 'legacy'.
  diagnosisEngine: DiagnosisEngineMode;
}

export function getDiagnosisEngineConfig(): DiagnosisEngineFeatureConfig {
  return {
    enableTrajectoryBridge: import.meta.env.SENTRA_DISABLE_TRAJECTORY_BRIDGE !== 'true',
    enableTherapy: import.meta.env.SENTRA_DISABLE_THERAPY !== 'true',
    openaiModel: import.meta.env.SENTRA_OPENAI_MODEL || 'gpt-4o-mini',
    openaiTimeoutMs: parseInt(import.meta.env.SENTRA_OPENAI_TIMEOUT_MS || '12000', 10),
    fallbackToKBOnly: true,
    llmSkipHighConfidenceThreshold: parseFloat(import.meta.env.SENTRA_LLM_SKIP_THRESHOLD || '0.65'),
    diagnosisEngine: parseDiagnosisEngineMode(import.meta.env.SENTRA_DIAGNOSIS_ENGINE),
  };
}
