import type { VisitSummaryModel } from './visit-summary-model';
import { renderVisitSummaryPdf } from './visit-summary-pdf';

/** The logomark under `public/`; the side panel and the harness both serve it from the root. */
export const LOGO_PATH = '/brand/sentra-logomark-black.png';

export function visitSummaryFileName(model: VisitSummaryModel): string {
  const rm = model.head.rm.trim().replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'tanpa-rm';
  return `ringkasan-kunjungan-${rm}-${model.head.date}.pdf`;
}

/** Renders the visit summary and saves it the way "Unduh CSV" saves the daily report. */
export async function downloadVisitSummaryPdf(model: VisitSummaryModel): Promise<void> {
  const response = await fetch(LOGO_PATH);
  if (!response.ok) throw new Error(`Logo ${LOGO_PATH}: ${response.status}`);
  const bytes = await renderVisitSummaryPdf(model, new Uint8Array(await response.arrayBuffer()));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = visitSummaryFileName(model);
  anchor.click();
  URL.revokeObjectURL(url);
}
