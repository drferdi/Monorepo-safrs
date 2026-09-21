import type { LiveFeature, LiveSnapshot } from "./control-center.ts";
import { RECOVERY_COMMAND } from "./exec/commands.ts";

/**
 * Pure aggregation of a LiveSnapshot into the Home "Situasi SAFRS" verdict.
 *
 * Does not invent status: every word and count comes from gates, plane, health,
 * and feature evidence already resolved by the server readers.
 */

export type SituationLevel = "pass" | "attention" | "fail" | "unknown";

export type SituationCounts = {
  failed: number;
  warned: number;
  passed: number;
};

export type SituationAttentionRow = {
  id: string;
  source: "gate" | "plane" | "health" | "feature";
  title: string;
  reason: string;
  statusClass: "fail" | "warn" | "pass" | "idle";
  statusWord: string;
};

export type SituationSummary = {
  gatesPass: number;
  gatesFail: number;
  gatesUnavailable: boolean;
  planeStatus: string;
  planeActive: number;
  planeConflicts: number;
  healthOk: boolean | null;
  healthBlocked: number;
  featuresAttention: number;
  dirtyPaths: number;
};

export type SituationView = {
  level: SituationLevel;
  verdictWord: string;
  verdictSentence: string;
  counts: SituationCounts;
  primaryActionId: string | null;
  primaryActionWhy: string | null;
  attention: SituationAttentionRow[];
  summary: SituationSummary;
};

const FEATURE_STATUS_ORDER = [
  "error",
  "requires-human-action",
  "requires-configuration",
  "partially-connected",
  "not-yet-connected",
  "connected",
] as const;

function byFeatureAttention(a: LiveFeature, b: LiveFeature): number {
  const delta =
    FEATURE_STATUS_ORDER.indexOf(
      a.status as (typeof FEATURE_STATUS_ORDER)[number],
    ) -
    FEATURE_STATUS_ORDER.indexOf(
      b.status as (typeof FEATURE_STATUS_ORDER)[number],
    );
  return delta !== 0 ? delta : a.name.localeCompare(b.name, "id");
}

function featureStatusWord(status: string): {
  statusClass: SituationAttentionRow["statusClass"];
  statusWord: string;
} {
  if (status === "error") {
    return { statusClass: "fail", statusWord: "Error" };
  }
  if (status === "connected") {
    return { statusClass: "pass", statusWord: "Terhubung" };
  }
  if (status === "requires-human-action") {
    return { statusClass: "warn", statusWord: "Keputusan manusia" };
  }
  if (status === "requires-configuration") {
    return { statusClass: "warn", statusWord: "Perlu konfigurasi" };
  }
  if (status === "partially-connected") {
    return { statusClass: "warn", statusWord: "Sebagian" };
  }
  if (status === "not-yet-connected") {
    return { statusClass: "idle", statusWord: "Belum terhubung" };
  }
  return { statusClass: "warn", statusWord: status };
}

function pickPrimaryAction(
  live: LiveSnapshot,
  gatesFail: number,
  gatesUnavailable: boolean,
  planeFail: boolean,
): { id: string | null; why: string | null } {
  if (live.health.available) {
    const blocked = live.health.checks
      .filter((check) => !check.ok)
      .sort((a, b) => {
        const rank = (area: string) => (area === "DOCKER" ? 0 : 1);
        return rank(a.area) - rank(b.area);
      });
    for (const check of blocked) {
      const id = RECOVERY_COMMAND[check.id];
      if (id) {
        return {
          id,
          why: check.recovery || check.summary,
        };
      }
    }
  }

  if (gatesUnavailable || gatesFail > 0) {
    return {
      id: "saf-gate-all",
      why: gatesUnavailable
        ? "Gerbang publikasi tidak terbaca pada checkout ini — evaluasi ulang dari papan."
        : `${gatesFail} gerbang publikasi ditolak. Evaluasi ulang untuk melihat alasan terbaru.`,
    };
  }

  if (planeFail || (live.plane.available && live.plane.conflicts.length > 0)) {
    return {
      id: "status",
      why: "Control plane melaporkan masalah. Baca status tata kelola untuk detail.",
    };
  }

  if (live.health.available && !live.health.ok) {
    return {
      id: "doctor",
      why: "Mesin lokal belum siap. Jalankan pemeriksaan kesiapan untuk daftar perbaikan.",
    };
  }

  return { id: null, why: null };
}

