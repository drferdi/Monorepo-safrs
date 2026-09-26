import { describe, expect, it } from 'vitest';

import { makeMedlensEcgAnalyzeResponse } from '@/tests/medlens-contract/ecg-contract-fixtures';
import { MEDLENS_ECG_DISCLAIMER, normalizeMedlensEcgAnalyzeResponse } from './ecg-result-normalizer';

function makeLegacyPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...makeMedlensEcgAnalyzeResponse(),
    waveform_evidence_packet: undefined,
    waveform_review_output: undefined,
    clinical_support: {
      summary: 'Legacy ECG summary that must never drive the UI.',
      possible_considerations: [],
      red_flags: [],
      recommended_physician_checks: [],
    },
    disclaimer: MEDLENS_ECG_DISCLAIMER,
    ...overrides,
  };
}

describe('normalizeMedlensEcgAnalyzeResponse patient safety gate', () => {
  it('fails closed when only legacy OCR-era payloads exist', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalized = normalizeMedlensEcgAnalyzeResponse(makeLegacyPayload() as any);

    expect(normalized.waveform_review_output.status).toBe('blocked');
    if (normalized.waveform_review_output.status !== 'blocked') {
      throw new Error('Expected blocked waveform output');
    }
    expect(normalized.waveform_review_output.failedAssertions).toContain(
      'INSUFFICIENT_WAVEFORM_TRACE_EXTRACTION'
    );
    expect(normalized.ecg_clinical_output.status).toBe('insufficient_evidence');
    expect(normalized.audit_log.outputPassedEvidenceGate).toBe(false);
  });

  it('blocks text-only OCR even when printed interpretation text exists', () => {
    const normalized = normalizeMedlensEcgAnalyzeResponse(
      makeLegacyPayload({
        source_file: {
          sourceFileId: 'src-ocr-1',
          sourceHash:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          sourceType: 'ecg_image_with_printed_result',
        },
        raw_ecg_relevant_text: ['Machine interpretation: Sinus Bradycardia'],
        ocr_extracted_values: {
          machine_interpretation_text: 'Sinus Bradycardia',
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );

    expect(normalized.waveform_review_output.status).toBe('blocked');
    if (normalized.waveform_review_output.status !== 'blocked') {
      throw new Error('Expected blocked waveform output');
    }
    expect(normalized.waveform_review_output.failedAssertions).toContain(
      'TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT'
    );
    expect(normalized.ecg_clinical_output.findings).toEqual([]);
  });

  it('blocks unsafe legacy diagnosis text even if waveform packet is otherwise present', () => {
    const normalized = normalizeMedlensEcgAnalyzeResponse(
      {
        ...makeMedlensEcgAnalyzeResponse(),
        clinical_support: {
          summary: 'Inferior STEMI',
          possible_considerations: [],
          red_flags: ['Acute MI'],
          recommended_physician_checks: [],
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    );

    expect(normalized.waveform_review_output.status).toBe('blocked');
    if (normalized.waveform_review_output.status !== 'blocked') {
      throw new Error('Expected blocked waveform output');
    }
    expect(normalized.waveform_review_output.reason).toBe('UNSAFE_LEGACY_FIELD_DETECTED');
    expect(normalized.audit_log.rejectedLlmAdditions).toContain('Inferior STEMI');
  });

  it('preserves physician review requirement in blocked output', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalized = normalizeMedlensEcgAnalyzeResponse(makeLegacyPayload() as any);

    expect(normalized.ecg_clinical_output.clinicianReviewRequired).toBe(true);
    expect(normalized.physician_verification_required).toBe(true);
  });

  it('allows physician-review packets only when waveform evidence is complete', () => {
    const normalized = normalizeMedlensEcgAnalyzeResponse(makeMedlensEcgAnalyzeResponse());

    expect(normalized.waveform_review_output.status).toBe('ready_for_physician_review');
    if (normalized.waveform_review_output.status !== 'ready_for_physician_review') {
      throw new Error('Expected physician-review waveform output');
    }
    expect(normalized.waveform_review_output.clinicalOutputAllowed).toBe(true);
    expect(normalized.ecg_clinical_output.status).toBe('insufficient_evidence');
    expect(normalized.audit_log.outputPassedEvidenceGate).toBe(true);
  });
});
