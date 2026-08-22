import { FEATURE_CATALOG } from "./catalog.ts";
import { branchExists, branchFiles, readGit } from "./git.ts";
import { repoPathExists, repoRoot } from "./root.ts";
import type {
  Availability,
  ConnectionStatus,
  FeatureDefinition,
  RegistrySnapshot,
  ResolvedFeature,
} from "./types.ts";

/**
 * The feature registry: the single source of truth the dashboard renders.
 *
 * Status is *derived*, never declared. Every catalog entry lists the repository
 * paths that would prove it exists; this module checks them on disk and lets
 * the result decide. A feature whose files are deleted goes red without anyone
 * editing the catalog, and a catalog entry pointing at nothing is reported as
 * an error rather than rendered as if it were fine.
 */

const EMPTY_COUNTS: Record<ConnectionStatus, number> = {
  connected: 0,
  "partially-connected": 0,
  "not-yet-connected": 0,
  "requires-configuration": 0,
  "requires-human-action": 0,
  error: 0,
};

type Verdict = {
  availability: Availability;
  status: ConnectionStatus;
  statusReason: string;
};

async function decide(
  definition: FeatureDefinition,
  foundCount: number,
  totalCount: number,
): Promise<Verdict> {
  if (totalCount === 0) {
    return {
      availability: "missing",
      status: "error",
      statusReason:
        "Entri katalog ini tidak menyebutkan satu pun bukti, sehingga statusnya tidak dapat diperiksa.",
    };
  }

  if (foundCount === totalCount) {
    return {
      availability: "on-main",
      status: "connected",
      statusReason: `Seluruh ${totalCount} bukti ditemukan di checkout ini dan dibaca langsung oleh dashboard.`,
    };
  }

  // Some evidence is missing. Before reporting a partial or broken feature,
  // check whether the missing part simply lives on an unmerged branch.
  //
  // This check runs before the partial verdict on purpose. A feature can leave
  // incidental traces in the checkout — a tracked manifest, a data directory —
  // while its actual implementation is still on a branch. Reporting that as
  // "partially connected on main" would overstate what is present.
  if (definition.branch && (await branchExists(definition.branch))) {
    const files = await branchFiles(definition.branch);
    const onBranch = definition.evidence.filter((item) =>
      files.some(
        (file) => file === item.path || file.startsWith(`${item.path}/`),
      ),
    ).length;

    if (onBranch > 0) {
      return {
        availability: "branch-only",
        status: "requires-human-action",
        statusReason: `Kode ada di branch \`${definition.branch}\` (${onBranch} dari ${totalCount} bukti), tetapi belum digabungkan ke \`main\`. Penggabungan adalah keputusan manusia.`,
      };
    }
  }

  if (foundCount > 0) {
    return {
      availability: "on-main",
      status: "partially-connected",
      statusReason: `${foundCount} dari ${totalCount} bukti ditemukan. Sebagian berkas yang diharapkan tidak ada di checkout ini.`,
    };
  }

  return {
    availability: "missing",
    status: "error",
    statusReason:
      "Tidak satu pun bukti yang disebutkan katalog ditemukan, baik di checkout ini maupun di branch yang dirujuk. Katalog perlu diperbaiki.",
  };
}

async function resolveFeature(
  definition: FeatureDefinition,
): Promise<ResolvedFeature> {
  const evidence = await Promise.all(
    definition.evidence.map(async (item) => ({
      ...item,
      present: await repoPathExists(item.path),
    })),
  );

  const found = evidence.filter((item) => item.present).length;
  const verdict = await decide(definition, found, evidence.length);

  return {
    ...definition,
    evidence,
    ...verdict,
    evidenceRatio: evidence.length === 0 ? 0 : found / evidence.length,
  };
}

/** Read the repository and resolve every catalog entry against it. */
export async function readRegistry(): Promise<RegistrySnapshot> {
  const problems: string[] = [];

  const [root, git] = await Promise.all([repoRoot(), readGit()]);

  if (!git.available) {
    problems.push(
      "Git tidak dapat dibaca. Status branch dan fitur yang belum digabungkan tidak dapat ditampilkan.",
    );
  }

  const features = await Promise.all(FEATURE_CATALOG.map(resolveFeature));

  const counts = { ...EMPTY_COUNTS };
  for (const feature of features) {
    counts[feature.status] += 1;
  }

  for (const feature of features) {
    if (feature.status === "error") {
      problems.push(`Katalog menunjuk berkas yang tidak ada: ${feature.name}.`);
    }
  }

  return {
    readAt: new Date().toISOString(),
    repoRoot: root,
    git,
    features,
    counts,
    problems,
  };
}

/** Find one resolved feature by id. */
export async function readFeature(id: string): Promise<ResolvedFeature | null> {
  const definition = FEATURE_CATALOG.find((entry) => entry.id === id);
  if (!definition) {
    return null;
  }
  return resolveFeature(definition);
}
