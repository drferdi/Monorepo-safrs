import type { ReactElement } from "react";

import type { ClaimDto } from "../../content/dto";
import { PUBLIC_EVIDENCE_LANGUAGE } from "../../content/public-evidence-language";
import { EvidenceClassBadge } from "./evidence-badge";

const CONFIDENCE_LABELS: Readonly<Record<string, string>> = {
  high: "Tinggi",
  moderate: "Sedang",
  low: "Rendah",
  contested: "Masih diperdebatkan",
};

/**
 * Satu klaim beserta seluruh buktinya, dirender penuh di HTML.
 *
 * Ini permukaan Depth 3 (UX Bible bagian 7): objek, tanggal, institusi,
 * inventaris, jenis bukti, apa yang ditopangnya, dan apa yang TIDAK
 * ditetapkannya. Mengajarkan batas sebuah sumber adalah bagian dari
 * mengajarkan sejarah.
 *
 * Tidak ada JavaScript yang dibutuhkan untuk membacanya.
 */
export function ClaimRecord({
  claim,
}: {
  readonly claim: ClaimDto;
}): ReactElement {
  const supporting = claim.links.filter((link) => link.role === "supports");
  const contradicting = claim.links.filter(
    (link) => link.role === "contradicts",
  );
  const contextual = claim.links.filter(
    (link) => link.role === "contextualizes" || link.role === "mentions",
  );

  return (
    <article className="claim" id={`claim-${claim.slug}`}>
      <p className="claim-statement prose">{claim.statement}</p>
      <p>
        <EvidenceClassBadge evidenceClass={claim.evidenceClass} />{" "}
        <span className="archive-label">
          {PUBLIC_EVIDENCE_LANGUAGE.confidence}:{" "}
          {CONFIDENCE_LABELS[claim.confidence] ?? claim.confidence}
        </span>
      </p>

      {supporting.length > 0 ? (
        <>
          <h4 className="archive-label">
            {PUBLIC_EVIDENCE_LANGUAGE.supporting}
          </h4>
          <ul className="record-list">
            {supporting.map((link) => (
              <li key={link.id}>
                <span className="record-title">
                  {link.source?.title ?? "Sumber belum terbit"}
                </span>
                <span className="record-meta">
                  {[
                    link.source?.institution,
                    link.source?.inventoryNumber,
                    link.locator,
                    link.strength,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {link.note ? <span className="prose">{link.note}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {contradicting.length > 0 ? (
        <>
          {/* Ketidaksepakatan dipertahankan, tidak dihapus. */}
          <h4 className="archive-label">
            {PUBLIC_EVIDENCE_LANGUAGE.differing}
          </h4>
          <ul className="record-list">
            {contradicting.map((link) => (
              <li key={link.id}>
                <span className="record-title">
                  {link.source?.title ?? "Sumber belum terbit"}
                </span>
                <span className="record-meta">
                  {[link.source?.institution, link.locator]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {link.note ? <span className="prose">{link.note}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {contextual.length > 0 ? (
        <>
          <h4 className="archive-label">{PUBLIC_EVIDENCE_LANGUAGE.context}</h4>
          <ul className="record-list">
            {contextual.map((link) => (
              <li key={link.id}>
                <span className="record-title">
                  {link.source?.title ?? "Sumber belum terbit"}
                </span>
                <span className="record-meta">
                  {[link.source?.institution, link.locator]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {claim.competingClaimSlugs.length > 0 ? (
        <p className="archive-label">
          {PUBLIC_EVIDENCE_LANGUAGE.competing}:{" "}
          {claim.competingClaimSlugs.join(", ")}
        </p>
      ) : null}
    </article>
  );
}
