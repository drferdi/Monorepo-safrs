import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { VisitSummaryAssets } from './visit-summary-pdf';

const read = (path: string): Uint8Array =>
  new Uint8Array(readFileSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url))));

/** The logomark as the side panel serves it, read from `public/` (tests only). */
export function readVisitSummaryAssets(): VisitSummaryAssets {
  return { logo: read('/brand/sentra-logomark-ink.png') };
}
