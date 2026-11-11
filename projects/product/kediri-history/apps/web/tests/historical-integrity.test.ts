import { describe, expect, it } from "vitest";

import {
  type EvidenceClaimView,
  summariseIntegrity,
  validateEvidenceClaim,
  validateEvidenceLink,
  validateHistoricalIntegrity,
  validateMediaRights,
  validateSceneAnchors,
  validateSceneContract,
} from "../src/modules/content-validation/index";
import {
  CHRONOLOGY_PRECISIONS,
  chronologySchema,
  EVIDENCE_CLASS_LABELS,
  EVIDENCE_CLASSES,
  isValidSlug,
  toSlug,
} from "../src/modules/historical-domain/index";
import {
  CHOREOGRAPHY_KEYS,
  isKnownChoreographyKey,
} from "../src/modules/motion/index";

/**
 * Gerbang integritas historis. Fixture buruk harus gagal, fixture sah harus
 * lulus — dan gerbangnya berjalan di `pnpm run test` sejak sekarang, bukan
 * ditambahkan setelah ratusan record terbit.
 *
 * Contoh-contoh di bawah memakai kasus nyata yang sudah teridentifikasi dalam
 * kanon perencanaan, supaya uji ini menguji sejarah proyek ini, bukan sejarah
 * imajiner.
 */

const REVIEWED = {
  reviewedBy: "user-historical-reviewer",
  reviewedAt: "2026-08-20T00:00:00.000Z",
};

const hantangClaim: EvidenceClaimView = {
  id: "hantang-contains-panjalu-jayati",
  canonicalStatement:
    "The Hantang inscription contains the phrase Panjalu Jayati.",
  publicSummary: "The inscription carries the phrase Panjalu Jayati.",
  evidenceClass: "primary_record",
  status: "published",
  links: [
    {
      role: "supports",
      strength: "direct",
      sourceType: "inscription",
      locator: "line 4",
    },
  ],
  ...REVIEWED,
};

describe("evidence claim gate", () => {
  it("passes a sourced, reviewed primary-record claim", () => {
    expect(validateEvidenceClaim(hantangClaim)).toHaveLength(0);
  });

  it("refuses folklore presented as historical fact", () => {
    const findings = validateEvidenceClaim({
      ...hantangClaim,
      id: "lembu-suro-curse",
      evidenceClass: "folklore",
      publicBadgeLabel: EVIDENCE_CLASS_LABELS.historical_fact,
    });
    expect(findings.map((f) => f.rule)).toContain("folklore-not-fact");
  });

  it("accepts a tradition claim that is labelled as tradition", () => {
    // Kelas evidence dan keyakinan adalah dua sumbu: tradisi yang kuat tetap
    // sah selama ia tidak menyamar sebagai fakta.
    const findings = validateEvidenceClaim({
      ...hantangClaim,
      id: "mpu-bharada-sacred-water",
      evidenceClass: "tradition",
      publicBadgeLabel: EVIDENCE_CLASS_LABELS.tradition,
      links: [
        {
          role: "supports",
          strength: "strong",
          sourceType: "manuscript",
          locator: "canto 2",
        },
      ],
    });
    expect(findings).toHaveLength(0);
  });

  it("refuses a published claim with no supporting link", () => {
    const findings = validateEvidenceClaim({
      ...hantangClaim,
      id: "gudang-garam-pdrb-70-5",
      evidenceClass: "modern_verified_data",
      links: [],
    });
    expect(findings.map((f) => f.rule)).toContain(
      "published-claim-requires-source",
    );
  });

  it("refuses a primary-record claim resting only on secondary discussion", () => {
    const findings = validateEvidenceClaim({
      ...hantangClaim,
      links: [
        {
          role: "supports",
          strength: "moderate",
          sourceType: "academic_article",
          locator: "p. 44",
        },
      ],
    });
    expect(findings.map((f) => f.rule)).toContain(
      "primary-record-requires-primary-evidence",
    );
  });

  it("refuses a published claim with no named reviewer", () => {
    const findings = validateEvidenceClaim({
      ...hantangClaim,
      reviewedBy: undefined,
      reviewedAt: undefined,
    });
    expect(findings.map((f) => f.rule)).toContain(
      "published-claim-requires-reviewer",
    );
  });

  it("refuses a superseded claim that is still canonical", () => {
    const findings = validateEvidenceClaim({
      ...hantangClaim,
      supersededBy: "hantang-claim-v2",
    });
    expect(findings.map((f) => f.rule)).toContain(
      "superseded-claim-not-canonical",
    );
  });

  it("leaves a draft claim alone apart from labelling", () => {
    const findings = validateEvidenceClaim({
      ...hantangClaim,
      status: "needs_review",
      links: [],
      reviewedBy: undefined,
      reviewedAt: undefined,
    });
    expect(findings).toHaveLength(0);
  });
});

