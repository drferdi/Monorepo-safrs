import type { ReactElement } from "react";

import type { ClaimDto } from "../../content/dto";
import { EvidenceBadge as Badge } from "../../modules/design-system/index";
import type { EvidenceClass } from "../../modules/historical-domain/index";
import { EVIDENCE_CLASS_LABELS } from "../../modules/historical-domain/index";

/**
 * Pemetaan kelas bukti ke bentuk publiknya (Bible 04 bagian 20). Pemetaan ini
 * tinggal di kode aplikasi, bukan di design-system: modul design-system tidak
 * boleh mengetahui subjek historis.
 */
const SYMBOLS: Record<EvidenceClass, string> = {
  primary_record: "●",
  historical_fact: "■",
  scholarly_interpretation: "◐",
  tradition: "◇",
  folklore: "✦",
  modern_verified_data: "▲",
};

export function EvidenceClassBadge({
  evidenceClass,
}: {
  readonly evidenceClass: EvidenceClass;
}): ReactElement {
  return (
    <Badge
      label={EVIDENCE_CLASS_LABELS[evidenceClass]}
      symbol={SYMBOLS[evidenceClass]}
    />
  );
}

/**
 * Kelas bukti tertinggi yang benar-benar tampil pada sebuah scene. Folklore
 * dan tradisi tidak pernah dinaikkan menjadi fakta di sini; fungsi ini hanya
 * memilih satu penanda ketika beberapa klaim tampil bersama, dan memilih yang
 * paling berhati-hati bila keduanya hadir.
 */
const CAUTION_ORDER: readonly EvidenceClass[] = [
  "folklore",
  "tradition",
  "scholarly_interpretation",
  "modern_verified_data",
  "historical_fact",
  "primary_record",
];

export function dominantEvidenceClass(
  claims: readonly ClaimDto[],
): EvidenceClass | undefined {
  for (const candidate of CAUTION_ORDER) {
    if (claims.some((claim) => claim.evidenceClass === candidate)) {
      return candidate;
    }
  }
  return undefined;
}
