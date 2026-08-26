import {
  NEVER_PUBLIC_RIGHTS_CLASS,
  type RightsClass,
  type VisualEvidenceClass,
} from "../historical-domain/index";
import type { ValidationFinding } from "./types";

/**
 * Hak dan provenance media (Visual Evidence Bible bagian 3, 4, dan 16).
 *
 * Autentisitas dan izin diperiksa terpisah karena memang pertanyaan yang
 * berbeda: sebuah foto boleh sepenuhnya autentik dan tetap tidak boleh terbit.
 */
export interface MediaAssetView {
  readonly id: string;
  readonly isPublic: boolean;
  readonly visualEvidenceClass?: VisualEvidenceClass;
  readonly rightsClass?: RightsClass;
  readonly altText?: string;
  readonly creditLine?: string;
  readonly institution?: string;
  readonly rightsExpiresAt?: string;
  readonly assetStatus?: string;
  /** Apakah aset ini merujuk master privat, bukan menyalinnya. */
  readonly masterId?: string;
}

export function validateMediaRights(
  asset: MediaAssetView,
  now: number,
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  if (!asset.isPublic) return findings;

  if (!asset.visualEvidenceClass) {
    findings.push({
      rule: "public-media-requires-evidence-class",
      severity: "critical",
      subject: asset.id,
      message:
        "A public asset must say what it is evidence of: V0 to V5. Without it the audience cannot tell record from reconstruction.",
    });
  }
  if (!asset.rightsClass) {
    findings.push({
      rule: "public-media-requires-rights-class",
      severity: "critical",
      subject: asset.id,
      message: "A public asset must carry its rights class.",
    });
  }
  if (asset.rightsClass === NEVER_PUBLIC_RIGHTS_CLASS) {
    findings.push({
      rule: "reference-only-never-public",
      severity: "critical",
      subject: asset.id,
      message:
        "A reference-only asset may inform research and design, but it never ships publicly.",
    });
  }
  if (!asset.altText) {
    findings.push({
      rule: "public-media-requires-alt-text",
      severity: "critical",
      subject: asset.id,
      message:
        "A public asset needs alternative text. An image nobody can hear is not published history.",
    });
  }
  if (!asset.creditLine) {
    findings.push({
      rule: "public-media-requires-credit",
      severity: "critical",
      subject: asset.id,
      message:
        "A public asset needs its credit line exactly as the holding institution requires.",
    });
  }
  if (
    asset.rightsExpiresAt !== undefined &&
    new Date(asset.rightsExpiresAt).getTime() < now
  ) {
    findings.push({
      rule: "expired-rights-public",
      severity: "critical",
      subject: asset.id,
      message: "The permission covering this public asset has expired.",
    });
  }
  if (asset.assetStatus === "black") {
    findings.push({
      rule: "prohibited-representation-public",
      severity: "critical",
      subject: asset.id,
      message:
        "This asset is classified as a prohibited representation. Visual quality does not make it publishable.",
    });
  }
  if (asset.assetStatus === "red" || asset.assetStatus === "amber") {
    findings.push({
      rule: "unresolved-evidence-public",
      severity: "critical",
      subject: asset.id,
      message:
        "This asset still has unresolved evidence status and must not be public yet.",
    });
  }

  return findings;
}
