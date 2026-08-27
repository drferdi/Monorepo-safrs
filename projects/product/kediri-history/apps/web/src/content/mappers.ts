import {
  EVIDENCE_CLASS_LABELS,
  type EvidenceClass,
} from "../modules/historical-domain/index";
import type {
  Artifact,
  EvidenceClaim,
  EvidenceLink,
  Event as HistoricalEvent,
  JourneyAct,
  MediaAsset,
  Person,
  Place,
  Scene,
  Source,
  Theme,
} from "../payload/payload-types";
import type {
  ActDto,
  ArtifactDto,
  ChronologyDto,
  ClaimDto,
  EventDto,
  EvidenceLinkDto,
  MediaDto,
  PersonDto,
  PlaceDto,
  SceneDto,
  SourceDto,
  ThemeDto,
} from "./dto";

/**
 * Pemetaan dokumen CMS menjadi DTO publik.
 *
 * Setiap fungsi di sini adalah penyempitan yang disengaja. Bila sebuah field
 * tidak disebut di bawah, ia tidak pernah sampai ke browser — itulah cara
 * catatan editorial, dokumen hak, master privat, dan relasi draft tetap di
 * dalam CMS (Technical Bible bagian 36).
 */

type Ref<T> = number | T | null | undefined;

function resolve<T extends { id: number }>(value: Ref<T>): T | undefined {
  return typeof value === "object" && value !== null ? value : undefined;
}

function resolveMany<T extends { id: number }>(
  value: (number | T)[] | null | undefined,
): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is T => typeof item === "object");
}

function isPublished(doc: { _status?: string | null } | undefined): boolean {
  return doc?._status === "published";
}

export function toChronologyDto(
  chronology: HistoricalEvent["chronology"] | Artifact["chronology"],
): ChronologyDto | undefined {
  if (
    !chronology ||
    typeof chronology.startYear !== "number" ||
    typeof chronology.display !== "string" ||
    typeof chronology.precision !== "string"
  ) {
    // Kronologi tanpa presisi atau tanpa bentuk tampil bukan kronologi:
    // menebak salah satunya berarti mengarang ketepatan.
    return undefined;
  }
  return {
    startYear: chronology.startYear,
    precision: chronology.precision as ChronologyDto["precision"],
    display: chronology.display,
  };
}

export function toMediaDto(
  asset: MediaAsset | undefined,
): MediaDto | undefined {
  // Aset yang belum terbit tidak pernah menyeberang, apa pun yang merujuknya.
  if (!asset || !isPublished(asset) || !asset.url || !asset.altText) {
    return undefined;
  }
  return {
    id: String(asset.id),
    url: asset.url,
    altText: asset.altText,
    caption: asset.caption ?? undefined,
    creditLine: asset.creditLine ?? undefined,
    institution: asset.institution ?? undefined,
    visualEvidenceClass:
      (asset.visualEvidenceClass as MediaDto["visualEvidenceClass"]) ??
      undefined,
    rightsClass: (asset.rightsClass as MediaDto["rightsClass"]) ?? undefined,
    uncertaintyNote: asset.uncertaintyNote ?? undefined,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
  };
}

export function toSourceDto(source: Source | undefined): SourceDto | undefined {
  if (!source || !isPublished(source)) return undefined;
  return {
    id: String(source.id),
    title: source.title,
    sourceType: source.sourceType,
    institution: source.institution ?? undefined,
    inventoryNumber: source.inventoryNumber ?? undefined,
    citation: source.citation ?? undefined,
    url: source.url ?? undefined,
    publicationYear: source.publicationYear ?? undefined,
  };
}

export function toEvidenceLinkDto(
  link: EvidenceLink,
): EvidenceLinkDto | undefined {
  if (!isPublished(link)) return undefined;
  const source = toSourceDto(resolve(link.source as Ref<Source>));
  return {
    id: String(link.id),
    role: link.role as EvidenceLinkDto["role"],
    strength: link.strength as EvidenceLinkDto["strength"],
    locator: link.locator ?? undefined,
    note: link.note ?? undefined,
    source,
  };
}

