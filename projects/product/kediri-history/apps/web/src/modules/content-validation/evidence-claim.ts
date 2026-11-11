import {
  type ClaimStatus,
  EVIDENCE_CLASS_LABELS,
  type EvidenceClass,
  NON_FACTUAL_EVIDENCE_CLASSES,
  PUBLIC_CLAIM_STATUS,
} from "../historical-domain/index";
import type { ValidationFinding } from "./types";

/**
 * Gerbang publikasi untuk satu EvidenceClaim (Master Implementation Plan
 * Phase 6, Technical Bible bagian 31).
 *
 * Aturan yang berlaku:
 *   - klaim terbit wajib punya sekurangnya satu EvidenceLink yang valid;
 *   - klaim primary_record wajib ditopang bukti primer yang kompatibel —
 *     kutipan sekunder tidak menjadikan sesuatu sebagai catatan primer;
 *   - klaim tradisi dan folklor wajib berlabel eksplisit sebagai tradisi atau
 *     folklor, tidak pernah sebagai fakta;
 *   - klaim terbit wajib punya peninjau historis bernama dan tanggal tinjauan;
 *   - klaim yang sudah digantikan tidak boleh menjadi kanon publik.
 */

export interface EvidenceLinkView {
  readonly role: "supports" | "contradicts" | "contextualizes" | "mentions";
  readonly strength: "direct" | "strong" | "moderate" | "weak";
  readonly sourceType?: string;
  readonly locator?: string;
}

export interface EvidenceClaimView {
  readonly id: string;
  readonly canonicalStatement: string;
  readonly publicSummary?: string;
  readonly evidenceClass: EvidenceClass;
  readonly status: ClaimStatus;
  readonly links: readonly EvidenceLinkView[];
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
  readonly supersededBy?: string;
  /** Label yang benar-benar akan dilihat publik untuk klaim ini. */
  readonly publicBadgeLabel?: string;
}

/** Jenis sumber yang dapat menopang klaim primary_record. */
const PRIMARY_SOURCE_TYPES = new Set([
  "inscription",
  "manuscript",
  "archival_document",
  "law",
  "government_record",
  "official_statistics",
  "museum_catalogue",
  "photograph",
  "map",
  "corporate_record",
]);

const FACTUAL_BADGES = new Set([
  EVIDENCE_CLASS_LABELS.historical_fact,
  EVIDENCE_CLASS_LABELS.primary_record,
]);

export function validateEvidenceClaim(
  claim: EvidenceClaimView,
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const isPublic = claim.status === PUBLIC_CLAIM_STATUS;
  const supporting = claim.links.filter(
    (link) => link.role === "supports" || link.role === "contextualizes",
  );

  const nonFactual = (
    NON_FACTUAL_EVIDENCE_CLASSES as readonly EvidenceClass[]
  ).includes(claim.evidenceClass);
  const badge =
    claim.publicBadgeLabel ?? EVIDENCE_CLASS_LABELS[claim.evidenceClass];

  if (nonFactual && FACTUAL_BADGES.has(badge)) {
    findings.push({
      rule: "folklore-not-fact",
      severity: "critical",
      subject: claim.id,
      message: `A ${claim.evidenceClass} claim is presented as "${badge}". Folklore is evidence of what people remember, not of what happened.`,
    });
  }

  if (!isPublic) return findings;

  if (supporting.length === 0) {
    findings.push({
      rule: "published-claim-requires-source",
      severity: "critical",
      subject: claim.id,
      message: "A published claim has no supporting EvidenceLink.",
    });
  }

  if (claim.evidenceClass === "primary_record") {
    const hasPrimary = supporting.some(
      (link) =>
        link.sourceType !== undefined &&
        PRIMARY_SOURCE_TYPES.has(link.sourceType) &&
        (link.strength === "direct" || link.strength === "strong"),
    );
    if (!hasPrimary) {
      findings.push({
        rule: "primary-record-requires-primary-evidence",
        severity: "critical",
        subject: claim.id,
        message:
          "A primary-record claim needs a direct or strong link to a primary source type. Secondary discussion does not make a record primary.",
      });
    }
  }

  if (!claim.reviewedBy || !claim.reviewedAt) {
    findings.push({
      rule: "published-claim-requires-reviewer",
      severity: "critical",
      subject: claim.id,
      message:
        "A published claim needs a named historical reviewer and a review date.",
    });
  }

  if (!claim.publicSummary) {
    findings.push({
      rule: "published-claim-requires-public-summary",
      severity: "warning",
      subject: claim.id,
      message:
        "A published claim has no public summary; the audience would read the internal statement.",
    });
  }

  if (claim.supersededBy) {
    findings.push({
      rule: "superseded-claim-not-canonical",
      severity: "critical",
      subject: claim.id,
      message:
        "A superseded claim is still published. Corrections replace the canonical claim rather than sitting beside it.",
    });
  }

  return findings;
}
