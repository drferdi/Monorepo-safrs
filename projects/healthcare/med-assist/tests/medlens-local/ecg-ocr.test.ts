// @vitest-environment node

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

async function createCanvas(width: number, height: number): Promise<Buffer> {
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

async function loadOcrModule(): Promise<{
  recognizeEcgTextFromImageBuffer: (
    inputBuffer: Buffer,
    options?: {
      regionPresets?: Array<{
        id: string;
        leftRatio: number;
        topRatio: number;
        widthRatio: number;
        heightRatio: number;
      }>;
      recognizeProcessedBuffer?: (
        processedBuffer: Buffer,
        context: {
          source: 'crop' | 'full-image';
          regionId: string | null;
        }
      ) => Promise<string>;
    }
  ) => Promise<{
    text: string;
    source: 'crop' | 'full-image';
    regionId: string | null;
    fallbackUsed: boolean;
    score: number;
    candidateCount: number;
    identifierDetected: boolean;
  }>;
}> {
  // @ts-expect-error -- local MedLens OCR helper stays as runtime-only .mjs for dev shell execution.
  return import('../../services/medlens-local/ecg-ocr.mjs');
}

describe('MedLens ECG OCR helper', () => {
  it('chooses the highest-scoring ECG crop instead of the first usable crop', async () => {
    const { recognizeEcgTextFromImageBuffer } = await loadOcrModule();
    const imageBuffer = await createCanvas(1400, 900);

    const result = await recognizeEcgTextFromImageBuffer(imageBuffer, {
      regionPresets: [
        {
          id: 'header-with-rate',
          leftRatio: 0.05,
          topRatio: 0.05,
          widthRatio: 0.4,
          heightRatio: 0.25,
        },
        {
          id: 'structured-ecg',
          leftRatio: 0.5,
          topRatio: 0.05,
          widthRatio: 0.4,
          heightRatio: 0.25,
        },
      ],
      recognizeProcessedBuffer: async (_processedBuffer, context) => {
        if (context.source === 'crop' && context.regionId === 'header-with-rate') {
          return 'Patient Name: Jane Doe\nHeart rate 82 bpm\nHospital Sentra Medika';
        }

        if (context.source === 'crop' && context.regionId === 'structured-ecg') {
          return 'Ventricular rate 82 bpm\nPR interval 164 ms\nQRS dur 96 ms\nQTc 428 ms';
        }

        return '';
      },
    });

    expect(result.text).toContain('Ventricular rate 82 bpm');
    expect(result.source).toBe('crop');
    expect(result.regionId).toBe('structured-ecg');
    expect(result.fallbackUsed).toBe(false);
    expect(result.candidateCount).toBe(2);
    expect(result.score).toBeGreaterThan(0);
    expect(result.identifierDetected).toBe(true);
  });

  it('falls back to full-image OCR when cropped regions do not produce usable ECG text', async () => {
    const { recognizeEcgTextFromImageBuffer } = await loadOcrModule();
    const imageBuffer = await createCanvas(1400, 900);

    const result = await recognizeEcgTextFromImageBuffer(imageBuffer, {
      regionPresets: [
        {
          id: 'header-band',
          leftRatio: 0.05,
          topRatio: 0.05,
          widthRatio: 0.9,
          heightRatio: 0.25,
        },
      ],
      recognizeProcessedBuffer: async (_processedBuffer, context) => {
        if (context.source === 'crop') {
          return 'logo footer';
        }

        return 'Heart rate: 78 bpm\nQTc 420 ms';
      },
    });

    expect(result.text).toContain('Heart rate: 78 bpm');
    expect(result.source).toBe('full-image');
    expect(result.regionId).toBeNull();
    expect(result.fallbackUsed).toBe(true);
    expect(result.candidateCount).toBe(1);
    expect(result.identifierDetected).toBe(false);
  });

  it('prefers rhythm and interpretation text over demographic-only crop text', async () => {
    const { recognizeEcgTextFromImageBuffer } = await loadOcrModule();
    const imageBuffer = await createCanvas(1400, 900);

    const result = await recognizeEcgTextFromImageBuffer(imageBuffer, {
      regionPresets: [
        {
          id: 'demographic-header',
          leftRatio: 0.05,
          topRatio: 0.05,
          widthRatio: 0.4,
          heightRatio: 0.25,
        },
        {
          id: 'interpretation-panel',
          leftRatio: 0.5,
          topRatio: 0.05,
          widthRatio: 0.4,
          heightRatio: 0.25,
        },
      ],
      recognizeProcessedBuffer: async (_processedBuffer, context) => {
        if (context.regionId === 'demographic-header') {
          return 'Patient Name: Jane Doe\nMRN 123456\nDOB 1980-01-01';
        }

        if (context.regionId === 'interpretation-panel') {
          return 'Atrial fibrillation\nMachine interpretation\nBorderline ECG';
        }

        return '';
      },
    });

    expect(result.source).toBe('crop');
    expect(result.regionId).toBe('interpretation-panel');
    expect(result.text).toContain('Atrial fibrillation');
    expect(result.score).toBeGreaterThan(0);
    expect(result.identifierDetected).toBe(true);
  });

  it('includes lower printout regions in the default ECG text search', async () => {
    const { recognizeEcgTextFromImageBuffer } = await loadOcrModule();
    const imageBuffer = await createCanvas(1400, 900);
    const visitedRegionIds: string[] = [];

    const result = await recognizeEcgTextFromImageBuffer(imageBuffer, {
      recognizeProcessedBuffer: async (_processedBuffer, context) => {
        if (context.regionId) {
          visitedRegionIds.push(context.regionId);
        }

        if (context.regionId === 'lower-right-interpretation') {
          return 'Diagnosis\nSinus tachycardia\nOtherwise normal ECG';
        }

        return '';
      },
    });

    expect(visitedRegionIds).toContain('lower-right-interpretation');
    expect(visitedRegionIds).toContain('lower-band');
    expect(result.source).toBe('crop');
    expect(result.regionId).toBe('lower-right-interpretation');
    expect(result.text).toContain('Sinus tachycardia');
  });
});