export function toClaimDto(
  claim: EvidenceClaim | undefined,
  linksByClaim?: ReadonlyMap<number, readonly EvidenceLink[]>,
): ClaimDto | undefined {
  // Hanya klaim terbit yang menyuplai permukaan publik. Sebuah Scene yang
  // menautkan klaim draft kehilangan klaim itu di sini, dan gerbang
  // validateSceneContract melaporkannya sebagai kegagalan kritis.
  if (!claim || !isPublished(claim)) return undefined;

  // Tautan bukti diambil eksplisit oleh lapisan query, bukan diandalkan dari
  // populasi join yang dalam: kedalaman relasi yang cukup untuk satu halaman
  // belum tentu cukup untuk halaman berikutnya, dan bukti yang diam-diam
  // hilang adalah kegagalan paling berbahaya di proyek ini.
  const joined = (
    claim.sourceLinks as { docs?: (number | EvidenceLink)[] } | undefined
  )?.docs;
  const source =
    linksByClaim?.get(claim.id) ?? resolveMany<EvidenceLink>(joined);
  const links = [...source]
    .map(toEvidenceLinkDto)
    .filter((link): link is EvidenceLinkDto => link !== undefined);

  const evidenceClass = claim.evidenceClass as EvidenceClass;

  return {
    id: String(claim.id),
    slug: claim.slug,
    statement: claim.publicSummary ?? claim.canonicalStatement,
    evidenceClass,
    evidenceLabel: EVIDENCE_CLASS_LABELS[evidenceClass],
    confidence: claim.confidence,
    links,
    competingClaimSlugs: resolveMany<EvidenceClaim>(
      claim.competingClaims as (number | EvidenceClaim)[] | null | undefined,
    )
      .filter(isPublished)
      .map((competing) => competing.slug),
  };
}

export function toPersonDto(person: Person | undefined): PersonDto | undefined {
  if (!person || !isPublished(person)) return undefined;
  return {
    id: String(person.id),
    slug: person.slug,
    name: person.displayName ?? person.canonicalName,
    aliases: person.aliases ?? [],
    summary: person.summary ?? undefined,
    representationPolicy: person.representationPolicy,
  };
}

export function toPlaceDto(place: Place | undefined): PlaceDto | undefined {
  if (!place || !isPublished(place)) return undefined;
  const modern = place.modernLocation;
  return {
    id: String(place.id),
    slug: place.slug,
    name: place.canonicalName,
    aliases: place.aliases ?? [],
    placeType: place.placeType,
    summary: place.summary ?? undefined,
    historicalCertainty: place.historicalLocation?.certainty ?? undefined,
    historicalDescription: place.historicalLocation?.description ?? undefined,
    modernLocation:
      typeof modern?.latitude === "number" &&
      typeof modern?.longitude === "number"
        ? { latitude: modern.latitude, longitude: modern.longitude }
        : undefined,
  };
}

export function toArtifactDto(
  artifact: Artifact | undefined,
): ArtifactDto | undefined {
  if (!artifact || !isPublished(artifact)) return undefined;
  return {
    id: String(artifact.id),
    slug: artifact.slug,
    name: artifact.canonicalName,
    artifactType: artifact.artifactType,
    holdingInstitution: artifact.holdingInstitution ?? undefined,
    inventoryNumber: artifact.inventoryNumber ?? undefined,
    chronology: toChronologyDto(artifact.chronology),
    summary: artifact.summary ?? undefined,
    transcription: artifact.transcription ?? undefined,
    translation: artifact.translation ?? undefined,
    provenance: artifact.provenance ?? undefined,
    media: resolveMany<MediaAsset>(
      artifact.media as (number | MediaAsset)[] | null | undefined,
    )
      .map(toMediaDto)
      .filter((media): media is MediaDto => media !== undefined),
  };
}

