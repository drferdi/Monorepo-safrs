import { describe, expect, it } from 'vitest';

import { makeMedlensEcgAnalyzeResponse } from '@/tests/medlens-contract/ecg-contract-fixtures';
import type { MedlensEcgAnalyzeResponse } from './ecg-types';
import {
  MEDLENS_ECG_DISCLAIMER,
  normalizeMedlensEcgAnalyzeResponse,
} from './ecg-result-normalizer';

describe('normalizeMedlensEcgAnalyzeResponse', () => {
  it('preserves the waveform-first disclaimer', () => {
    const normalized = normalizeMedlensEcgAnalyzeResponse(
      makeMedlensEcgAnalyzeResponse({ disclaimer: '' })
    );

    expect(normalized.disclaimer).toBe(MEDLENS_ECG_DISCLAIMER);
    expect(normalized.physician_verification_required).toBe(true);
  });

  it('fills missing OCR metadata while keeping OCR secondary only', () => {
    const normalized = normalizeMedlensEcgAnalyzeResponse({
      ...makeMedlensEcgAnalyzeResponse(),
      ocr_metadata: undefined,
    } satisfies Partial<MedlensEcgAnalyzeResponse>);

    expect(normalized.ocr_metadata).toEqual({
      ocr_source: 'unavailable',
      selected_region: null,
      region_score: 0,
      candidate_count: 0,
      full_image_ocr_used: false,
    });
    expect(normalized.waveform_review_output.status).toBe('ready_for_physician_review');
    expect(normalized.ecg_clinical_output.status).toBe('insufficient_evidence');
  });

  it('quarantines legacy summary text instead of rendering OCR-derived clinical output', () => {
    const normalized = normalizeMedlensEcgAnalyzeResponse({
      ...makeMedlensEcgAnalyzeResponse(),
      waveform_evidence_packet: undefined,
      raw_ecg_relevant_text: ['Machine interpretation: Sinus Bradycardia'],
      clinical_support: {
        summary: 'Inferior STEMI',
        possible_considerations: [],
        red_flags: ['Acute MI'],
        recommended_physician_checks: [],
      },
    } as unknown);

    expect(normalized.waveform_review_output.status).toBe('blocked');
    if (normalized.waveform_review_output.status !== 'blocked') {
      throw new Error('Expected blocked waveform output');
    }
    expect(normalized.waveform_review_output.reason).toBe('UNSAFE_LEGACY_FIELD_DETECTED');
    expect(normalized.ecg_clinical_output.status).toBe('insufficient_evidence');
    expect(normalized.audit_log.rejectedLlmAdditions).toContain('Inferior STEMI');
    expect(normalized.audit_log.rejectedLlmAdditions).toContain(
      'UNSAFE_LEGACY_FIELD:clinical_support.summary'
    );
  });

  it('fails closed when the source hash is missing', () => {
    const normalized = normalizeMedlensEcgAnalyzeResponse(
      makeMedlensEcgAnalyzeResponse({
        source_file: {
          sourceFileId: 'src-missing-hash',
          sourceHash: '',
          sourceType: 'ecg_image_with_printed_result',
        },
      })
    );

    expect(normalized.waveform_review_output.status).toBe('blocked');
    if (normalized.waveform_review_output.status !== 'blocked') {
      throw new Error('Expected blocked waveform output');
    }
    expect(normalized.waveform_review_output.failedAssertions).toContain(
      'MISSING_OR_INVALID_SOURCE_IMAGE_HASH'
    );
    expect(normalized.audit_log.outputPassedEvidenceGate).toBe(false);
  });

  it('fails closed when raw OCR text is missing even if waveform evidence exists', () => {
    const response = makeMedlensEcgAnalyzeResponse();
    response.raw_ecg_relevant_text = [];
    if (response.waveform_evidence_packet.secondaryOcr) {
      response.waveform_evidence_packet.secondaryOcr.rawText = '';
    }

    const normalized = normalizeMedlensEcgAnalyzeResponse(response);

    expect(normalized.waveform_review_output.status).toBe('blocked');
    if (normalized.waveform_review_output.status !== 'blocked') {
      throw new Error('Expected blocked waveform output');
    }
    expect(normalized.waveform_review_output.failedAssertions).toContain('MISSING_RAW_OCR_TEXT');
    expect(normalized.audit_log.outputPassedEvidenceGate).toBe(false);
  });

  it('uses the trusted uploaded source hash when the backend omits it', () => {
    const normalized = normalizeMedlensEcgAnalyzeResponse(
      {
        status: 'ok',
        module: 'ecg',
        image_quality: { readable: true, issues: [] },
        source_file: {
          sourceFileId: '',
          sourceHash: '',
          sourceType: 'ecg_image_with_printed_result',
        },
        extraction_method: 'ocr',
        raw_ecg_relevant_text: ['Machine interpretation: Sinus Bradycardia'],
        physician_verification_required: true,
        ignored_or_redacted_identifiers_detected: false,
        audit_log: {
          uploadedSourceHash: null,
          extractionMethod: 'ocr',
          rawExtractedText: [],
          rejectedLlmAdditions: [],
          finalRenderedOutput: {
            status: 'insufficient_evidence',
            findingsCount: 0,
            redFlagsCount: 0,
          },
          outputPassedEvidenceGate: false,
        },
      } as Partial<MedlensEcgAnalyzeResponse>,
      {
        trustedSourceHash: '9f2e7f8f7b8e1e7d50f74f55f91bb3c0eb505d1a4d4bf11f0e0d4b7f1c2a3d4e',
      }
    );

    expect(normalized.source_file.sourceHash).toBe(
      '9f2e7f8f7b8e1e7d50f74f55f91bb3c0eb505d1a4d4bf11f0e0d4b7f1c2a3d4e'
    );
    expect(normalized.source_file.sourceFileId).toBe('ecg-9f2e7f8f7b8e');
    expect(normalized.waveform_review_output.status).toBe('blocked');
    expect(normalized.audit_log.outputPassedEvidenceGate).toBe(false);
  });

  it('preserves secondary OCR raw text when top-level OCR lines are omitted', () => {
    const response = makeMedlensEcgAnalyzeResponse();
    response.raw_ecg_relevant_text = [];
    if (!response.waveform_evidence_packet.secondaryOcr) {
      throw new Error('Expected fixture with secondary OCR support');
    }
    response.waveform_evidence_packet.secondaryOcr.rawText =
      'Machine interpretation: Sinus Bradycardia\nBorderline ECG';

    const normalized = normalizeMedlensEcgAnalyzeResponse(response);

    expect(normalized.raw_ecg_relevant_text).toEqual([
      'Machine interpretation: Sinus Bradycardia',
      'Borderline ECG',
    ]);
    expect(normalized.audit_log.rawExtractedText).toEqual([
      'Machine interpretation: Sinus Bradycardia',
      'Borderline ECG',
    ]);
  });
});
