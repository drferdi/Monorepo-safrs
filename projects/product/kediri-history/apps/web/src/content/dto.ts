import type {
  ChronologyPrecision,
  EvidenceClass,
  RightsClass,
  VisualEvidenceClass,
} from "../modules/historical-domain/index";

/**
 * DTO publik.
 *
 * Dokumen CMS mentah tidak pernah mengalir ke pohon UI: ia memuat catatan
 * editorial internal, referensi master privat, data hak, dan relasi yang belum
 * terbit (Technical Bible bagian 36). Yang menyeberang ke React hanyalah
 * bentuk-bentuk sempit di bawah ini.
 *
 * Aturan yang dijaga tipe-tipe ini: tidak ada `editorialNotes`, tidak ada
 * `rightsDocument`, tidak ada `master`, tidak ada `reviewedBy`.
 */

export interface ChronologyDto {
  readonly startYear: number;
  readonly precision: ChronologyPrecision;
  readonly display: string;
}

export interface MediaDto {
  readonly id: string;
  readonly url: string;
  readonly altText: string;
  readonly caption?: string;
  readonly creditLine?: string;
  readonly institution?: string;
  readonly visualEvidenceClass?: VisualEvidenceClass;
  readonly rightsClass?: RightsClass;
  readonly uncertaintyNote?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface SourceDto {
  readonly id: string;
  readonly title: string;
  readonly sourceType: string;
  readonly institution?: string;
  readonly inventoryNumber?: string;
  readonly citation?: string;
  readonly url?: string;
  readonly publicationYear?: number;
}

export interface EvidenceLinkDto {
  readonly id: string;
  readonly role: "supports" | "contradicts" | "contextualizes" | "mentions";
  readonly strength: "direct" | "strong" | "moderate" | "weak";
  readonly locator?: string;
  readonly note?: string;
  readonly source?: SourceDto;
}

export interface ClaimDto {
  readonly id: string;
  readonly slug: string;
  readonly statement: string;
  readonly evidenceClass: EvidenceClass;
  readonly evidenceLabel: string;
  readonly confidence: string;
  readonly links: readonly EvidenceLinkDto[];
  readonly competingClaimSlugs: readonly string[];
}

export interface PersonDto {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly summary?: string;
  readonly representationPolicy: string;
}

export interface PlaceDto {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly placeType: string;
  readonly summary?: string;
  readonly historicalCertainty?: string;
  readonly historicalDescription?: string;
  readonly modernLocation?: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

export interface ArtifactDto {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly artifactType: string;
  readonly holdingInstitution?: string;
  readonly inventoryNumber?: string;
  readonly chronology?: ChronologyDto;
  readonly summary?: string;
  readonly transcription?: string;
  readonly translation?: string;
  readonly provenance?: string;
  readonly media: readonly MediaDto[];
}

export interface EventDto {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly chronology: ChronologyDto;
  readonly summary: string;
  readonly people: readonly PersonDto[];
  readonly places: readonly PlaceDto[];
  readonly artifacts: readonly ArtifactDto[];
  readonly claims: readonly ClaimDto[];
  readonly themeSlugs: readonly string[];
}

export interface ThemeDto {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly order: number;
}

export interface SceneDto {
  readonly id: string;
  readonly slug: string;
  readonly order: number;
  readonly title: string;
  readonly subtitle?: string;
  readonly dateDisplay: string;
  readonly sceneType: string;
  readonly narrativeShort?: string;
  readonly choreographyKey?: string;
  readonly evidenceBadgeMode: string;
  readonly primaryEvent?: EventDto;
  readonly featuredClaims: readonly ClaimDto[];
  readonly heroMedia?: MediaDto;
  readonly themeSlugs: readonly string[];
}

export interface ActDto {
  readonly id: string;
  readonly slug: string;
  readonly order: number;
  readonly title: string;
  readonly subtitle?: string;
  readonly dateRangeDisplay: string;
  readonly introCopy?: string;
  readonly visualEraKey: string;
  readonly scenes: readonly SceneDto[];
}

export interface JourneyManifestDto {
  readonly acts: readonly ActDto[];
  readonly sceneCount: number;
}