export function deriveSituation(live: LiveSnapshot): SituationView {
  const gatesUnavailable = !live.gates.available;
  const gateRows = live.gates.available ? live.gates.gates : [];
  const gatesPass = gateRows.filter((g) => g.verdict === "PASS").length;
  const gatesFail = gateRows.filter((g) => g.verdict !== "PASS").length;

  const planeFail =
    live.plane.available && live.plane.status.toUpperCase() !== "PASS";
  const planeWarnings = live.plane.available ? live.plane.warnings.length : 0;
  const planeConflicts = live.plane.available ? live.plane.conflicts.length : 0;

  const healthBlocked = live.health.available
    ? live.health.checks.filter((check) => !check.ok).length
    : 0;
  const healthOk = live.health.available ? live.health.ok : null;

  const attentionFeatures = live.features
    .filter((feature) => feature.status !== "connected")
    .sort(byFeatureAttention);

  const readersDown =
    gatesUnavailable && !live.plane.available && !live.health.available;

  let level: SituationLevel;
  if (readersDown) {
    level = "unknown";
  } else if (
    gatesFail > 0 ||
    planeFail ||
    planeConflicts > 0 ||
    (healthOk === false && healthBlocked > 0)
  ) {
    level = "fail";
  } else if (
    gatesUnavailable ||
    !live.plane.available ||
    !live.health.available ||
    planeWarnings > 0 ||
    attentionFeatures.length > 0 ||
    live.dirtyPaths > 0 ||
    live.problems.length > 0
  ) {
    level = "attention";
  } else {
    level = "pass";
  }

  const failed =
    gatesFail +
    (planeFail ? 1 : 0) +
    planeConflicts +
    (healthOk === false ? healthBlocked : 0) +
    attentionFeatures.filter((f) => f.status === "error").length;

  const warned =
    (gatesUnavailable ? 1 : 0) +
    planeWarnings +
    (live.dirtyPaths > 0 ? 1 : 0) +
    attentionFeatures.filter((f) => f.status !== "error").length;

  const passed =
    gatesPass +
    (live.plane.available && !planeFail ? 1 : 0) +
    (healthOk === true ? 1 : 0) +
    live.features.filter((f) => f.status === "connected").length;

  let verdictWord: string;
  let verdictSentence: string;

  if (level === "unknown") {
    verdictWord = "Tidak terbaca";
    verdictSentence =
      "Gerbang, control plane, dan kesiapan mesin tidak dapat dievaluasi pada checkout ini. Periksa SENTRA_REPO_ROOT dan jalankan alat dari terminal.";
  } else if (level === "fail") {
    verdictWord = "Tidak siap";
    const parts: string[] = [];
    if (gatesFail > 0) {
      parts.push(`${gatesFail} gerbang publikasi ditolak`);
    }
    if (planeFail) {
      parts.push(`control plane ${live.plane.status}`);
    }
    if (planeConflicts > 0) {
      parts.push(`${planeConflicts} konflik kepemilikan`);
    }
    if (healthOk === false) {
      parts.push(`${healthBlocked} pemeriksaan kesiapan gagal`);
    }
    verdictSentence = `${parts.join("; ") || "Ada kegagalan yang harus diperbaiki"}. Lolos tidak diklaim sampai hitungan di kanan bersih.`;
  } else if (level === "attention") {
    verdictWord = "Perlu perhatian";
    const parts: string[] = [];
    if (gatesUnavailable) {
      parts.push("gerbang publikasi belum terbaca");
    }
    if (attentionFeatures.length > 0) {
      parts.push(`${attentionFeatures.length} fitur perlu perhatian`);
    }
    if (live.dirtyPaths > 0) {
      parts.push(`${live.dirtyPaths} path belum di-commit`);
    }
    if (planeWarnings > 0) {
      parts.push(`${planeWarnings} peringatan control plane`);
    }
    verdictSentence = `${parts.join("; ") || "Ada sinyal yang belum selesai"}. Tidak ada kegagalan keras yang terdeteksi dari pembaca yang tersedia.`;
  } else {
    verdictWord = "Siap";
    verdictSentence =
      "Gerbang publikasi lolos, control plane PASS, mesin lokal siap, dan tidak ada fitur yang menunggu perhatian pada pembacaan ini.";
  }

  const attention: SituationAttentionRow[] = [];

  for (const gate of gateRows.filter((g) => g.verdict !== "PASS")) {
    attention.push({
      id: `gate-${gate.check_id}`,
      source: "gate",
      title: gate.check_id,
      reason: gate.reason || gate.errors.join("; ") || "Ditolak tanpa alasan",
      statusClass: "fail",
      statusWord: "Ditolak",
    });
  }

  if (live.plane.available) {
    if (planeFail) {
      attention.push({
        id: "plane-status",
        source: "plane",
        title: "Control plane",
        reason:
          live.plane.failedChecks.length > 0
            ? `Pemeriksa yang menolak: ${live.plane.failedChecks.join(", ")}`
            : (live.plane.nextAction ??
              live.plane.problem ??
              `Status ${live.plane.status}`),
        statusClass: "fail",
        statusWord: live.plane.status,
      });
    }
    for (const conflict of live.plane.conflicts) {
      attention.push({
        id: `plane-conflict-${conflict}`,
        source: "plane",
        title: "Konflik kepemilikan",
        reason: conflict,
        statusClass: "fail",
        statusWord: "Konflik",
      });
    }
  } else if (live.plane.problem) {
    attention.push({
      id: "plane-unavailable",
      source: "plane",
      title: "Control plane",
      reason: live.plane.problem,
      statusClass: "warn",
      statusWord: "Tidak terbaca",
    });
  }

  if (live.health.available) {
    for (const check of live.health.checks.filter((c) => !c.ok)) {
      attention.push({
        id: `health-${check.id}`,
        source: "health",
        title: check.summary,
        reason: check.recovery || check.technical || check.summary,
        statusClass: check.severity === "unsafe" ? "fail" : "warn",
        statusWord: check.area,
      });
    }
  } else if (live.health.problem) {
    attention.push({
      id: "health-unavailable",
      source: "health",
      title: "Kesiapan mesin",
      reason: live.health.problem,
      statusClass: "warn",
      statusWord: "Tidak terbaca",
    });
  }

  for (const feature of attentionFeatures) {
    const words = featureStatusWord(feature.status);
    attention.push({
      id: `feature-${feature.id}`,
      source: "feature",
      title: feature.name,
      reason: feature.statusReason,
      statusClass: words.statusClass,
      statusWord: words.statusWord,
    });
  }

  const primary = pickPrimaryAction(
    live,
    gatesFail,
    gatesUnavailable,
    planeFail,
  );

  return {
    level,
    verdictWord,
    verdictSentence,
    counts: { failed, warned, passed },
    primaryActionId: primary.id,
    primaryActionWhy: primary.why,
    attention,
    summary: {
      gatesPass,
      gatesFail,
      gatesUnavailable,
      planeStatus: live.plane.available ? live.plane.status : "—",
      planeActive: live.plane.available ? live.plane.activeTasks.length : 0,
      planeConflicts,
      healthOk,
      healthBlocked,
      featuresAttention: attentionFeatures.length,
      dirtyPaths: live.dirtyPaths,
    },
  };
}
