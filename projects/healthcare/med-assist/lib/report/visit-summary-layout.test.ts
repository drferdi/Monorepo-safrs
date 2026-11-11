// @vitest-environment node
import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  COLOR,
  CONTENT_BOTTOM,
  CONTENT_WIDTH,
  FOOTER_Y,
  MARGIN,
  TRIAGE_FILL,
  layoutVisitSummary,
  type DrawOp,
  type Measure,
} from './visit-summary-layout';
import { buildVisitSummaryModel } from './visit-summary-model';
import { embedTemplateFont } from './visit-summary-pdf';
import { longVisitSummaryInput, syntheticVisitSummaryInput as input } from './visit-summary.fixtures';
import { readVisitSummaryAssets } from './visit-summary.test-assets';

let measure: Measure;
type TextOp = Extract<DrawOp, { kind: 'text' }>;
const texts = (ops: DrawOp[]): TextOp[] => ops.filter((op): op is TextOp => op.kind === 'text');
const layout = (overrides: Partial<typeof input> = {}) =>
  layoutVisitSummary(buildVisitSummaryModel({ ...input, ...overrides }), measure).pages;
const find = (ops: DrawOp[], value: string): TextOp | undefined => texts(ops).find((op) => op.text === value);

beforeAll(async () => {
  ({ measure } = await embedTemplateFont(await PDFDocument.create(), readVisitSummaryAssets().font));
});

