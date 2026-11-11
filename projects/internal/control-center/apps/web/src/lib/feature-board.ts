import type { LiveFeature } from "./control-center.ts";

/** Plain Indonesian status words for the feature catalog board. */
export function featureStatusLabel(status: string): string {
  if (status === "connected") return "Jalan";
  if (status === "partially-connected") return "Baru sebagian";
  if (status === "not-yet-connected") return "Belum jalan";
  if (status === "requires-configuration") return "Perlu diatur dulu";
  if (status === "requires-human-action") return "Perlu keputusan Anda";
  if (status === "error") return "Rusak";
  return status;
}

export function featureStatusClass(
  status: string,
): "pass" | "warn" | "fail" | "idle" {
  if (status === "connected") return "pass";
  if (status === "error") return "fail";
  if (status === "requires-human-action") return "warn";
  if (status === "not-yet-connected") return "idle";
  return "warn";
}

/** Evidence metric: how many proof paths were found on disk. */
export function featureEvidenceMetric(feature: LiveFeature): {
  found: number;
  total: number;
  label: string;
} {
  const total = feature.evidence.length;
  const found = feature.evidence.filter((item) => item.present).length;
  return {
    found,
    total,
    label: total === 0 ? "0 bukti" : `${found}/${total} bukti`,
  };
}

/** Sort: broken first, then attention, then working — stable by name. */
export function sortFeaturesForBoard(features: LiveFeature[]): LiveFeature[] {
  const rank = (status: string): number => {
    if (status === "error") return 0;
    if (status === "requires-human-action") return 1;
    if (status === "requires-configuration") return 2;
    if (status === "partially-connected") return 3;
    if (status === "not-yet-connected") return 4;
    if (status === "connected") return 5;
    return 6;
  };
  return [...features].sort((a, b) => {
    const delta = rank(a.status) - rank(b.status);
    return delta !== 0 ? delta : a.name.localeCompare(b.name, "en");
  });
}

/**
 * Board groups — each family stands alone (projects ≠ tools ≠ packages).
 * Order is fixed for operator scanning.
 */
export type FeatureBoardGroupId =
  | "projects"
  | "rules"
  | "tools"
  | "packages"
  | "data"
  | "knowledge"
  | "quality";

export type FeatureBoardGroup = {
  id: FeatureBoardGroupId;
  title: string;
  blurb: string;
  areas: readonly string[];
};

export const FEATURE_BOARD_GROUPS: readonly FeatureBoardGroup[] = [
  {
    id: "projects",
    title: "Projects (standalone capsules)",
    blurb:
      "Aplikasi dan kapsul produk — masing-masing boleh berdiri sendiri di luar root.",
    areas: ["apps"],
  },
  {
    id: "rules",
    title: "Rules & automation",
    blurb: "Pemeriksaan rumah, papan pekerjaan agen, dan orkestrasi Gaffer.",
    areas: ["governance", "automation"],
  },
  {
    id: "tools",
    title: "Tools",
    blurb:
      "Perintah dan pemeriksa untuk menyiapkan, membuat, atau memverifikasi.",
    areas: ["tooling"],
  },
  {
    id: "packages",
    title: "Shared packages",
    blurb: "Kode bersama root yang dipakai beberapa bagian (bukan produk).",
    areas: ["packages"],
  },
  {
    id: "data",
    title: "Data",
    blurb: "Pipeline data dan basis pengetahuan.",
    areas: ["data"],
  },
  {
    id: "knowledge",
    title: "Knowledge",
    blurb: "Wiki dan adapter agen — aturan dibaca manusia dan mesin.",
    areas: ["knowledge"],
  },
  {
    id: "quality",
    title: "Quality",
    blurb: "Uji, CI, dan pemeriksaan keamanan ketergantungan.",
    areas: ["quality"],
  },
] as const;

export type FeatureBoardBucket = {
  group: FeatureBoardGroup;
  features: LiveFeature[];
  working: number;
};

export type FeatureBoardColumns = {
  left: FeatureBoardBucket[];
  right: FeatureBoardBucket[];
};

/** Left = proyek + aturan + alat; right = paket + data + pengetahuan + mutu. */
const LEFT_COLUMN_IDS: ReadonlySet<FeatureBoardGroupId> = new Set([
  "projects",
  "rules",
  "tools",
]);

/** Split live features into separate board families; drop empty groups. */
export function groupFeaturesForBoard(
  features: LiveFeature[],
): FeatureBoardBucket[] {
  const buckets: FeatureBoardBucket[] = [];
  const claimed = new Set<string>();

  for (const group of FEATURE_BOARD_GROUPS) {
    const areaSet = new Set(group.areas);
    const members = sortFeaturesForBoard(
      features.filter((feature) => areaSet.has(feature.area)),
    );
    for (const feature of members) {
      claimed.add(feature.id);
    }
    if (members.length === 0) continue;
    buckets.push({
      group,
      features: members,
      working: members.filter((f) => f.status === "connected").length,
    });
  }

  const leftover = sortFeaturesForBoard(
    features.filter((feature) => !claimed.has(feature.id)),
  );
  if (leftover.length > 0) {
    buckets.push({
      group: {
        id: "tools",
        title: "Other",
        blurb: "Fitur yang area-nya belum masuk kelompok di atas.",
        areas: [],
      },
      features: leftover,
      working: leftover.filter((f) => f.status === "connected").length,
    });
  }

  return buckets;
}

/** One page, two columns — projects stay on the left. */
export function splitFeatureBoardColumns(
  features: LiveFeature[],
): FeatureBoardColumns {
  const buckets = groupFeaturesForBoard(features);
  const left: FeatureBoardBucket[] = [];
  const right: FeatureBoardBucket[] = [];
  for (const bucket of buckets) {
    if (LEFT_COLUMN_IDS.has(bucket.group.id)) {
      left.push(bucket);
    } else {
      right.push(bucket);
    }
  }
  return { left, right };
}
