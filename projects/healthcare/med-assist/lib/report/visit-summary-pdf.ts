import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, setCharacterSpacing, type PDFFont, type RGB } from 'pdf-lib';

import { PAGE, layoutVisitSummary, type Measure } from './visit-summary-layout';
import type { VisitSummaryModel } from './visit-summary-model';

/**
 * The ink Sentra logomark (Chief, 2026-10-04: "tambahkan logo Sentra") and IBM Plex Sans Bold
 * (Chief, 2026-10-04: "Text summary gunakan IBM Plex Sans"), as files from `public/`.
 */
export interface VisitSummaryAssets {
  logo: Uint8Array;
  font: Uint8Array;
}

const color = (hex: string): RGB =>
  rgb(
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255
  );

/**
 * The template is bold throughout, so the text is IBM Plex Sans Bold, subset to the glyphs drawn.
 * Letter spacing adds after every character, as PDF's Tc does.
 */
export async function embedTemplateFont(
  doc: PDFDocument,
  bytes: Uint8Array
): Promise<{ font: PDFFont; measure: Measure }> {
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(bytes, { subset: true });
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
  const { font, measure } = await embedTemplateFont(doc, assets.font);
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
