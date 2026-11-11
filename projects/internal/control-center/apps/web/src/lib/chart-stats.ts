import type { LiveFeature, LiveSnapshot } from "./control-center.ts";

/** Working = evidence-connected; everything else is not working. */
export type FeatureWorkSplit = {
  working: number;
  notWorking: number;
  total: number;
};

export type StatusBucket = {
  status: string;
  label: string;
  count: number;
};

const STATUS_LABEL_ID: Record<string, string> = {
  connected: "Jalan",
  "partially-connected": "Baru sebagian",
  "not-yet-connected": "Belum jalan",
  "requires-configuration": "Perlu diatur dulu",
  "requires-human-action": "Perlu keputusan Anda",
  error: "Rusak",
};

const STATUS_ORDER = [
  "connected",
  "partially-connected",
  "requires-configuration",
  "requires-human-action",
  "not-yet-connected",
  "error",
] as const;

/**
 * Capsule / app features (area "apps") stand in for "projects" on this board —
 * they carry derived connection status from evidence on disk.
 */
export function isProjectFeature(feature: LiveFeature): boolean {
  return feature.area === "apps";
}

export function featureWorkSplit(features: LiveFeature[]): FeatureWorkSplit {
  let working = 0;
  let notWorking = 0;
  for (const feature of features) {
    if (feature.status === "connected") {
      working += 1;
    } else {
      notWorking += 1;
    }
  }
  return { working, notWorking, total: features.length };
}

export function projectStatusBuckets(features: LiveFeature[]): StatusBucket[] {
  const projects = features.filter(isProjectFeature);
  const counts = new Map<string, number>();
  for (const feature of projects) {
    counts.set(feature.status, (counts.get(feature.status) ?? 0) + 1);
  }
  const buckets: StatusBucket[] = [];
  for (const status of STATUS_ORDER) {
    const count = counts.get(status) ?? 0;
    if (count > 0) {
      buckets.push({
        status,
        label: STATUS_LABEL_ID[status] ?? status,
        count,
      });
    }
  }
  for (const [status, count] of counts) {
    if (!STATUS_ORDER.includes(status as (typeof STATUS_ORDER)[number])) {
      buckets.push({
        status,
        label: STATUS_LABEL_ID[status] ?? status,
        count,
      });
    }
  }
  return buckets;
}

export function chartStatsFromLive(live: LiveSnapshot): {
  features: FeatureWorkSplit;
  projects: StatusBucket[];
  projectTotal: number;
} {
  const features = featureWorkSplit(live.features);
  const projects = projectStatusBuckets(live.features);
  return {
    features,
    projects,
    projectTotal: projects.reduce((sum, b) => sum + b.count, 0),
  };
}
