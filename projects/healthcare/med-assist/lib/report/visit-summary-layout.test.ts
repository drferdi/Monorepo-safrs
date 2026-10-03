// @vitest-environment node
import { PDFDocument, type PDFFont } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  BASELINE,
  CONTENT_BOTTOM,
  FOOTER_Y,
  MARGIN,
  PAGE,
  SIZE,
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

  // Migrated (Chief 2026-10-03, "lebih komprehensif swiss style … red orange dan blue oxford"): the
  // sections are numbered 01-08 in red orange in column 1, their labels Oxford blue in column 2;
  // Edukasi and Tindak lanjut joined; the trend rows' labels moved to column 2.
  it('numbers the sections in red orange in column 1 and labels them in Oxford blue', () => {
    const ops = layout(longVisitSummaryInput).pages.flatMap(texts).filter((op) => op.x < columnX(4));
    const numbers = ops.filter((op) => op.x === columnX(1));
    expect(numbers.map((op) => op.text)).toEqual(['01', '02', '03', '04', '05', '05', '06', '07', '08', '09']);
    expect(new Set(numbers.map((op) => op.tone))).toEqual(new Set(['signal']));
    const labels = ops.filter((op) => op.x === columnX(2) && op.weight === 'bold');
    expect(labels.map((op) => op.text)).toEqual([
      'KELUHAN',
      'TTV / TRIASE',
      'ALERGI',
      'DIAGNOSIS',
      'TATALAKSANA',
      'TATALAKSANA',
      'EDUKASI',
      'TINDAK LANJUT',
      'TREN TTV',
      'VERIFIKASI',
    ]);
    expect(new Set(labels.map((op) => op.tone))).toEqual(new Set(['oxford']));
    const trend = ops.filter((op) => op.x === columnX(2) && op.weight === 'regular').map((op) => op.text);
    expect(trend).toEqual(['Sistolik', 'Diastolik', 'Nadi', 'Napas', 'Suhu']);
  });

  it('opens page 1 with a full-width Oxford band, the title in white, a red-orange rule beneath', () => {
    const [first, second] = layout(longVisitSummaryInput).pages;
    const band = first.find((op) => op.kind === 'rect' && op.tone === 'oxford');
    expect(band).toEqual(expect.objectContaining({ x: 0, y: 0, width: PAGE.width }));
    const rule = first.find((op) => op.kind === 'rect' && op.tone === 'signal');
    expect(rule).toEqual(expect.objectContaining({ x: 0, width: PAGE.width, height: 3 }));
    if (band?.kind !== 'rect' || rule?.kind !== 'rect') throw new Error('band or rule missing');
    expect(rule.y).toBe(band.height);
    const title = texts(first).filter((op) => op.size === SIZE.title);
    expect(title.map((op) => [op.text, op.tone])).toEqual([
      ['RINGKASAN', 'paper'],
      ['KUNJUNGAN', 'paper'],
    ]);
    expect(second.some((op) => op.kind === 'rect' && op.tone === 'oxford' && op.width === PAGE.width)).toBe(false);
  });

  it('prints the education, the follow-up and the safety net', () => {
    const all = layout().pages.flatMap(texts).map((op) => op.text);
    expect(all).toEqual(
      expect.arrayContaining([
        'Minum obat tekanan darah setiap hari pada jam yang sama.',
        'Batasi garam dan makanan asin.',
        'Kontrol 1 minggu',
        'SEGERA KEMBALI BILA',
        'Nyeri kepala hebat mendadak',
        'Lemah separuh badan atau bicara pelo',
      ])
    );
  });

  it('closes with the DPJP and the verifier in Oxford under their captions', () => {
    const ops = layout().pages.flatMap(texts);
    const at = (value: string) => ops.find((op) => op.text === value);
    expect(at('DPJP')).toEqual(expect.objectContaining({ x: columnX(4), tone: 'muted' }));
    expect(at('VERIFIKATOR')).toEqual(expect.objectContaining({ x: columnX(8), tone: 'muted' }));
    expect(at('dr. Klinisi Sintetis')).toEqual(
      expect.objectContaining({ x: columnX(4), weight: 'bold', tone: 'oxford', y: (at('DPJP')?.y ?? 0) + BASELINE })
    );
    expect(at('Ns. Verifikator Sintetis')).toEqual(
      expect.objectContaining({ x: columnX(8), weight: 'bold', tone: 'oxford' })
    );
  });

  it('writes the vitals as large Oxford figures over their captions', () => {
    const value = layout().pages[0].find((op) => op.kind === 'text' && op.text === '152/96 mmHg');
    expect(value).toEqual(expect.objectContaining({ size: SIZE.figure, weight: 'bold', tone: 'oxford' }));
  });

  it('leaves one empty baseline between the vitals’ captions and the triage', () => {
    const ops = texts(layout().pages[0]);
    const caption = ops.find((op) => op.text === 'GDS');
    const triage = ops.find((op) => op.text === 'KUNING');
    if (!caption || !triage) throw new Error('caption or triage missing');
    expect(triage.y - caption.y).toBe(BASELINE * 2);
  });

  it('marks each vital’s latest visit in red orange', () => {
    const marks = layout().pages.flat().filter((op) => op.kind === 'rect' && op.tone === 'signal' && op.width === 3);
    expect(marks).toHaveLength(5);
  });

  // Migrated (Chief 2026-10-03, Oxford band): the logomark is white on the band and spans the two
  // title lines, so its size is no longer 28.
  it('draws the logo once, at column 1 of page 1', () => {
    const logos = layout(longVisitSummaryInput).pages.map((ops) => ops.filter((op) => op.kind === 'logo'));
    expect(logos[0]).toEqual([expect.objectContaining({ x: columnX(1) })]);
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

  it('never sets a baseline below the content bottom, however long a complaint or an alert', () => {
    const long = (word: string, count: number) => Array.from({ length: count }, () => word).join(' ');
    const input = {
      ...syntheticVisitSummaryInput,
      keluhanUtama: long('nyeri', 1200),
      alerts: [{ severity: 'high', title: 'Peringatan panjang', message: long('waspada', 1100) }],
    };
    const { pages } = layout(input);
    for (const op of pages.flatMap(texts).filter((t) => t.y !== FOOTER_Y)) {
      expect(op.y).toBeLessThanOrEqual(CONTENT_BOTTOM);
    }
    const words = pages.flatMap(texts).flatMap((op) => op.text.split(' '));
    expect(words.filter((word) => word === 'nyeri')).toHaveLength(1200);
    expect(words.filter((word) => word === 'waspada')).toHaveLength(1100);
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
    expect(all).not.toContain('Sistolik');
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
