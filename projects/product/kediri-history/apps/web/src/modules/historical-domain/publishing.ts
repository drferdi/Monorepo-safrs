import { z } from "zod";

/**
 * Status tinjauan yang dipakai entitas historis. Berbeda dari status klaim:
 * sebuah Event dapat berstatus tinjauan editorial sementara klaim yang
 * ditopangnya punya siklus buktinya sendiri (Technical Bible bagian 13).
 */
export const REVIEW_STATUSES = [
  "researching",
  "needs_review",
  "reviewed",
  "approved",
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Status draft/terbit milik Payload. Hanya published yang menyuplai publik. */
export const DOCUMENT_STATUSES = ["draft", "published"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/**
 * Tingkat keandalan sumber. Ini penilaian editorial atas sumbernya, bukan atas
 * klaimnya — sumber yang andal tetap bisa menopang klaim yang lemah.
 */
export const RELIABILITY_TIERS = [
  "primary",
  "peer_reviewed",
  "institutional",
  "reputable_secondary",
  "popular",
  "unverified",
] as const;

export type ReliabilityTier = (typeof RELIABILITY_TIERS)[number];

export const reviewStatusSchema = z.enum(REVIEW_STATUSES);
export const reliabilityTierSchema = z.enum(RELIABILITY_TIERS);
