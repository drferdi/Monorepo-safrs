// @vitest-environment node
import { PDFDocument, type PDFFont } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  BASELINE,
  CONTENT_BOTTOM,
  FOOTER_Y,
  MARGIN,
  columnRight,
  columnX,
  layoutVisitSummary,
  type DrawOp,
  type FontWeight,
  type Measure,
} from './visit-summary-layout';
import { buildVisitSummaryModel } from './visit-summary-model';
import { embedHelvetica } from './visit-summary-pdf';
import { longVisitSummaryInput, syntheticVisitSummaryInput } from './visit-summary.fixtures';

type TextOp = Extract<DrawOp, { kind: 'text' }>;

let measure: Measure;
let fonts: Record<FontWeight, PDFFont>;
beforeAll(async () => {
  ({ measure, fonts } = await embedHelvetica(await PDFDocument.create()));
});

const texts = (ops: DrawOp[]): TextOp[] => ops.filter((op): op is TextOp => op.kind === 'text');
const lefts = Array.from({ length: 12 }, (_, i) => columnX(i + 1));
const rights = Array.from({ length: 12 }, (_, i) => columnRight(i + 1));
const layout = (input = syntheticVisitSummaryInput) => layoutVisitSummary(buildVisitSummaryModel(input), measure);

describe('layoutVisitSummary', () => {
  it('sets every text on a column edge and on the 12 pt baseline grid', () => {
    for (const op of layout().pages.flatMap(texts)) {
      expect(op.align === 'left' ? lefts : rights).toContain(op.x);
      expect((op.y - MARGIN.top) % BASELINE).toBe(0);
    }
  });

  it('keeps columns 1-3 for labels and orders the sections', () => {
    const page = layout().pages[0];
    const labels = texts(page).filter((op) => op.x < columnX(4)).map((op) => op.text);
    expect(labels).toEqual([
      'KELUHAN',
      'TTV / TRIASE',
      'ALERGI',
      'DIAGNOSIS',
      'TATALAKSANA',
      'TREN TTV',
      'Tensi',
      'Nadi',
      'Napas',
      'Suhu',
    ]);
  });

  it('draws the logo once, at column 1 of page 1', () => {
    const logos = layout(longVisitSummaryInput).pages.map((ops) => ops.filter((op) => op.kind === 'logo'));
    expect(logos[0]).toEqual([expect.objectContaining({ x: columnX(1), size: 28 })]);
    expect(logos.slice(1).flat()).toEqual([]);
  });

  it('continues Tatalaksana on the next page by medication rows and numbers the pages', () => {
    const { pages } = layout(longVisitSummaryInput);
    expect(pages).toHaveLength(2);
    const footers = pages.map((ops) => texts(ops).find((op) => op.text.startsWith('Halaman'))?.text);
    expect(footers).toEqual(['Halaman 1/2', 'Halaman 2/2']);
    for (const ops of pages) {
      expect(texts(ops).some((op) => op.text === 'TATALAKSANA')).toBe(true);
      for (const op of texts(ops).filter((t) => t.y !== FOOTER_Y)) expect(op.y).toBeLessThanOrEqual(CONTENT_BOTTOM);
    }
    const names = pages.flatMap(texts).map((op) => op.text).filter((text) => text.startsWith('Obat Sintetis'));
    expect(names).toHaveLength(45);
    expect(new Set(names).size).toBe(45);
  });

  it('breaks a word wider than its columns inside them', () => {
    const word = 'Natriumdiklofenakkaliumhidroklorida'.repeat(3);
    const ops = layout({ ...syntheticVisitSummaryInput, keluhanUtama: word }).pages[0];
    const complaint = texts(ops).filter((op) => op.x === columnX(4) && op.text.length > 3 && word.includes(op.text));
    expect(complaint.length).toBeGreaterThan(1);
    for (const op of complaint) expect(op.x + measure(op.text, op.weight, op.size)).toBeLessThanOrEqual(columnRight(12));
  });

  it('writes one line instead of a trend with fewer than two visits', () => {
    const input = { ...syntheticVisitSummaryInput, context: undefined };
    const all = layout(input).pages.flatMap(texts).map((op) => op.text);
    expect(all).toContain('Riwayat kunjungan belum cukup untuk tren');
    expect(all).not.toContain('Tensi');
  });

  it('draws only text the standard Helvetica can encode, without a ?', () => {
    for (const op of layout().pages.flatMap(texts)) {
      expect(op.text).not.toContain('?');
      expect(() => fonts[op.weight].encodeText(op.text)).not.toThrow();
    }
  });

  it('never prints a name from the visit history', () => {
    expect(layout().pages.flatMap(texts).map((op) => op.text).join(' ')).not.toContain('Rahasia');
  });
});
