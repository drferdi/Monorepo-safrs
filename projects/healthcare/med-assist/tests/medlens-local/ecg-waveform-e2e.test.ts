// @vitest-environment node

import type { AddressInfo } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

const TEST_IMAGE_WIDTH = 1000;
const TEST_IMAGE_HEIGHT = 780;
const SMALL_BOX_PX = 4;
const PIXELS_PER_SECOND = SMALL_BOX_PX * 25;
const REAL_ECG_FIXTURE_PATH = 'C:/Users/drfer/Desktop/infmi_2x.png';
const REAL_NORMAL_ECG_FIXTURE_PATH =
  'C:/Users/drfer/Desktop/hasil-elektrokardiografi-ekg-ecg-normal-src-ecg-library.png';
const LEAD_LAYOUT = [
  ['I', 0, 0],
  ['aVR', 1, 0],
  ['V1', 2, 0],
  ['V4', 3, 0],
  ['II', 0, 1],
  ['aVL', 1, 1],
  ['V2', 2, 1],
  ['V5', 3, 1],
  ['III', 0, 2],
  ['aVF', 1, 2],
  ['V3', 2, 2],
  ['V6', 3, 2],
] as const;

async function loadAnalyzerModule(): Promise<{
  analyzeEcgImageFile: (
    file: File,
    options?: { ocrEnabled?: boolean }
  ) => Promise<Record<string, unknown>>;
}> {
  // @ts-expect-error runtime-only local service
  return import('../../services/medlens-local/ecg-analyzer.mjs');
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

function gaussian(value: number, center: number, width: number): number {
  const normalized = (value - center) / width;
  return Math.exp(-(normalized * normalized));
}

function sampleBeat(phase: number): number {
  return (
    0.1 * gaussian(phase, 0.18, 0.035) -
    0.18 * gaussian(phase, 0.39, 0.015) +
    1.2 * gaussian(phase, 0.415, 0.012) -
    0.28 * gaussian(phase, 0.445, 0.018) +
    0.34 * gaussian(phase, 0.68, 0.07)
  );
}

function buildWaveformPoints({
  x0,
  x1,
  baselineY,
  amplitudePx,
  heartRateBpm,
}: {
  x0: number;
  x1: number;
  baselineY: number;
  amplitudePx: number;
  heartRateBpm: number;
}): string {
  const cycleSeconds = 60 / heartRateBpm;
  const points: string[] = [];

  for (let x = x0; x <= x1; x += 1) {
    const elapsedSeconds = (x - x0) / PIXELS_PER_SECOND;
    const phase = (elapsedSeconds % cycleSeconds) / cycleSeconds;
    const signal = sampleBeat(phase);
    const y = baselineY - signal * amplitudePx;
    points.push(`${x},${y.toFixed(2)}`);
  }

  return points.join(' ');
}

function renderLeadPolylines(heartRateBpm: number): string {
  return LEAD_LAYOUT.map(([lead, column, row], index) => {
    const x0 = Math.round((column * TEST_IMAGE_WIDTH) / 4) + 26;
    const x1 = Math.round(((column + 1) * TEST_IMAGE_WIDTH) / 4) - 26;
    const y0 = Math.round(row * TEST_IMAGE_HEIGHT * 0.235) + 48;
    const y1 = Math.round((row + 1) * TEST_IMAGE_HEIGHT * 0.235) - 14;
    const baselineY = Math.round((y0 + y1) / 2);
    const amplitudePx = 18 + (index % 4) * 2;
    const points = buildWaveformPoints({ x0, x1, baselineY, amplitudePx, heartRateBpm });

    return `
      <text x="${x0 - 18}" y="${baselineY - 30}" font-size="12" fill="#111111">${lead}</text>
      <polyline points="${points}" fill="none" stroke="#111111" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    `;
  }).join('\n');
}

function renderRhythmStrip(heartRateBpm: number): string {
  const x0 = 26;
  const x1 = TEST_IMAGE_WIDTH - 26;
  const y0 = Math.round(TEST_IMAGE_HEIGHT * 0.74);
  const y1 = TEST_IMAGE_HEIGHT - 26;
  const baselineY = Math.round((y0 + y1) / 2);
  const points = buildWaveformPoints({
    x0,
    x1,
    baselineY,
    amplitudePx: 22,
    heartRateBpm,
  });

  return `
    <text x="${x0}" y="${baselineY - 34}" font-size="14" fill="#111111">Rhythm II</text>
    <polyline points="${points}" fill="none" stroke="#111111" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
  `;
}

function renderGrid(): string {
  const lines: string[] = [];

  for (let x = 0; x <= TEST_IMAGE_WIDTH; x += SMALL_BOX_PX) {
    const major = x % (SMALL_BOX_PX * 5) === 0;
    lines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${TEST_IMAGE_HEIGHT}" stroke="${major ? '#dd4f6b' : '#f3a0b3'}" stroke-width="${major ? 1.2 : 0.6}" />`
    );
  }

  for (let y = 0; y <= TEST_IMAGE_HEIGHT; y += SMALL_BOX_PX) {
    const major = y % (SMALL_BOX_PX * 5) === 0;
    lines.push(
      `<line x1="0" y1="${y}" x2="${TEST_IMAGE_WIDTH}" y2="${y}" stroke="${major ? '#dd4f6b' : '#f3a0b3'}" stroke-width="${major ? 1.2 : 0.6}" />`
    );
  }

  return lines.join('\n');
}

