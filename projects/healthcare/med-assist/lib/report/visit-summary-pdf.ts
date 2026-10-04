import { PDFDocument, StandardFonts, rgb, setCharacterSpacing, type PDFFont, type RGB } from 'pdf-lib';

import { PAGE, layoutVisitSummary, type Measure } from './visit-summary-layout';
import type { VisitSummaryModel } from './visit-summary-model';

/** The ink Sentra logomark (Chief, 2026-10-04: "tambahkan logo Sentra"), as a file from `public/`. */
export interface VisitSummaryAssets {
  logo: Uint8Array;
}

const color = (hex: string): RGB =>
  rgb(
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255
  );

/**
 * The template is Arial bold throughout; the standard Helvetica Bold has Arial's widths and needs
 * no embedding. Letter spacing adds after every character, as PDF's Tc does.
 */
export async function embedTemplateFont(doc: PDFDocument): Promise<{ font: PDFFont; measure: Measure }> {
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  return {
    font,
    measure: (text, size, spacing = 0) => font.widthOfTextAtSize(text, size) + spacing * text.length,
  };
}

export async function renderVisitSummaryPdf(
  model: VisitSummaryModel,
  assets: VisitSummaryAssets
): Promise<Uint8Array<ArrayBuffer>> {
  const doc = await PDFDocument.create();
  doc.setTitle('Clinical Visit Summary');
  doc.setCreator('Sentra Asisten Medis');
  doc.setProducer('Sentra Asisten Medis');
  const { font, measure } = await embedTemplateFont(doc);
  const logo = await doc.embedPng(assets.logo);
  const fromBottom = (top: number): number => PAGE.height - top;

  for (const ops of layoutVisitSummary(model, measure).pages) {
    const page = doc.addPage([PAGE.width, PAGE.height]);
    for (const op of ops) {
      switch (op.kind) {
        case 'text': {
          const width = measure(op.text, op.size, op.spacing);
          const x = op.align === 'right' ? op.x - width : op.align === 'center' ? op.x - width / 2 : op.x;
          if (op.spacing) page.pushOperators(setCharacterSpacing(op.spacing));
          page.drawText(op.text, { x, y: fromBottom(op.y), size: op.size, font, color: color(op.color) });
          if (op.spacing) page.pushOperators(setCharacterSpacing(0));
          break;
        }
        case 'line':
          page.drawLine({
            start: { x: op.x1, y: fromBottom(op.y1) },
            end: { x: op.x2, y: fromBottom(op.y2) },
            thickness: op.width,
            color: color(op.color),
          });
          break;
        case 'rect':
          page.drawRectangle({
            x: op.x,
            y: fromBottom(op.y + op.height),
            width: op.width,
            height: op.height,
            color: color(op.color),
          });
          break;
        case 'logo':
          page.drawImage(logo, { x: op.x, y: fromBottom(op.y + op.size), width: op.size, height: op.size });
          break;
      }
    }
  }
  return new Uint8Array(await doc.save());
}
