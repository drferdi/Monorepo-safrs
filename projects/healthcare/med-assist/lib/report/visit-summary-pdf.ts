import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type RGB } from 'pdf-lib';

import { PAGE, layoutVisitSummary, type FontWeight, type Measure, type Tone } from './visit-summary-layout';
import type { VisitSummaryModel } from './visit-summary-model';

// Chief, 2026-10-03: Oxford blue (#002147) for structure, red orange (#FF4500) for numbers and
// alarms, near-black text, white on the Oxford band.
const TONES: Record<Tone, RGB> = {
  ink: rgb(0.07, 0.07, 0.07),
  muted: rgb(0.45, 0.45, 0.45),
  oxford: rgb(0, 33 / 255, 71 / 255),
  signal: rgb(1, 69 / 255, 0),
  paper: rgb(1, 1, 1),
  tint: rgb(0.78, 0.82, 0.88),
  band: rgb(0.9, 0.91, 0.93),
};
const HAIRLINE = 0.5;
const TREND_LINE = 0.75;

/** The white logomark and IBM Plex Sans (Chief, 2026-10-03), as files from `public/`. */
export interface VisitSummaryAssets {
  logo: Uint8Array;
  regular: Uint8Array;
  bold: Uint8Array;
}

/** IBM Plex Sans Regular and Bold, subset to the glyphs drawn, and widths measured with them. */
export async function embedPlexSans(
  doc: PDFDocument,
  assets: Pick<VisitSummaryAssets, 'regular' | 'bold'>
): Promise<{ fonts: Record<FontWeight, PDFFont>; measure: Measure }> {
  doc.registerFontkit(fontkit);
  const fonts: Record<FontWeight, PDFFont> = {
    regular: await doc.embedFont(assets.regular, { subset: true }),
    bold: await doc.embedFont(assets.bold, { subset: true }),
  };
  return { fonts, measure: (text, weight, size) => fonts[weight].widthOfTextAtSize(text, size) };
}

export async function renderVisitSummaryPdf(
  model: VisitSummaryModel,
  assets: VisitSummaryAssets
): Promise<Uint8Array<ArrayBuffer>> {
  const doc = await PDFDocument.create();
  doc.setTitle('Ringkasan Kunjungan');
  doc.setCreator('Sentra Med Assist');
  doc.setProducer('Sentra Med Assist');
  const { fonts, measure } = await embedPlexSans(doc, assets);
  const logo = await doc.embedPng(assets.logo);
  const fromBottom = (top: number): number => PAGE.height - top;

  for (const ops of layoutVisitSummary(model, measure).pages) {
    const page = doc.addPage([PAGE.width, PAGE.height]);
    for (const op of ops) {
      switch (op.kind) {
        case 'text': {
          const font = fonts[op.weight];
          const x = op.align === 'right' ? op.x - font.widthOfTextAtSize(op.text, op.size) : op.x;
          page.drawText(op.text, { x, y: fromBottom(op.y), size: op.size, font, color: TONES[op.tone] });
          break;
        }
        case 'rule':
          page.drawLine({
            start: { x: op.x1, y: fromBottom(op.y) },
            end: { x: op.x2, y: fromBottom(op.y) },
            thickness: HAIRLINE,
            color: TONES.oxford,
          });
          break;
        case 'rect':
          page.drawRectangle({
            x: op.x,
            y: fromBottom(op.y + op.height),
            width: op.width,
            height: op.height,
            color: TONES[op.tone],
          });
          break;
        case 'polyline':
          op.points.slice(1).forEach(([x, y], i) => {
            const [fromX, fromY] = op.points[i];
            page.drawLine({
              start: { x: fromX, y: fromBottom(fromY) },
              end: { x, y: fromBottom(y) },
              thickness: TREND_LINE,
              color: TONES[op.tone],
            });
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
