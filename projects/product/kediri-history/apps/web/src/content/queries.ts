import configPromise from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import type { EvidenceLink } from "../payload/payload-types";
import { CACHE_TAGS } from "./cache";
import type {
  ActDto,
  ArtifactDto,
  ClaimDto,
  EventDto,
  JourneyManifestDto,
  PersonDto,
  PlaceDto,
  SceneDto,
  SourceDto,
  ThemeDto,
} from "./dto";
import {
  toActDto,
  toArtifactDto,
  toClaimDto,
  toEventDto,
  toPersonDto,
  toPlaceDto,
  toSceneDto,
  toSourceDto,
  toThemeDto,
} from "./mappers";

/**
 * Akses data sisi server.
 *
 * Komponen tidak pernah melakukan query CMS sendiri (Technical Bible bagian
 * 36). Semua jalur baca publik lewat berkas ini, sehingga penyempitan DTO dan
 * penyaringan status terbit tidak dapat dilewati secara tidak sengaja.
 *
 * Konten sejarah publik sangat mudah di-cache; invalidasi memakai tag granular
 * sehingga menerbitkan satu Scene tidak membangun ulang seluruh situs.
 */

async function client() {
  return getPayload({ config: await configPromise });
}

/**
 * Mengambil setiap EvidenceLink terbit untuk sekumpulan klaim dalam satu query,
 * lengkap dengan sumbernya.
 *
 * Ini disengaja terpisah dari populasi relasi: kedalaman yang cukup untuk satu
 * halaman belum tentu cukup untuk halaman berikutnya, dan bukti yang diam-diam
 * hilang adalah kegagalan paling berbahaya di proyek ini. Lebih baik satu query
 * eksplisit daripada bukti yang menghilang tanpa suara.
 */
async function fetchLinksByClaim(
  payload: Awaited<ReturnType<typeof client>>,
  claimIds: readonly number[],
): Promise<ReadonlyMap<number, EvidenceLink[]>> {
  const grouped = new Map<number, EvidenceLink[]>();
  if (claimIds.length === 0) return grouped;

  const links = await payload.find({
    collection: "evidence-links",
    where: {
      and: [
        { claim: { in: [...claimIds] } },
        { _status: { equals: "published" } },
      ],
    },
    limit: 1000,
    depth: 1,
  });

  for (const link of links.docs) {
    const ref = link.claim;
    const id = typeof ref === "object" && ref !== null ? ref.id : ref;
    if (typeof id !== "number") continue;
    const bucket = grouped.get(id) ?? [];
    bucket.push(link);
    grouped.set(id, bucket);
  }
  return grouped;
}

/** Mengumpulkan id klaim dari dokumen apa pun yang membawa relasi klaim. */
function collectClaimIds(
  sources: readonly (readonly (number | { id: number })[] | null | undefined)[],
): number[] {
  const ids = new Set<number>();
  for (const list of sources) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const id = typeof entry === "object" && entry !== null ? entry.id : entry;
      if (typeof id === "number") ids.add(id);
    }
  }
  return [...ids];
}

/** Kedalaman relasi yang dibutuhkan agar DTO dapat dipetakan penuh. */
const DEEP = 3;

export const getJourneyManifest = unstable_cache(
  async (): Promise<JourneyManifestDto> => {
    const payload = await client();

    const [acts, scenes] = await Promise.all([
      payload.find({
        collection: "journey-acts",
        where: { _status: { equals: "published" } },
        sort: "order",
        limit: 50,
        depth: 1,
      }),
      payload.find({
        collection: "scenes",
        where: { _status: { equals: "published" } },
        sort: "order",
        limit: 200,
        depth: DEEP,
      }),
    ]);

    const claimIds = collectClaimIds(
      scenes.docs.flatMap((scene) => [
        scene.featuredClaims as (number | { id: number })[] | null,
        (typeof scene.primaryEvent === "object" && scene.primaryEvent !== null
          ? scene.primaryEvent.claims
          : null) as (number | { id: number })[] | null,
      ]),
    );
    const linksByClaim = await fetchLinksByClaim(payload, claimIds);

    const sceneDtos = scenes.docs
      .map((scene) => toSceneDto(scene, linksByClaim))
      .filter((scene): scene is SceneDto => scene !== undefined);

    const actDtos = acts.docs
      .map((act) => {
        const actScenes = scenes.docs
          .filter((scene) => {
            const ref = scene.act;
            const actId =
              typeof ref === "object" && ref !== null ? ref.id : ref;
            return actId === act.id;
          })
          .map((scene) => toSceneDto(scene, linksByClaim))
          .filter((scene): scene is SceneDto => scene !== undefined);
        return toActDto(act, actScenes);
      })
      .filter((act): act is ActDto => act !== undefined);

    return { acts: actDtos, sceneCount: sceneDtos.length };
  },
  ["journey-manifest"],
  { tags: [CACHE_TAGS.journey] },
);

