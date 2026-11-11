import type { ValidationFinding } from "./types";

/**
 * Sebuah EvidenceLink adalah pernyataan tentang HUBUNGAN, bukan sekadar
 * penunjuk (Technical Bible bagian 12).
 *
 * Peran contradicts sengaja diperlakukan sebagai tautan yang sah dan berharga:
 * sumber yang membantah tetap bukti. Yang tidak sah adalah tautan tanpa
 * locator yang mengaku berkekuatan langsung — klaim ketepatan tanpa alamat.
 */
export interface EvidenceLinkInput {
  readonly id: string;
  readonly claimId?: string;
  readonly sourceId?: string;
  readonly role?: string;
  readonly strength?: string;
  readonly locator?: string;
  readonly sourceLinkStatus?: string;
}

const ROLES = new Set([
  "supports",
  "contradicts",
  "contextualizes",
  "mentions",
]);
const STRENGTHS = new Set(["direct", "strong", "moderate", "weak"]);

export function validateEvidenceLink(
  link: EvidenceLinkInput,
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  if (!link.claimId || !link.sourceId) {
    findings.push({
      rule: "evidence-link-requires-both-ends",
      severity: "critical",
      subject: link.id,
      message: "An evidence link must connect one claim to one source.",
    });
  }
  if (!link.role || !ROLES.has(link.role)) {
    findings.push({
      rule: "evidence-link-requires-role",
      severity: "critical",
      subject: link.id,
      message:
        "An evidence link must say how the source relates: supports, contradicts, contextualizes, or mentions.",
    });
  }
  if (!link.strength || !STRENGTHS.has(link.strength)) {
    findings.push({
      rule: "evidence-link-requires-strength",
      severity: "critical",
      subject: link.id,
      message: "An evidence link must state its strength.",
    });
  }
  if (
    (link.strength === "direct" || link.strength === "strong") &&
    !link.locator
  ) {
    findings.push({
      rule: "strong-link-requires-locator",
      severity: "critical",
      subject: link.id,
      message:
        "A direct or strong link must name the page, line, or frame it rests on. Precision without an address is not precision.",
    });
  }
  if (link.sourceLinkStatus === "withdrawn") {
    findings.push({
      rule: "withdrawn-source-still-linked",
      severity: "critical",
      subject: link.id,
      message: "This link rests on a withdrawn source.",
    });
  }
  if (link.sourceLinkStatus === "broken_link") {
    findings.push({
      rule: "broken-source-link",
      severity: "warning",
      subject: link.id,
      message: "The source behind this link is marked as a broken link.",
    });
  }

  return findings;
}