describe("evidence link gate", () => {
  const validLink = {
    id: "link-1",
    claimId: "claim-1",
    sourceId: "source-1",
    role: "supports",
    strength: "direct",
    locator: "line 4",
  };

  it("accepts a well-formed link", () => {
    expect(validateEvidenceLink(validLink)).toHaveLength(0);
  });

  it("accepts a contradicting source as legitimate evidence", () => {
    // Ketidaksepakatan direpresentasikan, tidak dihapus.
    expect(
      validateEvidenceLink({ ...validLink, role: "contradicts" }),
    ).toHaveLength(0);
  });

  it("refuses a strong link with no locator", () => {
    const findings = validateEvidenceLink({
      ...validLink,
      locator: undefined,
    });
    expect(findings.map((f) => f.rule)).toContain(
      "strong-link-requires-locator",
    );
  });

  it("refuses a link resting on a withdrawn source", () => {
    const findings = validateEvidenceLink({
      ...validLink,
      sourceLinkStatus: "withdrawn",
    });
    expect(findings.map((f) => f.rule)).toContain(
      "withdrawn-source-still-linked",
    );
  });
});

describe("media rights gate", () => {
  const NOW = Date.parse("2026-08-26T00:00:00.000Z");
  const publicAsset = {
    id: "jembatan-lama-1920",
    isPublic: true,
    visualEvidenceClass: "V1_documentary_historical_image" as const,
    rightsClass: "R2_institutional_use" as const,
    altText: "Jembatan besi melintasi Sungai Brantas, difoto dari tepi barat.",
    creditLine: "Collection XYZ, inv. 10007564",
    assetStatus: "green",
  };

  it("accepts a fully documented public asset", () => {
    expect(validateMediaRights(publicAsset, NOW)).toHaveLength(0);
  });

  it("refuses a reference-only asset marked public", () => {
    const findings = validateMediaRights(
      { ...publicAsset, rightsClass: "R5_reference_only" },
      NOW,
    );
    expect(findings.map((f) => f.rule)).toContain(
      "reference-only-never-public",
    );
  });

  it("refuses a public asset with no alt text", () => {
    const findings = validateMediaRights(
      { ...publicAsset, altText: undefined },
      NOW,
    );
    expect(findings.map((f) => f.rule)).toContain(
      "public-media-requires-alt-text",
    );
  });

  it("refuses a public asset whose permission has expired", () => {
    const findings = validateMediaRights(
      { ...publicAsset, rightsExpiresAt: "2026-01-01T00:00:00.000Z" },
      NOW,
    );
    expect(findings.map((f) => f.rule)).toContain("expired-rights-public");
  });

  it("refuses a prohibited representation regardless of visual quality", () => {
    const findings = validateMediaRights(
      { ...publicAsset, assetStatus: "black" },
      NOW,
    );
    expect(findings.map((f) => f.rule)).toContain(
      "prohibited-representation-public",
    );
  });

  it("leaves a private asset alone", () => {
    expect(
      validateMediaRights(
        { id: "master-tiff", isPublic: false, assetStatus: "amber" },
        NOW,
      ),
    ).toHaveLength(0);
  });
});