export async function getSceneBySlug(
  slug: string,
): Promise<SceneDto | undefined> {
  const payload = await client();
  const result = await payload.find({
    collection: "scenes",
    where: { slug: { equals: slug }, _status: { equals: "published" } },
    limit: 1,
    depth: DEEP,
  });
  const scene = result.docs[0];
  if (!scene) return undefined;
  const linksByClaim = await fetchLinksByClaim(
    payload,
    collectClaimIds([
      scene.featuredClaims as (number | { id: number })[] | null,
      (typeof scene.primaryEvent === "object" && scene.primaryEvent !== null
        ? scene.primaryEvent.claims
        : null) as (number | { id: number })[] | null,
    ]),
  );
  return toSceneDto(scene, linksByClaim);
}

export async function getEventBySlug(
  slug: string,
): Promise<EventDto | undefined> {
  const payload = await client();
  const result = await payload.find({
    collection: "events",
    where: { slug: { equals: slug }, _status: { equals: "published" } },
    limit: 1,
    depth: DEEP,
  });
  const event = result.docs[0];
  if (!event) return undefined;
  const linksByClaim = await fetchLinksByClaim(
    payload,
    collectClaimIds([event.claims as (number | { id: number })[] | null]),
  );
  return toEventDto(event, linksByClaim);
}

export async function getPersonBySlug(
  slug: string,
): Promise<PersonDto | undefined> {
  const payload = await client();
  const result = await payload.find({
    collection: "people",
    where: { slug: { equals: slug }, _status: { equals: "published" } },
    limit: 1,
    depth: 1,
  });
  return toPersonDto(result.docs[0]);
}

export async function getPlaceBySlug(
  slug: string,
): Promise<PlaceDto | undefined> {
  const payload = await client();
  const result = await payload.find({
    collection: "places",
    where: { slug: { equals: slug }, _status: { equals: "published" } },
    limit: 1,
    depth: 1,
  });
  return toPlaceDto(result.docs[0]);
}

export async function getArtifactBySlug(
  slug: string,
): Promise<ArtifactDto | undefined> {
  const payload = await client();
  const result = await payload.find({
    collection: "artifacts",
    where: { slug: { equals: slug }, _status: { equals: "published" } },
    limit: 1,
    depth: 2,
  });
  return toArtifactDto(result.docs[0]);
}

export async function getSourceById(
  id: string,
): Promise<SourceDto | undefined> {
  const payload = await client();
  const result = await payload.find({
    collection: "sources",
    where: { id: { equals: id }, _status: { equals: "published" } },
    limit: 1,
    depth: 0,
  });
  return toSourceDto(result.docs[0]);
}

export async function listSources(): Promise<readonly SourceDto[]> {
  const payload = await client();
  const result = await payload.find({
    collection: "sources",
    where: { _status: { equals: "published" } },
    sort: "title",
    limit: 500,
    depth: 0,
  });
  return result.docs
    .map(toSourceDto)
    .filter((source): source is SourceDto => source !== undefined);
}

export async function listThemes(): Promise<readonly ThemeDto[]> {
  const payload = await client();
  const result = await payload.find({
    collection: "themes",
    where: { _status: { equals: "published" } },
    sort: "order",
    limit: 50,
    depth: 0,
  });
  return result.docs
    .map(toThemeDto)
    .filter((theme): theme is ThemeDto => theme !== undefined);
}

/** Kronologi lengkap untuk /explore/timeline. */
export async function listEventsChronologically(): Promise<
  readonly EventDto[]
> {
  const payload = await client();
  const result = await payload.find({
    collection: "events",
    where: { _status: { equals: "published" } },
    sort: "chronology.startYear",
    limit: 500,
    depth: 2,
  });
  const linksByClaim = await fetchLinksByClaim(
    payload,
    collectClaimIds(
      result.docs.map(
        (doc) => doc.claims as (number | { id: number })[] | null,
      ),
    ),
  );
  return result.docs
    .map((doc) => toEventDto(doc, linksByClaim))
    .filter((event): event is EventDto => event !== undefined);
}

export async function listPlaces(): Promise<readonly PlaceDto[]> {
  const payload = await client();
  const result = await payload.find({
    collection: "places",
    where: { _status: { equals: "published" } },
    sort: "canonicalName",
    limit: 500,
    depth: 0,
  });
  return result.docs
    .map(toPlaceDto)
    .filter((place): place is PlaceDto => place !== undefined);
}

