import {
  type EvidenceClaimView,
  validateEvidenceClaim,
} from "./evidence-claim";
import { type EvidenceLinkInput, validateEvidenceLink } from "./evidence-link";
import { type MediaAssetView, validateMediaRights } from "./media-rights";
import {
  type SceneView,
  validateSceneAnchors,
  validateSceneContract,
} from "./scene-contract";
import {
  toReport,
  type ValidationFinding,
  type ValidationReport,
} from "./types";

/**
 * Gerbang integritas historis: satu laporan atas seluruh permukaan publik.
 *
 * Ini yang dijalankan `pnpm run verify:production`. Setiap temuan kritis
 * memblokir rilis — kegagalan integritas historis bukan peringatan
 * (Master Implementation Plan bagian 11 dan Phase 20).
 *
 * Fungsi ini murni: ia menerima pandangan data, bukan koneksi basis data.
 * Itulah yang membuatnya dapat diuji tanpa CMS, dan mengapa modul ini tidak
 * pernah menyentuh Payload.
 */
export interface IntegrityInput {
  readonly claims?: readonly EvidenceClaimView[];
  readonly links?: readonly EvidenceLinkInput[];
  readonly media?: readonly MediaAssetView[];
  readonly scenes?: readonly SceneView[];
  readonly knownChoreographyKeys?: readonly string[];
  /** Waktu evaluasi, diserahkan supaya hasilnya deterministik saat diuji. */
  readonly now?: number;
}

export function validateHistoricalIntegrity(
  input: IntegrityInput,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const claims = input.claims ?? [];
  const links = input.links ?? [];
  const media = input.media ?? [];
  const scenes = input.scenes ?? [];
  const keys = input.knownChoreographyKeys ?? [];
  const now = input.now ?? Date.now();

  for (const claim of claims) findings.push(...validateEvidenceClaim(claim));
  for (const link of links) findings.push(...validateEvidenceLink(link));
  for (const asset of media) findings.push(...validateMediaRights(asset, now));
  for (const scene of scenes) {
    findings.push(...validateSceneContract(scene, keys));
  }
  findings.push(...validateSceneAnchors(scenes));

  return toReport(
    findings,
    claims.length + links.length + media.length + scenes.length,
  );
}

/** Ringkasan yang dicetak laporan produksi. */
export function summariseIntegrity(report: ValidationReport): string {
  const byRule = new Map<string, number>();
  for (const finding of report.findings) {
    byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1);
  }
  const critical = report.findings.filter(
    (finding) => finding.severity === "critical",
  ).length;
  const lines = [
    `Records checked......... ${report.checked}`,
    `Critical failures....... ${critical}`,
    `Warnings................ ${report.findings.length - critical}`,
  ];
  for (const [rule, count] of [...byRule.entries()].sort()) {
    lines.push(`  ${rule}: ${count}`);
  }
  return lines.join("\n");
}