export function toThemeDto(theme: Theme | undefined): ThemeDto | undefined {
  if (!theme || !isPublished(theme)) return undefined;
  return {
    id: String(theme.id),
    slug: theme.slug,
    title: theme.title,
    summary: theme.summary,
    order: theme.order,
  };
}

export function toEventDto(
  event: HistoricalEvent | undefined,
  linksByClaim?: ReadonlyMap<number, readonly EvidenceLink[]>,
): EventDto | undefined {
  if (!event || !isPublished(event)) return undefined;
  const chronology = toChronologyDto(event.chronology);
  if (!chronology) return undefined;

  return {
    id: String(event.id),
    slug: event.slug,
    name: event.canonicalName,
    aliases: event.aliases ?? [],
    chronology,
    summary: event.summary,
    people: resolveMany<Person>(event.people as (number | Person)[] | null)
      .map(toPersonDto)
      .filter((person): person is PersonDto => person !== undefined),
    places: resolveMany<Place>(event.places as (number | Place)[] | null)
      .map(toPlaceDto)
      .filter((place): place is PlaceDto => place !== undefined),
    artifacts: resolveMany<Artifact>(
      event.artifacts as (number | Artifact)[] | null,
    )
      .map(toArtifactDto)
      .filter((artifact): artifact is ArtifactDto => artifact !== undefined),
    claims: resolveMany<EvidenceClaim>(
      event.claims as (number | EvidenceClaim)[] | null,
    )
      .map((claim) => toClaimDto(claim, linksByClaim))
      .filter((claim): claim is ClaimDto => claim !== undefined),
    themeSlugs: resolveMany<Theme>(event.themes as (number | Theme)[] | null)
      .filter(isPublished)
      .map((theme) => theme.slug),
  };
}

export function toSceneDto(
  scene: Scene | undefined,
  linksByClaim?: ReadonlyMap<number, readonly EvidenceLink[]>,
): SceneDto | undefined {
  if (!scene || !isPublished(scene)) return undefined;
  return {
    id: String(scene.id),
    slug: scene.slug,
    order: scene.order,
    title: scene.title,
    subtitle: scene.subtitle ?? undefined,
    dateDisplay: scene.dateDisplay,
    sceneType: scene.sceneType,
    narrativeShort: scene.narrativeShort ?? undefined,
    masterLine: scene.masterLine ?? undefined,
    choreographyKey: scene.choreographyKey ?? undefined,
    visualVariant: scene.visualVariant ?? undefined,
    evidenceBadgeMode: scene.evidenceBadgeMode,
    primaryEvent: toEventDto(
      resolve(scene.primaryEvent as Ref<HistoricalEvent>),
      linksByClaim,
    ),
    featuredClaims: resolveMany<EvidenceClaim>(
      scene.featuredClaims as (number | EvidenceClaim)[] | null,
    )
      .map((claim) => toClaimDto(claim, linksByClaim))
      .filter((claim): claim is ClaimDto => claim !== undefined),
    heroMedia: toMediaDto(resolve(scene.heroMedia as Ref<MediaAsset>)),
    themeSlugs: resolveMany<Theme>(scene.themes as (number | Theme)[] | null)
      .filter(isPublished)
      .map((theme) => theme.slug),
  };
}

export function toActDto(
  act: JourneyAct,
  scenes: readonly SceneDto[],
): ActDto | undefined {
  if (!isPublished(act)) return undefined;
  return {
    id: String(act.id),
    slug: act.slug,
    order: act.order,
    title: act.title,
    subtitle: act.subtitle ?? undefined,
    dateRangeDisplay: act.dateRangeDisplay,
    introCopy: act.introCopy ?? undefined,
    visualEraKey: act.visualEraKey,
    scenes,
  };
}
