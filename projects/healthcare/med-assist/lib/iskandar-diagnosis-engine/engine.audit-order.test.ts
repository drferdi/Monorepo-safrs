import { describe, expect, it, vi } from 'vitest';

vi.mock('./anonymizer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./anonymizer')>()),
  validateAnonymization: () => ({ valid: false, violations: ['NIK'] }),
}));
vi.mock('./audit-logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./audit-logger')>()),
  logDiagnosisRequest: vi.fn().mockResolvedValue(undefined),
}));

import { logDiagnosisRequest } from './audit-logger';
import { DEFAULT_ENGINE_CONFIG, runDiagnosisEngine } from './engine';

import { createEmptyEncounter } from '~/utils/storage';

// A context that failed anonymisation may hold PII; it must not reach the audit store.
describe('runDiagnosisEngine audit order', () => {
  it('writes no audit entry for a context that failed anonymisation', async () => {
    const encounter = createEmptyEncounter('83206', 'PATIENT_TBD');
    await expect(
      runDiagnosisEngine(encounter, { ...DEFAULT_ENGINE_CONFIG, enableAudit: true })
    ).rejects.toThrow('PII leak detected');
    expect(logDiagnosisRequest).not.toHaveBeenCalled();
  });
});
