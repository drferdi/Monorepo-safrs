import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { VisitSummaryAssets } from './visit-summary-pdf';

const read = (path: string): Uint8Array =>
  new Uint8Array(readFileSync(fileURLToPath(new URL(`../../public${path}`, import.meta.url))));

/** The logomark and the font as the side panel serves them, read from `public/` (tests only). */
export function readVisitSummaryAssets(): VisitSummaryAssets {
  return { logo: read('/brand/sentra-logomark-ink.png'), font: read('/fonts/IBMPlexSans-Bold.ttf') };
}
