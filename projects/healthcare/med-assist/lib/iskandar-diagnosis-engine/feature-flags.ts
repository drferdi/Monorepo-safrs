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
  // Which diagnosis engine runs (lib/diagnosis-engine/registry.ts). Only the exact value
  // 'mira' selects the candidate engine; anything else, including unset, stays 'legacy'.
  diagnosisEngine: 'legacy' | 'mira';
}

export function getDiagnosisEngineConfig(): DiagnosisEngineFeatureConfig {
  return {
    enableTrajectoryBridge: import.meta.env.SENTRA_DISABLE_TRAJECTORY_BRIDGE !== 'true',
    enableTherapy: import.meta.env.SENTRA_DISABLE_THERAPY !== 'true',
    openaiModel: import.meta.env.SENTRA_OPENAI_MODEL || 'gpt-4o-mini',
    openaiTimeoutMs: parseInt(import.meta.env.SENTRA_OPENAI_TIMEOUT_MS || '12000', 10),
    fallbackToKBOnly: true,
    llmSkipHighConfidenceThreshold: parseFloat(import.meta.env.SENTRA_LLM_SKIP_THRESHOLD || '0.65'),
    diagnosisEngine: import.meta.env.SENTRA_DIAGNOSIS_ENGINE === 'mira' ? 'mira' : 'legacy',
  };
}
