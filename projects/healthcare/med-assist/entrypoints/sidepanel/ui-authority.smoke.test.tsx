/**
 * UI Authority Smoke Test
 *
 * Guards the three-button action bar (Uplink / Doctor / Trajectory) that
 * has been accidentally removed 4 times by automated refactoring.
 *
 * If this file fails: the sidepanel UI has regressed. DO NOT merge.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');

function readSrc(relPath: string) {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}

describe('UI Authority — action bar tri-tabs', () => {
  it('TTVInferenceUI renders container action-bar--tri-tabs', () => {
    const src = readSrc('components/clinical/TTVInferenceUI.tsx');
    expect(src).toContain('action-bar--tri-tabs');
  });

  it('Uplink button exists with aria-label', () => {
    const src = readSrc('components/clinical/TTVInferenceUI.tsx');
    expect(src).toContain('aria-label="Uplink"');
  });

  it('Doctor button exists with aria-label', () => {
    const src = readSrc('components/clinical/TTVInferenceUI.tsx');
    expect(src).toContain('aria-label="Doctor"');
  });

  it('Trajectory button exists with aria-label', () => {
    const src = readSrc('components/clinical/TTVInferenceUI.tsx');
    expect(src).toContain('aria-label="Trajectory"');
  });
});

describe('UI Authority — GCS vital field', () => {
  it('GCS input exists on the left of vitals grid', () => {
    const src = readSrc('components/clinical/TTVInferenceUI.tsx');
    expect(src).toContain('aria-label="GCS"');
  });
});

describe('UI Authority — sidepanel runtime mount', () => {
  it('main.tsx mounts TTVInferenceUI or ClinicalReasoningWorkbench (not stripped)', () => {
    const src = readSrc('entrypoints/sidepanel/main.tsx');
    const hasWorkbench =
      src.includes('ClinicalReasoningWorkbench') || src.includes('TTVInferenceUI');
    expect(hasWorkbench).toBe(true);
  });

  it('style.css is not stripped — must have at least 2000 lines', () => {
    const src = readSrc('entrypoints/sidepanel/style.css');
    const lines = src.split('\n').length;
    expect(lines).toBeGreaterThan(2000);
  });
});
