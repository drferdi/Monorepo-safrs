// @vitest-environment node
import { PDFDict, PDFDocument, PDFName, type PDFPage } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { buildVisitSummaryModel } from './visit-summary-model';
import { renderVisitSummaryPdf } from './visit-summary-pdf';
import { longVisitSummaryInput, syntheticVisitSummaryInput } from './visit-summary.fixtures';
import { readVisitSummaryAssets } from './visit-summary.test-assets';

const assets = readVisitSummaryAssets();
/** The BaseFont names of the fonts the document embeds, without pdf-lib's subset tag ("-4801"). */
const baseFonts = (doc: PDFDocument): string[] =>
  doc.context
    .enumerateIndirectObjects()
    .map(([, object]) => object)
    .filter((object): object is PDFDict => object instanceof PDFDict)
    .filter((dict) => dict.get(PDFName.of('Type')) === PDFName.of('Font'))
    .map((dict) => dict.lookupMaybe(PDFName.of('BaseFont'), PDFName)?.decodeText().replace(/-\d{4}$/, ''))
    .filter((name): name is string => Boolean(name));
const images = (page: PDFPage): number =>
  page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict)?.keys().length ?? 0;

describe('renderVisitSummaryPdf', () => {
  // Migrated (Chief 2026-10-03, "lebih komprehensif"): with Edukasi and Tindak lanjut the synthetic
  // visit takes two pages (Tren TTV whole on page 2), so the count is 2, no longer 1.
  it('writes an A4 PDF titled for the visit, with the logo on page 1', async () => {
    const doc = await PDFDocument.load(
      await renderVisitSummaryPdf(buildVisitSummaryModel(syntheticVisitSummaryInput), assets)
    );
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });
    expect(doc.getTitle()).toBe('Ringkasan Kunjungan');
    expect(doc.getCreator()).toBe('Sentra Med Assist');
    expect(doc.getAuthor()).toBeUndefined();
    expect(images(doc.getPage(0))).toBe(1);
  });

  it('sets the text in IBM Plex Sans, regular and bold, and no standard font', async () => {
    const doc = await PDFDocument.load(
      await renderVisitSummaryPdf(buildVisitSummaryModel(syntheticVisitSummaryInput), assets)
    );
    expect(new Set(baseFonts(doc))).toEqual(new Set(['IBMPlexSans', 'IBMPlexSans-Bold']));
  });

  it('keeps the logo off the later pages', async () => {
    const doc = await PDFDocument.load(
      await renderVisitSummaryPdf(buildVisitSummaryModel(longVisitSummaryInput), assets)
    );
    expect(doc.getPageCount()).toBe(2);
    expect(images(doc.getPage(1))).toBe(0);
  });
});
