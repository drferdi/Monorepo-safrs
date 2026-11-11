import { webcrypto } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MEDLENS_ECG_DISCLAIMER } from '@/lib/clinical/medlens/ecg-types';
import { makeMedlensEcgAnalyzeResponse } from '@/tests/medlens-contract/ecg-contract-fixtures';
import { AuthRequiredError, BridgeApiError } from './authed-fetch';
import {
  analyzeEcgImage,
  getMedlensRuntimeStatus,
  isAcceptedEcgImageFile,
  medlensClient,
} from './medlens-client';

const { authedUploadMock, getAuthConfigMock } = vi.hoisted(() => ({
  authedUploadMock: vi.fn(),
  getAuthConfigMock: vi.fn(),
}));

vi.mock('./auth-client', () => ({
  getAuthConfig: getAuthConfigMock,
}));

vi.mock('./authed-fetch', () => {
  class AuthRequiredError extends Error {
    constructor(message = 'Login diperlukan. Silakan login ulang.') {
      super(message);
      this.name = 'AuthRequiredError';
    }
  }

  class BridgeApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.name = 'BridgeApiError';
      this.status = status;
    }
  }

  class BridgeResponseFormatError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.name = 'BridgeResponseFormatError';
      this.status = status;
    }
  }

  return {
    authedUpload: authedUploadMock,
    AuthRequiredError,
    BridgeApiError,
    BridgeResponseFormatError,
  };
});

