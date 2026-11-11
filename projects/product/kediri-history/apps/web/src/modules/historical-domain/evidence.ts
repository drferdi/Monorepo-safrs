import { z } from "zod";

/**
 * Kelas evidence tidak pernah dilebur. Folklore yang terdokumentasi kuat tetap
 * folklore: kelas evidence dan tingkat keyakinan adalah dua sumbu berbeda
 * (Technical Bible bagian 11).
 */
export const EVIDENCE_CLASSES = [
  "primary_record",
  "historical_fact",
  "scholarly_interpretation",
  "tradition",
  "folklore",
  "modern_verified_data",
] as const;

export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number];

/** Label publik per kelas. Warna tidak pernah menjadi satu-satunya pembawa makna. */
export const EVIDENCE_CLASS_LABELS: Record<EvidenceClass, string> = {
  primary_record: "SUMBER PRIMER · PRIMARY RECORD",
  historical_fact: "FAKTA SEJARAH · HISTORICAL FACT",
  scholarly_interpretation: "INTERPRETASI AKADEMIK · SCHOLARLY INTERPRETATION",
  tradition: "TRADISI · TRADITION",
  folklore: "CERITA RAKYAT · FOLKLORE",
  modern_verified_data: "DATA MODERN TERVERIFIKASI · MODERN VERIFIED DATA",
};

/** Kelas yang wajib tampil dengan pelabelan tradisi/folklore yang eksplisit. */
export const NON_FACTUAL_EVIDENCE_CLASSES = [
  "tradition",
  "folklore",
] as const satisfies readonly EvidenceClass[];

export const CLAIM_STATUSES = [
  "researching",
  "needs_review",
  "verified",
  "approved",
  "published",
  "disputed",
  "superseded",
  "rejected",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/** Hanya published yang boleh menyuplai data produksi publik. */
export const PUBLIC_CLAIM_STATUS: ClaimStatus = "published";

export const EVIDENCE_LINK_ROLES = [
  "supports",
  "contradicts",
  "contextualizes",
  "mentions",
] as const;

export type EvidenceLinkRole = (typeof EVIDENCE_LINK_ROLES)[number];

export const EVIDENCE_LINK_STRENGTHS = [
  "direct",
  "strong",
  "moderate",
  "weak",
] as const;

export type EvidenceLinkStrength = (typeof EVIDENCE_LINK_STRENGTHS)[number];

export const evidenceClassSchema = z.enum(EVIDENCE_CLASSES);
export const claimStatusSchema = z.enum(CLAIM_STATUSES);
