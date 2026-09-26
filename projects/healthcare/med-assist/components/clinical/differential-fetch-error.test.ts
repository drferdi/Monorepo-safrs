// Designed and constructed by Drferdi.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  LOCAL_DIAGNOSIS_FALLBACK_MESSAGE,
  resolveDifferentialListErrorMessage,
} from './differential-fetch-error';

describe('H6 — single engine dx source (no canonical conflict banner)', () => {
  it('returns empty error when engine returned a non-empty differential', () => {
    expect(resolveDifferentialListErrorMessage(3)).toBe('');
    expect(resolveDifferentialListErrorMessage(1)).toBe('');
  });

  it('returns local fallback only when engine list is empty', () => {
    expect(resolveDifferentialListErrorMessage(0)).toBe(LOCAL_DIAGNOSIS_FALLBACK_MESSAGE);
  });

  it('does not call evaluateCanonicalDifferential in the differential fetch path', () => {
    const source = readFileSync('components/clinical/ClinicalDifferential.tsx', 'utf8');
    // Dead dual-fetch removed: canonical suggestions were discarded while still
    // driving a conflicting fallback banner alongside a healthy engine list.
    expect(source).not.toMatch(/evaluateCanonicalDifferential\s*\(/);
  });
});