async function createSyntheticEcgImage(heartRateBpm: number): Promise<File> {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${TEST_IMAGE_WIDTH}" height="${TEST_IMAGE_HEIGHT}" viewBox="0 0 ${TEST_IMAGE_WIDTH} ${TEST_IMAGE_HEIGHT}">
      <rect x="0" y="0" width="${TEST_IMAGE_WIDTH}" height="${TEST_IMAGE_HEIGHT}" fill="#fffdfd" />
      ${renderGrid()}
      ${renderLeadPolylines(heartRateBpm)}
      ${renderRhythmStrip(heartRateBpm)}
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return new File([new Uint8Array(buffer)], `synthetic-${heartRateBpm}.png`, { type: 'image/png' });
}

function createRealEcgFixtureFile(): File {
  const buffer = readFileSync(REAL_ECG_FIXTURE_PATH);
  return new File([new Uint8Array(buffer)], 'infmi_2x.png', { type: 'image/png' });
}

function createRealNormalEcgFixtureFile(): File {
  const buffer = readFileSync(REAL_NORMAL_ECG_FIXTURE_PATH);
  return new File([new Uint8Array(buffer)], 'ecg-normal.png', { type: 'image/png' });
}

async function createRealNormalVariantFile(
  variant: 'jpeg_q60' | 'downscale_70' | 'grayscale' | 'rotate_05'
): Promise<File> {
  const source = readFileSync(REAL_NORMAL_ECG_FIXTURE_PATH);
  let pipeline = sharp(source);
  let fileName = `${variant}.png`;
  let mimeType = 'image/png';

  if (variant === 'jpeg_q60') {
    pipeline = pipeline.jpeg({ quality: 60 });
    fileName = `${variant}.jpg`;
    mimeType = 'image/jpeg';
  } else if (variant === 'downscale_70') {
    pipeline = pipeline.resize({ width: 1173 }).png();
  } else if (variant === 'grayscale') {
    pipeline = pipeline.grayscale().png();
  } else if (variant === 'rotate_05') {
    pipeline = pipeline
      .rotate(0.5, {
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png();
  }

  const buffer = await pipeline.toBuffer();
  return new File([new Uint8Array(buffer)], fileName, { type: mimeType });
}

async function createRealInfarctVariantFile(
  variant: 'jpeg_q60' | 'downscale_70' | 'grayscale' | 'rotate_05'
): Promise<File> {
  const source = readFileSync(REAL_ECG_FIXTURE_PATH);
  let pipeline = sharp(source);
  let fileName = `${variant}.png`;
  let mimeType = 'image/png';

  if (variant === 'jpeg_q60') {
    pipeline = pipeline.jpeg({ quality: 60 });
    fileName = `${variant}.jpg`;
    mimeType = 'image/jpeg';
  } else if (variant === 'downscale_70') {
    pipeline = pipeline.resize({ width: 1116 }).png();
  } else if (variant === 'grayscale') {
    pipeline = pipeline.grayscale().png();
  } else if (variant === 'rotate_05') {
    pipeline = pipeline
      .rotate(0.5, {
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png();
  }

  const buffer = await pipeline.toBuffer();
  return new File([new Uint8Array(buffer)], fileName, { type: mimeType });
}

type LocalWaveformTrace = {
  traceExtracted?: boolean;
};

type LocalWaveformResult = {
  waveform_review_output: {
    status: string;
    clinicalOutputAllowed: boolean;
    failedAssertions: string[];
  };
  waveform_evidence_packet: {
    gridCalibration: {
      calibrated: boolean;
      pixelsPerSmallBox?: number;
    };
    leadRegions: unknown[];
    waveformTraces: LocalWaveformTrace[];
    leadMeasurements: unknown[];
    rhythmEvidence?: {
      estimatedRateBpm?: number;
    };
  };
  audit_log: {
    outputPassedEvidenceGate: boolean;
    rawExtractedText: string[];
  };
  raw_ecg_relevant_text: string[];
  extraction_method?: string;
};

describe('MedLens waveform extraction end-to-end', () => {
  const runningServers: Array<{ stop: () => Promise<void> }> = [];

  afterEach(async () => {
    await Promise.all(runningServers.splice(0).map((instance) => instance.stop()));
  });

  it('fails closed when waveform evidence exists but raw OCR text is missing', async () => {
    const { analyzeEcgImageFile } = await loadAnalyzerModule();
    const file = await createSyntheticEcgImage(72);

    const result = (await analyzeEcgImageFile(file, { ocrEnabled: false })) as LocalWaveformResult;
    const extractedTraces = result.waveform_evidence_packet.waveformTraces.filter(
      (trace: LocalWaveformTrace) => trace.traceExtracted === true
    );

    expect(result.waveform_review_output.status).toBe('blocked');
    expect(result.waveform_review_output.clinicalOutputAllowed).toBe(false);
    expect(result.waveform_review_output.failedAssertions).toContain('MISSING_RAW_OCR_TEXT');
    expect(result.waveform_evidence_packet.gridCalibration.calibrated).toBe(true);
    expect(result.waveform_evidence_packet.leadRegions.length).toBeGreaterThanOrEqual(12);
    expect(extractedTraces.length).toBeGreaterThanOrEqual(12);
    expect(result.waveform_evidence_packet.leadMeasurements.length).toBeGreaterThanOrEqual(12);
    expect(result.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm).toBeGreaterThanOrEqual(
      68
    );
    expect(result.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm).toBeLessThanOrEqual(
      76
    );
    expect(result.raw_ecg_relevant_text).toEqual([]);
    expect(result.audit_log.outputPassedEvidenceGate).toBe(false);
  });

  it('allows waveform-ready output only when raw OCR text is preserved alongside waveform evidence', async () => {
    const { analyzeEcgImageFile } = await loadAnalyzerModule();
    const file = await createSyntheticEcgImage(72);
    const analyzerOptions = {
      ocrEnabled: true,
      recognizeTextFromImageBuffer: async () => ({
        text: 'Ventricular rate 72 bpm\nMachine interpretation: Normal sinus rhythm',
        source: 'crop',
        regionId: 'structured-ecg',
        fallbackUsed: false,
        score: 18,
        candidateCount: 2,
        identifierDetected: false,
      }),
    } as unknown as { ocrEnabled?: boolean };

    const result = (await analyzeEcgImageFile(file, analyzerOptions)) as LocalWaveformResult;

    expect(result.waveform_review_output.status).toBe('ready_for_physician_review');
    expect(result.waveform_review_output.clinicalOutputAllowed).toBe(true);
    expect(result.raw_ecg_relevant_text).toEqual([
      'Ventricular rate 72 bpm',
      'Machine interpretation: Normal sinus rhythm',
    ]);
    expect(result.audit_log.rawExtractedText).toEqual([
      'Ventricular rate 72 bpm',
      'Machine interpretation: Normal sinus rhythm',
    ]);
    expect(result.audit_log.outputPassedEvidenceGate).toBe(true);
  });

  it('returns a fail-closed packet from the local HTTP endpoint when raw OCR text is missing', async () => {
    const { analyzeEcgImageFile } = await loadAnalyzerModule();
    const { createMedlensLocalServer } = await loadServerModule();
    const instance = createMedlensLocalServer({
      analyzeFile: (file) => analyzeEcgImageFile(file, { ocrEnabled: false }),
    });
    runningServers.push(instance);
    await instance.start(0, '127.0.0.1');
    const port = (instance.server.address() as AddressInfo).port;
    const file = await createSyntheticEcgImage(118);

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`http://127.0.0.1:${port}/api/medlens/ecg/analyze`, {
      method: 'POST',
      body: formData,
    });
    const payload = (await response.json()) as LocalWaveformResult;

    expect(response.status).toBe(200);
    expect(payload.waveform_review_output.status).toBe('blocked');
    expect(payload.waveform_review_output.clinicalOutputAllowed).toBe(false);
    expect(payload.waveform_review_output.failedAssertions).toContain('MISSING_RAW_OCR_TEXT');
    expect(payload.waveform_evidence_packet.gridCalibration.calibrated).toBe(true);
    expect(
      payload.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm
    ).toBeGreaterThanOrEqual(112);
    expect(payload.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm).toBeLessThanOrEqual(
      124
    );
    expect(payload.audit_log.outputPassedEvidenceGate).toBe(false);
  }, 15000);

  const realFixtureTest = existsSync(REAL_ECG_FIXTURE_PATH) ? it : it.skip;
  realFixtureTest('reads a real 12-lead ECG image with calibrated waveform evidence', async () => {
    const { analyzeEcgImageFile } = await loadAnalyzerModule();
    const file = createRealEcgFixtureFile();

    const result = (await analyzeEcgImageFile(file, { ocrEnabled: false })) as LocalWaveformResult;

    expect(result.waveform_review_output.status).toBe('blocked');
    expect(result.waveform_review_output.clinicalOutputAllowed).toBe(false);
    expect(result.waveform_review_output.failedAssertions).toContain('MISSING_RAW_OCR_TEXT');
    expect(result.waveform_evidence_packet.gridCalibration.calibrated).toBe(true);
    expect(
      result.waveform_evidence_packet.gridCalibration.pixelsPerSmallBox
    ).toBeGreaterThanOrEqual(3);
    expect(result.waveform_evidence_packet.gridCalibration.pixelsPerSmallBox).toBeLessThanOrEqual(
      12
    );
    expect(result.waveform_evidence_packet.leadMeasurements.length).toBeGreaterThanOrEqual(12);
    expect(
      result.waveform_evidence_packet.waveformTraces.filter(
        (trace: LocalWaveformTrace) => trace.traceExtracted
      ).length
    ).toBeGreaterThanOrEqual(12);
    expect(result.audit_log.outputPassedEvidenceGate).toBe(false);
  });

  realFixtureTest(
    'keeps infarct-case rhythm estimation plausible under minor rotation',
    async () => {
      const { analyzeEcgImageFile } = await loadAnalyzerModule();
      const file = await createRealInfarctVariantFile('rotate_05');

      const result = (await analyzeEcgImageFile(file, {
        ocrEnabled: false,
      })) as LocalWaveformResult;

      expect(result.waveform_review_output.status).toBe('blocked');
      expect(result.waveform_review_output.failedAssertions).toContain('MISSING_RAW_OCR_TEXT');
      expect(
        result.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm
      ).toBeGreaterThanOrEqual(40);
      expect(result.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm).toBeLessThanOrEqual(
        80
      );
      expect(result.audit_log.outputPassedEvidenceGate).toBe(false);
    }
  );

  const realNormalFixtureTest = existsSync(REAL_NORMAL_ECG_FIXTURE_PATH) ? it : it.skip;
  realNormalFixtureTest(
    'reads a second real ECG image and estimates rhythm from waveform',
    async () => {
      const { analyzeEcgImageFile } = await loadAnalyzerModule();
      const file = createRealNormalEcgFixtureFile();

      const result = (await analyzeEcgImageFile(file, {
        ocrEnabled: false,
      })) as LocalWaveformResult;

      expect(result.waveform_review_output.status).toBe('blocked');
      expect(result.waveform_review_output.failedAssertions).toContain('MISSING_RAW_OCR_TEXT');
      expect(result.waveform_evidence_packet.gridCalibration.calibrated).toBe(true);
      expect(
        result.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm
      ).toBeGreaterThanOrEqual(60);
      expect(result.waveform_evidence_packet.rhythmEvidence?.estimatedRateBpm).toBeLessThanOrEqual(
        80
      );
      expect(result.waveform_evidence_packet.leadMeasurements.length).toBeGreaterThanOrEqual(12);
      expect(result.audit_log.outputPassedEvidenceGate).toBe(false);
    }
  );

  realNormalFixtureTest(
    'returns a waveform-ready packet for a real ECG image via HTTP upload',
    async () => {
      const { analyzeEcgImageFile } = await loadAnalyzerModule();
      const { createMedlensLocalServer } = await loadServerModule();
      const instance = createMedlensLocalServer({
        analyzeFile: (file) => analyzeEcgImageFile(file, { ocrEnabled: false }),
      });
      runningServers.push(instance);
      await instance.start(0, '127.0.0.1');
      const port = (instance.server.address() as AddressInfo).port;
      const file = createRealNormalEcgFixtureFile();

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://127.0.0.1:${port}/api/medlens/ecg/analyze`, {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as LocalWaveformResult;

      expect(response.status).toBe(200);
      expect(payload.waveform_review_output.status).toBe('blocked');
      expect(payload.waveform_review_output.failedAssertions).toContain('MISSING_RAW_OCR_TEXT');
      expect(payload.waveform_evidence_packet.gridCalibration.calibrated).toBe(true);
      expect(payload.waveform_evidence_packet.leadMeasurements.length).toBeGreaterThanOrEqual(12);
      expect(payload.audit_log.outputPassedEvidenceGate).toBe(false);
    },
    15000
  );

  realNormalFixtureTest(
    'stays waveform-ready across realistic image transforms',
    async () => {
      const { analyzeEcgImageFile } = await loadAnalyzerModule();
      const variants = ['jpeg_q60', 'downscale_70', 'grayscale', 'rotate_05'] as const;

      for (const variant of variants) {
        const file = await createRealNormalVariantFile(variant);
        const result = (await analyzeEcgImageFile(file, {
          ocrEnabled: false,
        })) as LocalWaveformResult;

        expect(result.waveform_review_output.status, variant).toBe('blocked');
        expect(result.waveform_review_output.failedAssertions, variant).toContain(
          'MISSING_RAW_OCR_TEXT'
        );
        expect(result.waveform_evidence_packet.gridCalibration.calibrated, variant).toBe(true);
        expect(
          result.waveform_evidence_packet.leadMeasurements.length,
          variant
        ).toBeGreaterThanOrEqual(12);
        expect(result.audit_log.outputPassedEvidenceGate, variant).toBe(false);
      }
    },
    20000
  );

  realNormalFixtureTest(
    'keeps the default local server waveform-first on a real ECG image',
    async () => {
      const { createMedlensLocalServer } = await loadServerModule();
      const instance = createMedlensLocalServer();
      runningServers.push(instance);
      await instance.start(0, '127.0.0.1');
      const port = (instance.server.address() as AddressInfo).port;
      const file = createRealNormalEcgFixtureFile();

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://127.0.0.1:${port}/api/medlens/ecg/analyze`, {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as LocalWaveformResult;

      expect(response.status).toBe(200);
      expect(payload.waveform_review_output.status).toBe('blocked');
      expect(payload.waveform_review_output.clinicalOutputAllowed).toBe(false);
      expect(payload.waveform_review_output.failedAssertions).toContain('MISSING_RAW_OCR_TEXT');
      expect(payload.raw_ecg_relevant_text).toEqual([]);
      expect(payload.audit_log.outputPassedEvidenceGate).toBe(false);
    },
    30000
  );
});
