// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { PDFDict, PDFDocument, PDFName, type PDFPage } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { buildVisitSummaryModel } from './visit-summary-model';
import { renderVisitSummaryPdf } from './visit-summary-pdf';
import { longVisitSummaryInput, syntheticVisitSummaryInput } from './visit-summary.fixtures';

const logo = new Uint8Array(
  readFileSync(fileURLToPath(new URL('../../public/brand/sentra-logomark-black.png', import.meta.url)))
);
const images = (page: PDFPage): number =>
  page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict)?.keys().length ?? 0;

describe('renderVisitSummaryPdf', () => {
  it('writes an A4 PDF titled for the visit, with the logo on page 1', async () => {
    const doc = await PDFDocument.load(
      await renderVisitSummaryPdf(buildVisitSummaryModel(syntheticVisitSummaryInput), logo)
    );
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });
    expect(doc.getTitle()).toBe('Ringkasan Kunjungan');
    expect(doc.getCreator()).toBe('Sentra Med Assist');
    expect(doc.getAuthor()).toBeUndefined();
    expect(images(doc.getPage(0))).toBe(1);
  });

  it('keeps the logo off the later pages', async () => {
    const doc = await PDFDocument.load(
      await renderVisitSummaryPdf(buildVisitSummaryModel(longVisitSummaryInput), logo)
    );
    expect(doc.getPageCount()).toBe(2);
    expect(images(doc.getPage(1))).toBe(0);
  });
});
