// @vitest-environment node
import { PDFDict, PDFDocument, PDFName, type PDFPage } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { buildVisitSummaryModel } from './visit-summary-model';
import { renderVisitSummaryPdf } from './visit-summary-pdf';
import { longVisitSummaryInput, syntheticVisitSummaryInput } from './visit-summary.fixtures';
import { readVisitSummaryAssets } from './visit-summary.test-assets';

const assets = readVisitSummaryAssets();
/** The BaseFont names of the fonts the document uses. */
const baseFonts = (doc: PDFDocument): string[] =>
  doc.context
    .enumerateIndirectObjects()
    .map(([, object]) => object)
    .filter((object): object is PDFDict => object instanceof PDFDict)
    .filter((dict) => dict.get(PDFName.of('Type')) === PDFName.of('Font'))
    .map((dict) => dict.lookupMaybe(PDFName.of('BaseFont'), PDFName)?.decodeText())
    .filter((name): name is string => Boolean(name));
const images = (page: PDFPage): number =>
  page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict)?.keys().length ?? 0;

describe('renderVisitSummaryPdf', () => {
  // The approved template (Chief, 2026-10-04) is one A4 page.
  it('writes the synthetic visit on one A4 page titled for the summary, with the logo', async () => {
    const doc = await PDFDocument.load(
      await renderVisitSummaryPdf(buildVisitSummaryModel(syntheticVisitSummaryInput), assets)
    );
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });
    expect(doc.getTitle()).toBe('Clinical Visit Summary');
    expect(doc.getCreator()).toBe('Sentra Asisten Medis');
    expect(doc.getAuthor()).toBeUndefined();
    expect(images(doc.getPage(0))).toBe(1);
  });

  it('sets the text in Helvetica Bold, the template’s Arial bold by its metrics', async () => {
    const doc = await PDFDocument.load(
      await renderVisitSummaryPdf(buildVisitSummaryModel(syntheticVisitSummaryInput), assets)
    );
    expect(new Set(baseFonts(doc))).toEqual(new Set(['Helvetica-Bold']));
  });

  it('continues a long prescription on a second page without the logo', async () => {
    const doc = await PDFDocument.load(
      await renderVisitSummaryPdf(buildVisitSummaryModel(longVisitSummaryInput), assets)
    );
    expect(doc.getPageCount()).toBe(2);
    expect(images(doc.getPage(1))).toBe(0);
  });
});