export async function listPeople(): Promise<readonly PersonDto[]> {
  const payload = await client();
  const result = await payload.find({
    collection: "people",
    where: { _status: { equals: "published" } },
    sort: "canonicalName",
    limit: 500,
    depth: 0,
  });
  return result.docs
    .map(toPersonDto)
    .filter((person): person is PersonDto => person !== undefined);
}

export async function listArtifacts(): Promise<readonly ArtifactDto[]> {
  const payload = await client();
  const result = await payload.find({
    collection: "artifacts",
    where: { _status: { equals: "published" } },
    sort: "canonicalName",
    limit: 500,
    depth: 1,
  });
  return result.docs
    .map(toArtifactDto)
    .filter((artifact): artifact is ArtifactDto => artifact !== undefined);
}

export async function getClaimBySlug(
  slug: string,
): Promise<ClaimDto | undefined> {
  const payload = await client();
  const result = await payload.find({
    collection: "evidence-claims",
    where: { slug: { equals: slug }, _status: { equals: "published" } },
    limit: 1,
    depth: 2,
  });
  return toClaimDto(result.docs[0]);
}

/**
 * Pencarian arsip.
 *
 * Alias adalah data kelas satu, bukan pemanis: Jayabaya dan Jayabhaya harus
 * sama-sama menemukan orang yang sama tanpa pengunjung menguasai transliterasi
 * (UX Bible bagian 15). PostgreSQL cukup untuk ini — tidak ada Elasticsearch,
 * tidak ada vector DB (Technical Bible bagian 35).
 */
export interface SearchHit {
  readonly kind: "event" | "person" | "place" | "artifact" | "source";
  readonly slug: string;
  readonly title: string;
  readonly context: string;
  readonly href: string;
}

export async function searchArchive(
  term: string,
): Promise<readonly SearchHit[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];
  const payload = await client();
  const published = { _status: { equals: "published" } };

  const [events, people, places, artifacts, sources] = await Promise.all([
    payload.find({
      collection: "events",
      where: {
        and: [
          published,
          {
            or: [
              { canonicalName: { like: trimmed } },
              { aliases: { like: trimmed } },
              { summary: { like: trimmed } },
            ],
          },
        ],
      },
      limit: 20,
      depth: 0,
    }),
    payload.find({
      collection: "people",
      where: {
        and: [
          published,
          {
            or: [
              { canonicalName: { like: trimmed } },
              { aliases: { like: trimmed } },
            ],
          },
        ],
      },
      limit: 20,
      depth: 0,
    }),
    payload.find({
      collection: "places",
      where: {
        and: [
          published,
          {
            or: [
              { canonicalName: { like: trimmed } },
              { aliases: { like: trimmed } },
            ],
          },
        ],
      },
      limit: 20,
      depth: 0,
    }),
    payload.find({
      collection: "artifacts",
      where: {
        and: [
          published,
          {
            or: [
              { canonicalName: { like: trimmed } },
              { aliases: { like: trimmed } },
              { inventoryNumber: { like: trimmed } },
            ],
          },
        ],
      },
      limit: 20,
      depth: 0,
    }),
    payload.find({
      collection: "sources",
      where: {
        and: [published, { title: { like: trimmed } }],
      },
      limit: 20,
      depth: 0,
    }),
  ]);

  const hits: SearchHit[] = [];
  for (const doc of events.docs) {
    hits.push({
      kind: "event",
      slug: doc.slug,
      title: doc.canonicalName,
      context: doc.chronology.display,
      href: `/archive/events/${doc.slug}`,
    });
  }
  for (const doc of people.docs) {
    hits.push({
      kind: "person",
      slug: doc.slug,
      title: doc.canonicalName,
      context: (doc.aliases ?? []).join(" · "),
      href: `/archive/people/${doc.slug}`,
    });
  }
  for (const doc of places.docs) {
    hits.push({
      kind: "place",
      slug: doc.slug,
      title: doc.canonicalName,
      context: doc.placeType,
      href: `/archive/places/${doc.slug}`,
    });
  }
  for (const doc of artifacts.docs) {
    hits.push({
      kind: "artifact",
      slug: doc.slug,
      title: doc.canonicalName,
      context: [doc.holdingInstitution, doc.inventoryNumber]
        .filter(Boolean)
        .join(" · "),
      href: `/archive/objects/${doc.slug}`,
    });
  }
  for (const doc of sources.docs) {
    hits.push({
      kind: "source",
      slug: String(doc.id),
      title: doc.title,
      context: doc.sourceType,
      href: `/sources#source-${doc.id}`,
    });
  }
  return hits;
}
