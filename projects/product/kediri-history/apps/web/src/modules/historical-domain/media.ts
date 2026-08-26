import { z } from "zod";

/**
 * Autentisitas dan izin adalah dua pertanyaan terpisah: kelas visual menjawab
 * "ini bukti apa", kelas hak menjawab "boleh dipakai atau tidak"
 * (Visual Evidence Bible bagian 2 dan 3).
 */
export const VISUAL_EVIDENCE_CLASSES = [
  "V0_primary_object",
  "V1_documentary_historical_image",
  "V2_verified_contemporary_documentation",
  "V3_evidence_constrained_reconstruction",
  "V4_artistic_interpretation",
  "V5_folklore_visualization",
] as const;

export type VisualEvidenceClass = (typeof VISUAL_EVIDENCE_CLASSES)[number];

export const RIGHTS_CLASSES = [
  "R0_public_domain",
  "R1_open_license",
  "R2_institutional_use",
  "R3_permission_required",
  "R4_editorial_commercial_license",
  "R5_reference_only",
] as const;

export type RightsClass = (typeof RIGHTS_CLASSES)[number];

/** R5 menginformasikan riset dan desain; ia tidak pernah terbit ke publik. */
export const NEVER_PUBLIC_RIGHTS_CLASS: RightsClass = "R5_reference_only";

/**
 * Mencegah citra yang terlihat autentik dipasangkan pada tokoh yang wajahnya
 * tidak pernah terdokumentasi. Jayabhaya adalah no_known_likeness.
 */
export const REPRESENTATION_POLICIES = [
  "authenticated_likeness",
  "historical_photograph",
  "period_portrait",
  "symbolic_only",
  "no_known_likeness",
] as const;

export type RepresentationPolicy = (typeof REPRESENTATION_POLICIES)[number];

export const visualEvidenceClassSchema = z.enum(VISUAL_EVIDENCE_CLASSES);
export const rightsClassSchema = z.enum(RIGHTS_CLASSES);