describe('medlens-client', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('crypto', webcrypto);
    authedUploadMock.mockReset();
    getAuthConfigMock.mockReset();
    getAuthConfigMock.mockResolvedValue({
      baseUrl: 'https://medboard.sentrahai.com',
      automationToken: '',
    });
  });

  it('accepts only PNG and JPEG family for ECG image upload', () => {
    expect(isAcceptedEcgImageFile(new File(['x'], 'ekg.jpg', { type: 'image/jpeg' }))).toBe(true);
    expect(isAcceptedEcgImageFile(new File(['x'], 'ekg.jpeg', { type: 'image/jpeg' }))).toBe(true);
    expect(isAcceptedEcgImageFile(new File(['x'], 'ekg.png', { type: 'image/png' }))).toBe(true);
    expect(isAcceptedEcgImageFile(new File(['x'], 'ekg.gif', { type: 'image/gif' }))).toBe(false);
  });

  it('submits ECG image and normalizes the waveform-first disclaimer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('local unavailable')));
    authedUploadMock.mockResolvedValueOnce(makeMedlensEcgAnalyzeResponse({ disclaimer: '' }));

    const file = new File(['binary'], 'ekg.png', { type: 'image/png' });
    const result = await medlensClient.analyzeEcgImage(file);

    expect(authedUploadMock).toHaveBeenCalledTimes(1);
    expect(authedUploadMock.mock.calls[0][0]).toBe('/api/medlens/ecg/analyze');
    expect((authedUploadMock.mock.calls[0][1] as FormData).get('file')).toBe(file);
    expect(result.disclaimer).toBe(MEDLENS_ECG_DISCLAIMER);
    expect(result.waveform_review_output.status).toBe('ready_for_physician_review');
    expect(result.ecg_clinical_output.status).toBe('insufficient_evidence');
    expect((result as unknown as Record<string, unknown>).clinical_support).toBeUndefined();
  });

  it('injects a trusted uploaded source hash when the backend omits it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('local unavailable')));
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi
          .fn()
          .mockResolvedValue(new Uint8Array(Array.from({ length: 32 }, () => 0xab)).buffer),
      },
    });
    authedUploadMock.mockResolvedValueOnce({
      status: 'ok',
      module: 'ecg',
      image_quality: { readable: true, issues: [] },
      source_file: {
        sourceFileId: '',
        sourceHash: '',
        sourceType: 'ecg_image_with_printed_result',
      },
      extraction_method: 'ocr',
      ocr_metadata: {
        ocr_source: 'crop',
        selected_region: 'structured-ecg',
        region_score: 18,
        candidate_count: 2,
        full_image_ocr_used: false,
      },
      raw_ecg_relevant_text: ['Machine interpretation: Sinus Bradycardia'],
      ignored_or_redacted_identifiers_detected: false,
      physician_verification_required: true,
      audit_log: {
        uploadedSourceHash: null,
        extractionMethod: 'ocr',
        rawExtractedText: ['Machine interpretation: Sinus Bradycardia'],
        rejectedLlmAdditions: [],
        finalRenderedOutput: {
          status: 'insufficient_evidence',
          findingsCount: 0,
          redFlagsCount: 0,
        },
        outputPassedEvidenceGate: false,
      },
      disclaimer: '',
    });

    const result = await analyzeEcgImage(new File(['binary'], 'ekg.png', { type: 'image/png' }));

    expect(result.source_file.sourceHash).toBe('ab'.repeat(32));
    expect(result.source_file.sourceFileId).toBe('ecg-abababababab');
    expect(result.waveform_review_output.status).toBe('blocked');
    expect(result.audit_log.outputPassedEvidenceGate).toBe(false);
  });

  it('prefers the local MedLens route before Crew auth when local MedLens is reachable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(makeMedlensEcgAnalyzeResponse()), { status: 200 })
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeEcgImage(new File(['binary'], 'ekg.png', { type: 'image/png' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authedUploadMock).not.toHaveBeenCalled();
    expect(result.waveform_review_output.status).toBe('ready_for_physician_review');
    expect(result.audit_log.outputPassedEvidenceGate).toBe(true);
  });

  it('falls back to Crew auth transport when local MedLens is unavailable', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('local unavailable'));
    authedUploadMock.mockResolvedValueOnce(makeMedlensEcgAnalyzeResponse({ disclaimer: '' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeEcgImage(new File(['binary'], 'ekg.png', { type: 'image/png' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authedUploadMock).toHaveBeenCalledTimes(1);
    expect(result.physician_verification_required).toBe(true);
    expect(result.waveform_review_output.status).toBe('ready_for_physician_review');
  });

  it('fails closed locally when the backend omits raw OCR text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('local unavailable')));
    const unsafePayload = makeMedlensEcgAnalyzeResponse({ disclaimer: '' });
    unsafePayload.raw_ecg_relevant_text = [];
    if (unsafePayload.waveform_evidence_packet.secondaryOcr) {
      unsafePayload.waveform_evidence_packet.secondaryOcr.rawText = '';
    }
    authedUploadMock.mockResolvedValueOnce(unsafePayload);

    const result = await analyzeEcgImage(new File(['binary'], 'ekg.png', { type: 'image/png' }));

    expect(result.waveform_review_output.status).toBe('blocked');
    expect(result.audit_log.outputPassedEvidenceGate).toBe(false);
    if (result.waveform_review_output.status !== 'blocked') {
      throw new Error('Expected blocked waveform output');
    }
    expect(result.waveform_review_output.failedAssertions).toContain('MISSING_RAW_OCR_TEXT');
  });

  it('keeps the authenticated MedLens packet when local MedLens is unavailable and Crew returns fail-closed output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('local unavailable')));
    authedUploadMock.mockResolvedValueOnce({
      ...makeMedlensEcgAnalyzeResponse(),
      clinical_support: {
        summary: 'Inferior STEMI',
        possible_considerations: [],
        red_flags: ['Acute MI'],
        recommended_physician_checks: [],
      },
    });

    const result = await analyzeEcgImage(new File(['binary'], 'ekg.png', { type: 'image/png' }));

    expect(authedUploadMock).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.waveform_review_output.status).toBe('blocked');
    expect(result.audit_log.outputPassedEvidenceGate).toBe(false);
  });

  it('keeps using local MedLens even when an automation token is configured', async () => {
    getAuthConfigMock.mockResolvedValueOnce({
      baseUrl: 'https://medboard.sentrahai.com',
      automationToken: 'dev-token',
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(makeMedlensEcgAnalyzeResponse({ disclaimer: '' })), {
        status: 200,
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeEcgImage(new File(['binary'], 'ekg.png', { type: 'image/png' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authedUploadMock).not.toHaveBeenCalled();
    expect(result.waveform_review_output.status).toBe('ready_for_physician_review');
    expect(result.audit_log.outputPassedEvidenceGate).toBe(true);
  });

  it('surfaces a graceful unavailable message when the remote MedLens backend is unreachable', async () => {
    authedUploadMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    let message = '';
    try {
      await analyzeEcgImage(new File(['binary'], 'ekg.png', { type: 'image/png' }));
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }

    expect(message).toBe(
      'MedLens belum dapat dijangkau saat ini. Coba lagi nanti atau hubungi admin.'
    );
  });

  it('does not surface developer service details from backend errors', async () => {
    authedUploadMock.mockRejectedValueOnce(
      new BridgeApiError(500, 'Run node services/medlens-local/server.mjs on localhost:4010')
    );

    let message = '';
    try {
      await analyzeEcgImage(new File(['binary'], 'ekg.png', { type: 'image/png' }));
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }

    expect(message).toBe(
      'Analisis MedLens belum dapat diproses. Coba lagi nanti atau hubungi admin.'
    );
  });

  it('reports runtime ready when the MedLens route responds with a file-validation error', async () => {
    authedUploadMock.mockRejectedValueOnce(
      new BridgeApiError(400, 'Field file wajib berisi gambar EKG.')
    );

    await expect(getMedlensRuntimeStatus()).resolves.toMatchObject({
      readiness: 'ready',
      serverReachable: true,
      serverAuthorized: true,
    });
  });

  it('reports server_unreachable instead of auth_required when local MedLens is unavailable and Crew auth is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('local unavailable')));
    authedUploadMock.mockRejectedValueOnce(new AuthRequiredError());

    await expect(getMedlensRuntimeStatus()).resolves.toMatchObject({
      readiness: 'server_unreachable',
      serverReachable: false,
      serverAuthorized: false,
    });
  });

  it('surfaces a clinician-facing unreachable message when local MedLens is unavailable and Crew auth is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('local unavailable')));
    authedUploadMock.mockRejectedValueOnce(new AuthRequiredError());

    let message = '';
    try {
      await analyzeEcgImage(new File(['binary'], 'ekg.png', { type: 'image/png' }));
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }

    expect(message).toBe(
      'MedLens belum dapat dijangkau saat ini. Coba lagi nanti atau hubungi admin.'
    );
  });
});
