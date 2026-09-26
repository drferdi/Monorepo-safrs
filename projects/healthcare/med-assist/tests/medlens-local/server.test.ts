// @vitest-environment node

import type { AddressInfo } from 'node:net';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { MEDLENS_ECG_DISCLAIMER } from '@/lib/clinical/medlens/ecg-types';
import { makeMedlensEcgAnalyzeResponse } from '@/tests/medlens-contract/ecg-contract-fixtures';

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

async function loadServerModule(): Promise<{
  createMedlensLocalServer: (options?: {
    analyzeFile?: (file: File) => Promise<Record<string, unknown>>;
  }) => {
    server: { address: () => AddressInfo | null };
    start: (port?: number, host?: string) => Promise<unknown>;
    stop: () => Promise<void>;
  };
}> {
  // @ts-expect-error runtime-only local service
  return import('../../services/medlens-local/server.mjs');
}

async function loadAnalyzerModule(): Promise<{
  extractEcgTextSupportFromVisibleText: (rawText: string) => {
    ocr_extracted_values: {
      heart_rate_or_ventricular_rate: string | null;
      pr_interval: string | null;
      qrs_duration: string | null;
      qt: string | null;
      qtc: string | null;
      p_axis: string | null;
      r_axis: string | null;
      t_axis: string | null;
      rhythm_statement: string | null;
      machine_interpretation_text: string | null;
    };
    raw_ecg_relevant_text: string[];
    ignored_or_redacted_identifiers_detected: boolean;
    limitations: string[];
    physician_verification_required: true;
  };
}> {
  // @ts-expect-error runtime-only local service
  return import('../../services/medlens-local/ecg-analyzer.mjs');
}

describe('MedLens local ECG service', () => {
  const runningServers: Array<{ stop: () => Promise<void> }> = [];

  afterEach(async () => {
    await Promise.all(runningServers.splice(0).map((instance) => instance.stop()));
  });

  it('accepts PNG upload and returns waveform-review payloads', async () => {
    const { createMedlensLocalServer } = await loadServerModule();
    const instance = createMedlensLocalServer({
      analyzeFile: async () => makeMedlensEcgAnalyzeResponse() as unknown as Record<string, unknown>,
    });
    runningServers.push(instance);
    await instance.start(0, '127.0.0.1');
    const port = (instance.server.address() as AddressInfo).port;

    const formData = new FormData();
    const buffer = await createTestImage(1200, 800);
    formData.append('file', new Blob([new Uint8Array(buffer)], { type: 'image/png' }), 'ekg.png');

    const response = await fetch(`http://127.0.0.1:${port}/api/medlens/ecg/analyze`, {
      method: 'POST',
      body: formData,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(payload.status).toBe('ok');
    expect(payload.waveform_review_output.status).toBe('ready_for_physician_review');
    expect(payload.ecg_clinical_output.status).toBe('insufficient_evidence');
    expect(payload.audit_log.outputPassedEvidenceGate).toBe(true);
    expect(payload.disclaimer).toBe(MEDLENS_ECG_DISCLAIMER);
  });

  it('rejects unsupported file formats with 415', async () => {
    const { createMedlensLocalServer } = await loadServerModule();
    const instance = createMedlensLocalServer();
    runningServers.push(instance);
    await instance.start(0, '127.0.0.1');
    const port = (instance.server.address() as AddressInfo).port;

    const formData = new FormData();
    formData.append('file', new Blob(['hello'], { type: 'image/gif' }), 'ekg.gif');

    const response = await fetch(`http://127.0.0.1:${port}/api/medlens/ecg/analyze`, {
      method: 'POST',
      body: formData,
    });

    const payload = (await response.json()) as { status: string; message: string };

    expect(response.status).toBe(415);
    expect(payload.status).toBe('error');
    expect(payload.message).toContain('PNG, JPG, atau JPEG');
  });

  it('extracts ECG-relevant printed text and redacts patient identifiers', async () => {
    const { extractEcgTextSupportFromVisibleText } = await loadAnalyzerModule();

    const result = extractEcgTextSupportFromVisibleText(`
Patient Name: John Doe
MRN: 123456
DOB: 1980-01-01
Ventricular rate 82 bpm
PR interval 164 ms
QRS duration 96 ms
QT/QTc 376/428 ms
P/R/T axis 55/69/31
Normal sinus rhythm
Machine interpretation: Nonspecific ST abnormality
`);

    expect(result.ocr_extracted_values.heart_rate_or_ventricular_rate).toBe('82 bpm');
    expect(result.ocr_extracted_values.machine_interpretation_text).toBe(
      'Nonspecific ST abnormality'
    );
    expect(result.raw_ecg_relevant_text).toEqual([
      'Ventricular rate 82 bpm',
      'PR interval 164 ms',
      'QRS duration 96 ms',
      'QT/QTc 376/428 ms',
      'P/R/T axis 55/69/31',
      'Normal sinus rhythm',
      'Machine interpretation: Nonspecific ST abnormality',
    ]);
    expect(result.ignored_or_redacted_identifiers_detected).toBe(true);
    expect(JSON.stringify(result)).not.toContain('John Doe');
    expect(JSON.stringify(result)).not.toContain('123456');
  });

  it('keeps the default local analyzer fail-closed when only OCR text is available', async () => {
    const { createMedlensLocalServer } = await loadServerModule();
    const instance = createMedlensLocalServer();
    runningServers.push(instance);
    await instance.start(0, '127.0.0.1');
    const port = (instance.server.address() as AddressInfo).port;

    const formData = new FormData();
    const buffer = await createTestImage(1200, 800);
    formData.append('file', new Blob([new Uint8Array(buffer)], { type: 'image/png' }), 'ekg.png');

    const response = await fetch(`http://127.0.0.1:${port}/api/medlens/ecg/analyze`, {
      method: 'POST',
      body: formData,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(payload.waveform_review_output.status).toBe('blocked');
    expect(payload.waveform_review_output.clinicalOutputAllowed).toBe(false);
    expect(payload.ecg_clinical_output.status).toBe('insufficient_evidence');
    expect(payload.audit_log.outputPassedEvidenceGate).toBe(false);
  });
});
