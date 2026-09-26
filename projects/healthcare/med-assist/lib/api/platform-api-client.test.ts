// Designed and constructed by Drferdi.
/**
 * platform-api-client — RED test suite.
 *
 * Invariants under test:
 *   - Every method runs `assertNoPII` before the network call.
 *   - Raw patient identifiers are never transmitted in URL, headers, or body;
 *     trajectory calls use a SHA-256 digest derived via `hashPatientRef`.
 *   - Transport errors from `authedFetch` (auth/bridge) pass through
 *     unwrapped so callers can discriminate.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./authed-fetch', async (importOriginal) => {
  // vi.mock factories are hoisted above the import block, so the module's type
  // cannot be named through a top-level import here. Pre-existing; surfaced when
  // this file was re-linted after the shared-types import was vendored out.
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('./authed-fetch')>();
  return {
    ...actual,
    authedFetch: vi.fn(),
  };
});

import { authedFetch, AuthRequiredError, BridgeApiError } from './authed-fetch';
import { PIILeakError } from './pii-guard';
import {
  ackRedFlag,
  diagnose,
  getTrajectory,
  selectSuggestion,
  submitOutcomeFeedback,
} from './platform-api-client';
import type {
  PlatformDiagnoseRequest,
  PlatformDiagnoseResponse,
  PlatformOutcomeFeedbackRequest,
  PlatformRedFlagAckRequest,
  PlatformSuggestionSelectedRequest,
  PlatformTrajectorySuccessResponse,
} from './platform-api-contract';

const authedFetchMock = vi.mocked(authedFetch);

const cleanDiagnoseRequest: PlatformDiagnoseRequest = {
  keluhan_utama: 'Demam tinggi sejak 3 hari',
  usia: 30,
  jenis_kelamin: 'L',
  vital_signs: {
    systolic: 120,
    diastolic: 80,
    heart_rate: 90,
    respiratory_rate: 18,
    spo2: 98,
    temperature: 38.5,
  },
};

const emptyDiagnoseResponse: PlatformDiagnoseResponse = {
  suggestions: [],
  red_flags: [],
  alerts: [],
  processing_time_ms: 42,
  source: 'ai',
  model_version: 'test',
  validation_summary: {
    total_raw: 0,
    total_validated: 0,
    recommended_count: 0,
    review_count: 0,
    must_not_miss_count: 0,
    deferred_count: 0,
    requires_more_data: false,
    unverified_codes: [],
    warnings: [],
  },
  next_best_questions: [],
};

const emptyTrajectorySuccess: PlatformTrajectorySuccessResponse = {
  success: true,
  data: {},
  visit_history: [],
  momentum_history: [],
  meta: {
    patientIdentifier: '00000000',
    visitCount: 0,
    analyzedAt: '2026-04-19T00:00:00.000Z',
  },
};

beforeEach(() => {
  authedFetchMock.mockReset();
});

describe('platform-api-client :: diagnose', () => {
  it('rejects with PIILeakError before the network call when payload contains raw PII', async () => {
    const tainted: PlatformDiagnoseRequest = {
      ...cleanDiagnoseRequest,
      keluhan_utama: 'Tn. Budi Santoso demam sejak 3 hari',
    };
    await expect(diagnose(tainted)).rejects.toBeInstanceOf(PIILeakError);
    expect(authedFetchMock).not.toHaveBeenCalled();
  });

  it('POSTs a clean payload to /api/cdss/diagnose and returns the parsed response', async () => {
    authedFetchMock.mockResolvedValueOnce(emptyDiagnoseResponse);
    const result = await diagnose(cleanDiagnoseRequest);
    expect(authedFetchMock).toHaveBeenCalledTimes(1);
    const [path, init] = authedFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/cdss/diagnose');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(cleanDiagnoseRequest));
    expect(result).toEqual(emptyDiagnoseResponse);
  });

  it('propagates AuthRequiredError from transport without wrapping', async () => {
    authedFetchMock.mockRejectedValueOnce(new AuthRequiredError());
    await expect(diagnose(cleanDiagnoseRequest)).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('propagates BridgeApiError from transport without wrapping', async () => {
    authedFetchMock.mockRejectedValueOnce(new BridgeApiError(500, ''));
    await expect(diagnose(cleanDiagnoseRequest)).rejects.toBeInstanceOf(BridgeApiError);
  });
});

describe('platform-api-client :: getTrajectory', () => {
  it('hashes patientRef to SHA-256 before composing the URL', async () => {
    authedFetchMock.mockResolvedValueOnce(emptyTrajectorySuccess);
    await getTrajectory('ID-0001', 5);
    const [path] = authedFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toMatch(/^\/api\/patients\/[0-9a-f]{64}\/trajectory\?visits=5$/);
    expect(path).not.toContain('ID-0001');
  });

  it('never exposes a PII-looking patientRef in URL, headers, or body', async () => {
    authedFetchMock.mockResolvedValueOnce(emptyTrajectorySuccess);
    const sensitiveRef = '1234567890123456';
    await getTrajectory(sensitiveRef, 3);
    const [path, init] = authedFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).not.toContain(sensitiveRef);
    const headersSerialized = JSON.stringify(init?.headers ?? {});
    expect(headersSerialized).not.toContain(sensitiveRef);
    const bodySerialized = init?.body ? String(init.body) : '';
    expect(bodySerialized).not.toContain(sensitiveRef);
  });
});

describe('platform-api-client :: audit endpoints', () => {
  it('ackRedFlag POSTs session-scoped body to /api/cdss/red-flag-ack', async () => {
    authedFetchMock.mockResolvedValueOnce({ success: true });
    const body: PlatformRedFlagAckRequest = {
      session_id: 'sess-1',
      red_flags: ['syok suspek'],
    };
    await ackRedFlag(body);
    const [path, init] = authedFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/cdss/red-flag-ack');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(body));
  });

  it('selectSuggestion POSTs body to /api/cdss/suggestion-selected', async () => {
    authedFetchMock.mockResolvedValueOnce({ success: true });
    const body: PlatformSuggestionSelectedRequest = {
      session_id: 'sess-1',
      selected_icd: 'I21.0',
      diagnosis_name: 'STEMI anterior',
      rank: 1,
      decision_status: 'recommended',
      selection_intent: 'working_diagnosis',
    };
    await selectSuggestion(body);
    const [path, init] = authedFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/cdss/suggestion-selected');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(body));
  });

  it('submitOutcomeFeedback POSTs body to /api/cdss/outcome-feedback', async () => {
    authedFetchMock.mockResolvedValueOnce({ success: true });
    const body: PlatformOutcomeFeedbackRequest = {
      session_id: 'sess-1',
      selected_icd: 'I21.0',
      final_icd: 'I21.0',
      outcome_confirmed: true,
    };
    await submitOutcomeFeedback(body);
    const [path, init] = authedFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/cdss/outcome-feedback');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(body));
  });

  it('audit endpoints still run the PII guard and reject tainted payloads', async () => {
    const tainted: PlatformRedFlagAckRequest = {
      session_id: 'sess-1',
      red_flags: ['Tn. Budi Santoso menunjukkan syok'],
    };
    await expect(ackRedFlag(tainted)).rejects.toBeInstanceOf(PIILeakError);
    expect(authedFetchMock).not.toHaveBeenCalled();
  });
});