describe("scene contract gate", () => {
  const scene = {
    id: "scene-1135",
    slug: "1135-panjalu-jayati",
    isPublic: true,
    primaryEventId: "event-1135-hantang",
    actId: "act-ii",
    narrativeShort: "Panjalu announces itself in two words.",
    choreographyKey: "royalConsolidation",
    featuredClaims: [
      { id: "hantang-contains-panjalu-jayati", status: "published" as const },
    ],
  };

  it("accepts a complete published scene", () => {
    expect(validateSceneContract(scene, [...CHOREOGRAPHY_KEYS])).toHaveLength(
      0,
    );
  });

  it("refuses an unknown choreography key", () => {
    const findings = validateSceneContract(
      { ...scene, choreographyKey: "sparkleExplosion" },
      [...CHOREOGRAPHY_KEYS],
    );
    expect(findings.map((f) => f.rule)).toContain("unknown-choreography-key");
  });

  it("refuses a scene that features a draft claim", () => {
    const findings = validateSceneContract(
      {
        ...scene,
        featuredClaims: [{ id: "draft-claim", status: "needs_review" }],
      },
      [...CHOREOGRAPHY_KEYS],
    );
    expect(findings.map((f) => f.rule)).toContain("scene-uses-draft-claim");
  });

  it("refuses a published scene with no primary event", () => {
    const findings = validateSceneContract(
      { ...scene, primaryEventId: undefined },
      [...CHOREOGRAPHY_KEYS],
    );
    expect(findings.map((f) => f.rule)).toContain(
      "scene-requires-primary-event",
    );
  });

  it("refuses a published scene whose hero media is unpublished", () => {
    const findings = validateSceneContract(
      { ...scene, heroMedia: { id: "asset-x", isPublic: false } },
      [...CHOREOGRAPHY_KEYS],
    );
    expect(findings.map((f) => f.rule)).toContain(
      "scene-hero-media-not-public",
    );
  });

  it("refuses two scenes sharing one anchor", () => {
    const findings = validateSceneAnchors([
      scene,
      { ...scene, id: "scene-duplicate" },
    ]);
    expect(findings.map((f) => f.rule)).toContain("duplicate-scene-anchor");
  });
});

describe("combined integrity report", () => {
  it("passes a clean set and reports what it checked", () => {
    const report = validateHistoricalIntegrity({
      claims: [hantangClaim],
      knownChoreographyKeys: [...CHOREOGRAPHY_KEYS],
      now: Date.parse("2026-08-26T00:00:00.000Z"),
    });
    expect(report.ok).toBe(true);
    expect(report.checked).toBe(1);
    expect(summariseIntegrity(report)).toContain("Critical failures....... 0");
  });

  it("blocks on any critical finding", () => {
    const report = validateHistoricalIntegrity({
      claims: [{ ...hantangClaim, links: [] }],
      knownChoreographyKeys: [...CHOREOGRAPHY_KEYS],
    });
    expect(report.ok).toBe(false);
    expect(summariseIntegrity(report)).toContain(
      "published-claim-requires-source",
    );
  });
});

describe("historical domain contract", () => {
  it("keeps all six evidence classes distinct and labelled", () => {
    expect(EVIDENCE_CLASSES).toHaveLength(6);
    const labels = Object.values(EVIDENCE_CLASS_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("never invents a month or day for a year-precision date", () => {
    expect(
      chronologySchema.safeParse({
        startYear: 1222,
        precision: "year",
        display: "1222",
      }).success,
    ).toBe(true);
    expect(
      chronologySchema.safeParse({
        startYear: 1222,
        startMonth: 1,
        startDay: 1,
        precision: "year",
        display: "1222",
      }).success,
    ).toBe(false);
  });

  it("accepts an exact-day date where one is genuinely known", () => {
    // 27 Juli 879 adalah jangkar peringatan Hari Jadi dan tanggalnya memang
    // diketahui — presisi hari penuh sah di sini, dan hanya di sini.
    expect(
      chronologySchema.safeParse({
        startYear: 879,
        startMonth: 7,
        startDay: 27,
        precision: "exact_day",
        display: "27 Juli 879",
      }).success,
    ).toBe(true);
    expect(CHRONOLOGY_PRECISIONS).toContain("approximate");
  });

  it("produces stable, shareable slugs", () => {
    expect(toSlug("Panjalu Jayati")).toBe("panjalu-jayati");
    expect(toSlug("Prasasti Hantang / Ngantang")).toBe(
      "prasasti-hantang-ngantang",
    );
    expect(isValidSlug("1135-panjalu-jayati")).toBe(true);
    expect(isValidSlug("Panjalu Jayati")).toBe(false);
  });
});

describe("choreography key contract", () => {
  it("recognises a registered key and rejects an unknown one", () => {
    expect(isKnownChoreographyKey("bridgeConstruction")).toBe(true);
    expect(isKnownChoreographyKey("sparkleExplosion")).toBe(false);
  });
});