// The approved template, Clinical_Visit_Summary_Template.docx (Chief, 2026-10-04).
describe('layoutVisitSummary', () => {
  it('opens with the red tab, the two-line title, the brand line and "Prototype" in red', () => {
    const [page] = layout();
    expect(page[0]).toEqual({ kind: 'rect', x: MARGIN.left, y: MARGIN.top, width: 45.35, height: 4.55, color: COLOR.red });
    expect(find(page, 'Clinical')).toMatchObject({ size: 34, color: COLOR.ink });
    expect(find(page, 'Visit Summary')).toMatchObject({ size: 34, color: COLOR.ink });
    expect(find(page, 'Sentra Asisten Medis')).toMatchObject({ size: 13 });
    expect(find(page, 'Prototype')).toMatchObject({ size: 9, color: COLOR.red });
  });

  it('numbers the ten blocks in red at 15 pt with their tracked 7 pt captions', () => {
    const [page] = layout();
    const numbers = texts(page).filter((op) => op.size === 15);
    expect(numbers.map((op) => op.text)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
    expect(new Set(numbers.map((op) => op.color))).toEqual(new Set([COLOR.red]));
    const captions = texts(page).filter((op) => op.size === 7 && op.spacing === 1.75);
    expect(captions.map((op) => op.text)).toEqual([
      'KELUHAN UTAMA & RINGKASAN KLINIS',
      'TANDA VITAL / TRIASE',
      'ALERGI',
      'DIAGNOSIS',
      'TATALAKSANA / OBAT',
      'EDUKASI',
      'TINDAK LANJUT',
      'TREN TANDA VITAL',
      'SEGERA KEMBALI BILA',
      'VERIFIKASI',
    ]);
  });

  it('heads the page with the RM, age, sex and time under their captions', () => {
    const [page] = layout();
    expect(find(page, 'NO. REKAM MEDIS')).toMatchObject({ size: 6, color: COLOR.label });
    expect(find(page, 'RM RM-00-12-34')).toMatchObject({ size: 12 });
    for (const value of ['54 tahun', 'P']) expect(find(page, value)).toMatchObject({ size: 8.5 });
    // IBM Plex Sans is wider than the template's Arial: the time wraps under the date, in its cell.
    const date = find(page, '03-10-2026')!;
    expect(find(page, '14:20')).toMatchObject({ size: 8.5, x: date.x });
    expect(find(page, '14:20')!.y).toBeGreaterThan(date.y);
  });

  it('writes each vital as a 16 pt figure over its unit, the triage in its zone colour', () => {
    const [page] = layout();
    expect(find(page, '152/96')).toMatchObject({ size: 16 });
    expect(find(page, 'mmHg')).toMatchObject({ size: 6.5 });
    expect(page).toContainEqual(expect.objectContaining({ kind: 'rect', color: TRIAGE_FILL.kuning }));
    expect(find(page, 'KUNING')).toMatchObject({ size: 8.5 });
    expect(find(page, 'Hipertensi derajat 2')).toMatchObject({ size: 6.5 });
  });

  it('keeps the triage box with - when the triage is standby', () => {
    const [page] = layout({ context: { ...input.context!, triage: { zone: 'standby', headline: null } } });
    expect(find(page, 'TRIASE')).toBeDefined();
    expect(find(page, '-')).toBeDefined();
  });

  it('prints the primary ICD at 22 pt marked PRIMER in red, a secondary one SEKUNDER', () => {
    const [page] = layout();
    expect(find(page, 'I10')).toMatchObject({ size: 22 });
    expect(find(page, 'PRIMER')).toMatchObject({ color: COLOR.red, align: 'right' });
    expect(find(page, 'SEKUNDER')).toMatchObject({ color: COLOR.label });
  });

  // Chief, 2026-10-04: STATUS and INTERAKSI added inside the template's medication table.
  it('lists the medications in the template’s columns with STATUS and INTERAKSI', () => {
    const [page] = layout();
    for (const caption of [
      'NO',
      'OBAT',
      'STATUS',
      'DOSIS',
      'ATURAN PAKAI',
      'DURASI',
      'INTERAKSI',
    ]) {
      expect(find(page, caption)).toMatchObject({ size: 5.5, color: COLOR.label });
    }
    const amlodipin = find(page, 'Amlodipin')!;
    const row = texts(page)
      .filter((op) => op.y === amlodipin.y)
      .map((op) => op.text);
    expect(row).toEqual([
      '1',
      'Amlodipin',
      'Lanjutan',
      '1x10mg',
      'Sesudah makan',
      '30 hari',
      'Simvastatin (mayor)',
    ]);
    expect(find(page, 'Simvastatin (mayor)')).toMatchObject({ color: COLOR.red });
    const parasetamol = find(page, 'Parasetamol')!;
    expect(texts(page).find((op) => op.y === parasetamol.y && op.text === '-')).toMatchObject({
      color: COLOR.ink,
    });
  });

  it('closes the table with the interaction check, a serious pair’s advice in red', () => {
    const [page] = layout();
    expect(
      find(page, 'Cek interaksi (DDInter): 1 interaksi antar obat resep ini, 1 serius.')
    ).toMatchObject({
      size: 6.5,
      color: COLOR.label,
    });
    expect(
      find(page, 'Amlodipin + Simvastatin (mayor): Batasi dosis simvastatin maksimal 20mg/hari.')
    ).toMatchObject({
      size: 6.5,
      color: COLOR.red,
    });
  });

  it('prints the education, the follow-up, the safety net and the alerts under Temuan', () => {
    const [page] = layout();
    expect(find(page, '1. Minum obat tekanan darah setiap hari pada jam yang sama.')).toBeDefined();
    expect(find(page, 'Kontrol 1 minggu')).toMatchObject({ size: 9.5 });
    expect(find(page, 'Nyeri kepala hebat mendadak')).toMatchObject({ size: 6.5 });
    expect(find(page, '!')).toMatchObject({ size: 19, color: COLOR.red });
    expect(texts(page).some((op) => op.text.startsWith('Tekanan darah tinggi: TD >= 140/90'))).toBe(true);
  });

  // Chief, 2026-10-04: the earlier visits as dated columns, the diagnosis and GDS as rows, a
  // sparkline before the template's arrow.
  it('sets the earlier visits as dated columns before HARI INI, with the diagnosis row', () => {
    const [page] = layout();
    for (const caption of [
      'PARAMETER',
      '12-06-26',
      '10-07-26',
      '14-08-26',
      '11-09-26',
      'HARI INI',
      'TREND',
    ]) {
      expect(find(page, caption)).toMatchObject({ size: 5.5, color: COLOR.label });
    }
    const diagnosis = find(page, 'Diagnosis')!;
    expect(
      texts(page)
        .filter((op) => op.y === diagnosis.y)
        .map((op) => op.text)
    ).toEqual(['Diagnosis', 'I10', 'I10', 'R51', 'I10', 'I10']);
    // The trend row, not block 02's grey GDS caption.
    const gds = texts(page).find((op) => op.text === 'GDS' && op.color === COLOR.ink)!;
    expect(
      texts(page)
        .filter((op) => op.y === gds.y)
        .map((op) => op.text)
    ).toEqual(['GDS', '130', '150', '138', '160', '142']);
  });

  it('draws a sparkline and the arrow for each vital with earlier values, neither without', () => {
    const arrows = (page: DrawOp[]) => page.filter((op) => op.kind === 'line' && op.width === 0.8);
    const sparks = (page: DrawOp[]) =>
      page.filter((op) => op.kind === 'line' && op.width === 0.5 && op.color === COLOR.label);
    // Six vitals, three strokes an arrow; five points, four segments a sparkline.
    expect(arrows(layout()[0])).toHaveLength(6 * 3);
    expect(sparks(layout()[0])).toHaveLength(6 * 4);
    const lonely = layout({ context: { ...input.context!, visitHistory: [] } })[0];
    expect(arrows(lonely)).toHaveLength(0);
    expect(sparks(lonely)).toHaveLength(0);
  });

  it('closes with the DPJP and the verifier under their captions', () => {
    const [page] = layout();
    expect(find(page, 'DPJP')).toMatchObject({ size: 5, color: COLOR.label });
    expect(find(page, 'VERIFIKATOR')).toMatchObject({ size: 5, color: COLOR.label });
    expect(find(page, 'dr. Klinisi Sintetis')).toMatchObject({ size: 6 });
  });

  it('draws the logomark once, on page 1, inside the title block', () => {
    const pages = layoutVisitSummary(buildVisitSummaryModel(longVisitSummaryInput), measure).pages;
    const logos = pages.map((page) => page.filter((op) => op.kind === 'logo'));
    expect(logos.map((ops) => ops.length)).toEqual([1, 0]);
    const [logo] = logos[0];
    expect(logo.kind === 'logo' && logo.x + logo.size).toBeLessThanOrEqual(MARGIN.left + 311.8);
  });

  it('writes the template’s footer, numbering the pages only when there are two', () => {
    const [single] = layout();
    expect(find(single, 'Sentra Asisten Medis  ·  Clinical Visit Summary (Prototype)')).toMatchObject({ y: FOOTER_Y, size: 5.5 });
    expect(find(single, 'RM RM-00-12-34  ·  dicetak 03-10-2026 14:20')).toMatchObject({ align: 'right' });
    const pages = layoutVisitSummary(buildVisitSummaryModel(longVisitSummaryInput), measure).pages;
    expect(find(pages[1], 'RM RM-00-12-34  ·  dicetak 03-10-2026 14:20  ·  2/2')).toBeDefined();
  });

  it('keeps every text inside the margins and above the footer, however long the content', () => {
    const long = 'Keluhan sangat panjang '.repeat(300);
    const pages = layoutVisitSummary(
      buildVisitSummaryModel({ ...longVisitSummaryInput, keluhanUtama: long }),
      measure
    ).pages;
    for (const op of pages.flatMap(texts)) {
      if (op.y === FOOTER_Y) continue;
      expect(op.y).toBeLessThanOrEqual(CONTENT_BOTTOM);
      const width = measure(op.text, op.size, op.spacing);
      const left = op.align === 'right' ? op.x - width : op.align === 'center' ? op.x - width / 2 : op.x;
      expect(left).toBeGreaterThanOrEqual(MARGIN.left - 0.01);
      expect(left + width).toBeLessThanOrEqual(MARGIN.left + CONTENT_WIDTH + 0.01);
    }
    const words = pages.flatMap(texts).flatMap((op) => op.text.split(' '));
    expect(words.filter((word) => word === 'panjang')).toHaveLength(300);
  });

  it('draws only WinAnsi characters, without a ?', () => {
    const [page] = layout({ keluhanUtama: 'Nyeri ≥ 3 hari → memberat' });
    expect(texts(page).some((op) => op.text.includes('?'))).toBe(false);
  });

  it('never prints a name from the visit history', () => {
    expect(JSON.stringify(layout())).not.toContain('Rahasia');
  });
});
