import {
  type ClaimStatus,
  PUBLIC_CLAIM_STATUS,
} from "../historical-domain/index";
import type { ValidationFinding } from "./types";

/**
 * Kontrak Scene (Technical Bible bagian 31, Master Implementation Plan
 * Phase 6).
 *
 * Catatan batas modul: daftar choreography key yang sah TIDAK diimpor dari
 * modul motion — content-validation tidak boleh bergantung padanya. Daftar itu
 * diserahkan sebagai argumen oleh kode aplikasi yang menyusun keduanya. Ini
 * membuat aturan tetap dapat diuji tanpa GSAP dan menjaga arah dependensi
 * tetap satu arah.
 */
export interface SceneView {
  readonly id: string;
  readonly slug: string;
  readonly isPublic: boolean;
  readonly primaryEventId?: string;
  readonly narrativeShort?: string;
  readonly choreographyKey?: string;
  readonly heroMedia?: { readonly id: string; readonly isPublic: boolean };
  readonly featuredClaims: readonly {
    readonly id: string;
    readonly status: ClaimStatus;
  }[];
  readonly actId?: string;
}

export function validateSceneContract(
  scene: SceneView,
  knownChoreographyKeys: readonly string[],
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  if (
    scene.choreographyKey !== undefined &&
    scene.choreographyKey.length > 0 &&
    !knownChoreographyKeys.includes(scene.choreographyKey)
  ) {
    findings.push({
      rule: "unknown-choreography-key",
      severity: "critical",
      subject: scene.id,
      message: `Scene references choreography key "${scene.choreographyKey}", which the motion registry does not define.`,
    });
  }

  if (!scene.isPublic) return findings;

  if (!scene.primaryEventId) {
    findings.push({
      rule: "scene-requires-primary-event",
      severity: "critical",
      subject: scene.id,
      message:
        "A published scene must reference the event it presents. A scene presents history; it does not own it.",
    });
  }
  if (!scene.actId) {
    findings.push({
      rule: "scene-requires-act",
      severity: "critical",
      subject: scene.id,
      message: "A published scene must belong to a journey act.",
    });
  }
  if (!scene.narrativeShort) {
    findings.push({
      rule: "scene-requires-narrative",
      severity: "critical",
      subject: scene.id,
      message:
        "A published scene must be understandable before any motion runs.",
    });
  }

  for (const claim of scene.featuredClaims) {
    if (claim.status !== PUBLIC_CLAIM_STATUS) {
      findings.push({
        rule: "scene-uses-draft-claim",
        severity: "critical",
        subject: scene.id,
        message: `Scene features claim ${claim.id}, which is ${claim.status} rather than published.`,
      });
    }
  }

  if (scene.heroMedia && !scene.heroMedia.isPublic) {
    findings.push({
      rule: "scene-hero-media-not-public",
      severity: "critical",
      subject: scene.id,
      message: `Scene hero media ${scene.heroMedia.id} is not published; a public scene cannot rest on an unpublished asset.`,
    });
  }

  return findings;
}

/**
 * Anchor Journey adalah kontrak publik: /journey#1135-panjalu-jayati harus
 * tetap hidup bertahun-tahun setelah dibagikan seorang guru (UX Bible bagian
 * 25). Duplikat anchor diam-diam mematahkan salah satunya.
 */
export function validateSceneAnchors(
  scenes: readonly SceneView[],
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const seen = new Map<string, string>();

  for (const scene of scenes) {
    const existing = seen.get(scene.slug);
    if (existing !== undefined) {
      findings.push({
        rule: "duplicate-scene-anchor",
        severity: "critical",
        subject: scene.id,
        message: `Scene anchor "${scene.slug}" is already used by ${existing}. Deep links must stay unambiguous.`,
      });
      continue;
    }
    seen.set(scene.slug, scene.id);
  }

  return findings;
}
