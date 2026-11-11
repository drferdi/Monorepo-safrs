import config from "@payload-config";
import { getPayload } from "payload";

import {
  type EvidenceClaimView,
  summariseIntegrity,
  validateHistoricalIntegrity,
} from "../modules/content-validation/index";
import type { EvidenceClass } from "../modules/historical-domain/index";
import { CHOREOGRAPHY_KEYS } from "../modules/motion/index";

/**
 * Verifikasi integritas historis produksi (Master Implementation Plan Phase 20).
 *
 * Kegagalan integritas historis MEMBLOKIR rilis; ia bukan peringatan. Skrip ini
 * membaca keadaan publik yang sebenarnya dari basis data, bukan fixture, lalu
 * menjalankan gerbang yang sama yang diuji unit test.
 *
 * Jalankan dari akar capsule:
 *   pnpm run verify:production
 */
async function main() {
  const payload = await getPayload({ config });
  const published = { _status: { equals: "published" } } as const;

  const [claims, links, media, scenes, acts, sources] = await Promise.all([
    payload.find({ collection: "evidence-claims", limit: 5000, depth: 1 }),
    payload.find({ collection: "evidence-links", limit: 5000, depth: 1 }),
    payload.find({ collection: "media-assets", limit: 5000, depth: 0 }),
    payload.find({ collection: "scenes", limit: 1000, depth: 2 }),
    payload.find({
      collection: "journey-acts",
      where: published,
      limit: 200,
      depth: 0,
    }),
    payload.find({ collection: "sources", limit: 5000, depth: 0 }),
  ]);

  const sourceById = new Map(sources.docs.map((doc) => [doc.id, doc]));
  const linksByClaim = new Map<number, typeof links.docs>();
  for (const link of links.docs) {
    const ref = link.claim;
    const id = typeof ref === "object" && ref !== null ? ref.id : ref;
    if (typeof id !== "number") continue;
    const bucket = linksByClaim.get(id) ?? [];
    bucket.push(link);
    linksByClaim.set(id, bucket);
  }

  const claimViews: EvidenceClaimView[] = claims.docs.map((claim) => {
    const own = linksByClaim.get(claim.id) ?? [];
    return {
      id: claim.slug,
      canonicalStatement: claim.canonicalStatement,
      publicSummary: claim.publicSummary ?? undefined,
      evidenceClass: claim.evidenceClass as EvidenceClass,
      status: claim._status === "published" ? "published" : "needs_review",
      reviewedBy: claim.reviewedBy ? String(claim.reviewedBy) : undefined,
      reviewedAt: claim.reviewedAt ?? undefined,
      supersededBy: claim.supersededBy ? String(claim.supersededBy) : undefined,
      links: own
        .filter((link) => link._status === "published")
        .map((link) => {
          const ref = link.source;
          const sourceId =
            typeof ref === "object" && ref !== null ? ref.id : ref;
          const source =
            typeof sourceId === "number" ? sourceById.get(sourceId) : undefined;
          return {
            role: link.role as "supports",
            strength: link.strength as "direct",
            sourceType: source?.sourceType,
            locator: link.locator ?? undefined,
          };
        }),
    };
  });

  const linkViews = links.docs.map((link) => {
    const claimRef = link.claim;
    const sourceRef = link.source;
    const sourceId =
      typeof sourceRef === "object" && sourceRef !== null
        ? sourceRef.id
        : sourceRef;
    const source =
      typeof sourceId === "number" ? sourceById.get(sourceId) : undefined;
    return {
      id: String(link.id),
      claimId: String(
        typeof claimRef === "object" && claimRef !== null
          ? claimRef.id
          : claimRef,
      ),
      sourceId: String(sourceId ?? ""),
      role: link.role,
      strength: link.strength,
      locator: link.locator ?? undefined,
      sourceLinkStatus: source?.linkStatus ?? undefined,
    };
  });

  const mediaViews = media.docs.map((asset) => ({
    id: asset.title,
    isPublic: asset._status === "published",
    visualEvidenceClass: asset.visualEvidenceClass ?? undefined,
    rightsClass: asset.rightsClass ?? undefined,
    altText: asset.altText ?? undefined,
    creditLine: asset.creditLine ?? undefined,
    rightsExpiresAt: asset.rightsExpiresAt ?? undefined,
    assetStatus: asset.assetStatus ?? undefined,
  }));

  const claimStatusBySlug = new Map(
    claims.docs.map((claim) => [
      claim.id,
      claim._status === "published" ? "published" : "needs_review",
    ]),
  );

  const sceneViews = scenes.docs.map((scene) => {
    const featured = Array.isArray(scene.featuredClaims)
      ? scene.featuredClaims
      : [];
    const hero = scene.heroMedia;
    return {
      id: scene.slug,
      slug: scene.slug,
      isPublic: scene._status === "published",
      primaryEventId: scene.primaryEvent
        ? String(
            typeof scene.primaryEvent === "object"
              ? scene.primaryEvent.id
              : scene.primaryEvent,
          )
        : undefined,
      actId: scene.act
        ? String(typeof scene.act === "object" ? scene.act.id : scene.act)
        : undefined,
      narrativeShort: scene.narrativeShort ?? undefined,
      choreographyKey: scene.choreographyKey ?? undefined,
      heroMedia:
        typeof hero === "object" && hero !== null
          ? { id: String(hero.id), isPublic: hero._status === "published" }
          : undefined,
      featuredClaims: featured.map((entry) => {
        const id =
          typeof entry === "object" && entry !== null ? entry.id : entry;
        return {
          id: String(id),
          status: (claimStatusBySlug.get(id as number) ??
            "needs_review") as "published",
        };
      }),
    };
  });

  const report = validateHistoricalIntegrity({
    claims: claimViews,
    links: linkViews,
    media: mediaViews,
    scenes: sceneViews,
    knownChoreographyKeys: [...CHOREOGRAPHY_KEYS],
  });

  const publishedScenes = sceneViews.filter((scene) => scene.isPublic);
  const publishedClaims = claimViews.filter(
    (claim) => claim.status === "published",
  );

  const lines = [
    "KEDIRI — HISTORICAL PRODUCTION VERIFICATION",
    "",
    `Journey acts............... ${acts.totalDocs}`,
    `Journey scenes (published). ${publishedScenes.length}`,
    `Published claims........... ${publishedClaims.length}`,
    `Evidence links............. ${links.totalDocs}`,
    `Sources.................... ${sources.totalDocs}`,
    `Public media assets........ ${mediaViews.filter((m) => m.isPublic).length}`,
    "",
    summariseIntegrity(report),
  ];
  console.log(lines.join("\n"));

  if (!report.ok) {
    console.error(
      "\nRelease blocked: historical integrity failures are not warnings.\n",
    );
    for (const finding of report.findings.filter(
      (item) => item.severity === "critical",
    )) {
      console.error(
        `  [${finding.rule}] ${finding.subject}: ${finding.message}`,
      );
    }
    process.exit(1);
  }

  const warnings = report.findings.filter(
    (item) => item.severity === "warning",
  );
  if (warnings.length > 0) {
    console.log("\nWarnings (non-blocking):");
    for (const finding of warnings) {
      console.log(`  [${finding.rule}] ${finding.subject}: ${finding.message}`);
    }
  }

  console.log("\nHistorical production verification passed.");
  process.exit(0);
}

await main();
