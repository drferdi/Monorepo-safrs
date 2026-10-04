import type { VisitSummaryModel } from './visit-summary-model';
import { renderVisitSummaryPdf, type VisitSummaryAssets } from './visit-summary-pdf';

/** Files under `public/`; the side panel and the harness serve them from the root. */
export const ASSET_PATHS: Record<keyof VisitSummaryAssets, string> = {
  logo: '/brand/sentra-logomark-ink.png',
};

async function fetchBytes(path: string): Promise<Uint8Array> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/** The logomark the PDF embeds; the type is the standard Helvetica Bold. */
export async function loadVisitSummaryAssets(): Promise<VisitSummaryAssets> {
  return { logo: await fetchBytes(ASSET_PATHS.logo) };
}

export function visitSummaryFileName(model: VisitSummaryModel): string {
  const rm = model.head.rm.trim().replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'tanpa-rm';
  return `ringkasan-kunjungan-${rm}-${model.head.date}.pdf`;
}

/** Renders the visit summary and saves it the way "Unduh CSV" saves the daily report. */
export async function downloadVisitSummaryPdf(model: VisitSummaryModel): Promise<void> {
  const bytes = await renderVisitSummaryPdf(model, await loadVisitSummaryAssets());
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = visitSummaryFileName(model);
  anchor.click();
  URL.revokeObjectURL(url);
}
