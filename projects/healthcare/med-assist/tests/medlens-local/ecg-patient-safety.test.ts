// @vitest-environment node

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();
}

async function createTestFile(width = 1200, height = 800, name = 'ekg.png'): Promise<File> {
  const buffer = await createTestImage(width, height);
  return new File([new Uint8Array(buffer)], name, { type: 'image/png' });
}

async function loadAnalyzerModule(): Promise<{
  analyzeEcgImageFile: (
    file: File,
    options?: {
      ocrEnabled?: boolean;
      recognizeTextFromImageBuffer?: (inputBuffer: Buffer) => Promise<
        | string
        | {
            text: string;
            source: 'crop' | 'full-image';
            regionId: string | null;
            fallbackUsed: boolean;
            score: number;
            candidateCount: number;
            identifierDetected?: boolean;
          }
      >;
      detectWaveformPresence?: (inputBuffer: Buffer) => Promise<boolean> | boolean;
    }
  ) => Promise<Record<string, unknown>>;
}> {
  // @ts-expect-error runtime-only local service
  return import('../../services/medlens-local/ecg-analyzer.mjs');
}

type PatientSafetyResult = {
  waveform_review_output: {
    status: string;
    clinicalOutputAllowed?: boolean;
    reason?: string;
    failedAssertions: string[];
  };
  ecg_clinical_output: {
    status?: string;
    findings: unknown[];
  };
  audit_log: {
    outputPassedEvidenceGate: boolean;
  };
};

describe('MedLens ECG patient safety hotfix', () => {
  it('returns blocked waveform output for non-ECG image input', async () => {
    const { analyzeEcgImageFile } = await loadAnalyzerModule();
    const file = await createTestFile();

    const result = (await analyzeEcgImageFile(file, {
      ocrEnabled: true,
      recognizeTextFromImageBuffer: async () => ({
        text: '',
        source: 'crop',
        regionId: 'structured-ecg',
        fallbackUsed: false,
        score: 0,
        candidateCount: 2,
        identifierDetected: false,
      }),
      detectWaveformPresence: async () => false,
    })) as PatientSafetyResult;

    expect(result.waveform_review_output.status).toBe('blocked');
    expect(result.waveform_review_output.clinicalOutputAllowed).toBe(false);
    expect(result.ecg_clinical_output.status).toBe('insufficient_evidence');
    expect(result.ecg_clinical_output.findings).toEqual([]);
  });

  it('keeps blurry ECG input fail-closed even when OCR sees text fragments', async () => {
    const { analyzeEcgImageFile } = await loadAnalyzerModule();
    const file = await createTestFile(320, 320, 'blurry-ekg.png');

    const result = (await analyzeEcgImageFile(file, {
      ocrEnabled: true,
      recognizeTextFromImageBuffer: async () => ({
        text: 'Machine interpretation: Sinus Bradycardia',
        source: 'crop',
        regionId: 'structured-ecg',
        fallbackUsed: false,
        score: 18,
        candidateCount: 2,
        identifierDetected: false,
      }),
      detectWaveformPresence: async () => false,
    })) as PatientSafetyResult;

    expect(result.waveform_review_output.status).toBe('blocked');
    expect(result.waveform_review_output.failedAssertions).toContain('IMAGE_UNREADABLE');
    expect(result.ecg_clinical_output.findings).toEqual([]);
  });

  it('blocks waveform-only source when extracted evidence does not satisfy the gate', async () => {
    const { analyzeEcgImageFile } = await loadAnalyzerModule();
    const file = await createTestFile();

    const result = (await analyzeEcgImageFile(file, {
      ocrEnabled: true,
      recognizeTextFromImageBuffer: async () => ({
        text: '',
        source: 'crop',
        regionId: 'structured-ecg',
        fallbackUsed: false,
        score: 0,
        candidateCount: 2,
        identifierDetected: false,
      }),
      detectWaveformPresence: async () => true,
    })) as PatientSafetyResult;

    expect(result.waveform_review_output.status).toBe('blocked');
    expect(result.waveform_review_output.reason).toBe('WAVEFORM_EVIDENCE_GATE_FAILED');
    expect(result.waveform_review_output.failedAssertions).toContain(
      'INSUFFICIENT_WAVEFORM_TRACE_EXTRACTION'
    );
  });

  it('blocks OCR-only machine interpretation output', async () => {
    const { analyzeEcgImageFile } = await loadAnalyzerModule();
    const file = await createTestFile();

    const result = (await analyzeEcgImageFile(file, {
      ocrEnabled: true,
      recognizeTextFromImageBuffer: async () => ({
        text: 'Machine interpretation: Sinus Bradycardia',
        source: 'crop',
        regionId: 'structured-ecg',
        fallbackUsed: false,
        score: 18,
        candidateCount: 2,
        identifierDetected: false,
      }),
      detectWaveformPresence: async () => false,
    })) as PatientSafetyResult;

    expect(result.waveform_review_output.status).toBe('blocked');
    expect(result.waveform_review_output.failedAssertions).toContain(
      'TEXT_ONLY_OCR_CANNOT_SUPPORT_CLINICAL_OUTPUT'
    );
    expect(result.ecg_clinical_output.findings).toEqual([]);
  });

  it('keeps review packets blocked until enough waveform evidence exists', async () => {
    const { analyzeEcgImageFile } = await loadAnalyzerModule();
    const file = await createTestFile();

    const result = (await analyzeEcgImageFile(file, {
      ocrEnabled: false,
      detectWaveformPresence: async () => true,
    })) as PatientSafetyResult;

    expect(result.waveform_review_output.status).toBe('blocked');
    expect(result.waveform_review_output.reason).toBe('WAVEFORM_EVIDENCE_GATE_FAILED');
    expect(result.waveform_review_output.failedAssertions).toContain(
      'INSUFFICIENT_WAVEFORM_TRACE_EXTRACTION'
    );
    expect(result.audit_log.outputPassedEvidenceGate).toBe(false);
  });

  it('fails closed when the waveform packet is missing a source hash', async () => {
    const { extractWaveformPacketFromImage } =
      await import('../../services/medlens-local/ecg-waveform.mjs');
    const sharpModule = await import('sharp');
    const file = await createTestFile();
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharpModule.default(inputBuffer).metadata();

    const result = await extractWaveformPacketFromImage({
      inputBuffer,
      sourceHash: '',
      file,
      metadata,
      imageQuality: {
        readable: true,
        status: 'readable',
        issues: [],
      },
      textSupport: {
        raw_ecg_relevant_text: ['Machine interpretation: Sinus Bradycardia'],
        ocr_extracted_values: {
          machine_interpretation_text: 'Sinus Bradycardia',
        },
        limitations: [],
        ignored_or_redacted_identifiers_detected: false,
      },
    });

    expect(result.reviewOutput.status).toBe('blocked');
    expect(result.reviewOutput.failedAssertions).toContain('MISSING_OR_INVALID_SOURCE_IMAGE_HASH');
  });
});
