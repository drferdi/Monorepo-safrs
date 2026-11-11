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
    return { statusClass: "fail", statusWord: "Rusak" };
  }
  if (status === "connected") {
    return { statusClass: "pass", statusWord: "Jalan" };
  }
  if (status === "requires-human-action") {
    return { statusClass: "warn", statusWord: "Perlu keputusan Anda" };
  }
  if (status === "requires-configuration") {
    return { statusClass: "warn", statusWord: "Perlu diatur dulu" };
  }
  if (status === "partially-connected") {
    return { statusClass: "warn", statusWord: "Baru sebagian" };
  }
  if (status === "not-yet-connected") {
    return { statusClass: "idle", statusWord: "Belum jalan" };
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
        ? "Pemeriksaan sebelum dibagikan tidak terbaca di folder proyek ini. Coba cek ulang dari papan."
        : `${gatesFail} pemeriksaan sebelum dibagikan belum lolos. Cek ulang supaya alasan terbaru terlihat.`,
    };
  }

  if (planeFail || (live.plane.available && live.plane.conflicts.length > 0)) {
    return {
      id: "status",
      why: "Papan pekerjaan bilang ada masalah. Baca keadaan aturan kerja untuk detailnya.",
    };
  }

  if (live.health.available && !live.health.ok) {
    return {
      id: "doctor",
      why: "Komputer ini belum siap. Jalankan pemeriksaan peralatan untuk daftar perbaikan.",
    };
  }

  return { id: null, why: null };
}

export function deriveSituation(live: LiveSnapshot): SituationView {
  const gatesUnavailable = !live.gates.available;
  const gateRows = live.gates.available ? live.gates.gates : [];
  const gatesPass = gateRows.filter((g) => g.verdict === "PASS").length;
  const gatesFail = gateRows.filter((g) => g.verdict !== "PASS").length;

  const planeStatus = live.plane.available
    ? live.plane.status.toUpperCase()
    : "";
  // WARN = governance green with warnings; only FAIL is a broken board.
  const planeFail = live.plane.available && planeStatus === "FAIL";
  const planeWarn = live.plane.available && planeStatus === "WARN";
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
    planeWarn ||
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
      "Komputer ini tidak bisa dicek sekarang. Pastikan Anda membuka rumah proyek yang benar, lalu coba lagi.";
  } else if (level === "fail") {
    verdictWord = "Belum siap";
    const parts: string[] = [];
    if (gatesFail > 0) {
      parts.push(`${gatesFail} pemeriksaan sebelum dibagikan belum lolos`);
    }
    if (planeFail) {
      parts.push("papan pekerjaan bermasalah");
    }
    // planeWarn is handled in the attention branch below.
    if (planeConflicts > 0) {
      parts.push(`${planeConflicts} orang/pekerjaan bentrok`);
    }
    if (healthOk === false) {
      parts.push(`${healthBlocked} peralatan di komputer belum oke`);
    }
    verdictSentence = `${parts.join("; ") || "Ada yang rusak atau belum siap"}. Belum bisa bilang “semua aman” sampai angka di kanan bersih.`;
  } else if (level === "attention") {
    verdictWord = "Perlu dilihat";
    const parts: string[] = [];
    if (gatesUnavailable) {
      parts.push("pemeriksaan sebelum dibagikan belum terbaca");
    }
    if (attentionFeatures.length > 0) {
      parts.push(`${attentionFeatures.length} fitur perlu dilihat`);
    }
    if (live.dirtyPaths > 0) {
      parts.push(`${live.dirtyPaths} file belum disimpan ke riwayat`);
    }
    if (planeWarn || planeWarnings > 0) {
      parts.push(
        planeWarnings > 0
          ? `${planeWarnings} peringatan di papan pekerjaan`
          : "papan pekerjaan ada peringatan",
      );
    }
    verdictSentence = `${parts.join("; ") || "Ada yang belum selesai"}. Belum ada kerusakan besar yang terlihat.`;
  } else {
    verdictWord = "Siap";
    verdictSentence =
      "Pemeriksaan penting lolos, papan pekerjaan tertib, komputer siap, dan tidak ada fitur yang menunggu keputusan Anda.";
  }

  const attention: SituationAttentionRow[] = [];

  for (const gate of gateRows.filter((g) => g.verdict !== "PASS")) {
    attention.push({
      id: `gate-${gate.check_id}`,
      source: "gate",
      title: gate.check_id,
      reason:
        gate.reason || gate.errors.join("; ") || "Belum lolos tanpa alasan",
      statusClass: "fail",
      statusWord: "Belum lolos",
    });
  }

  if (live.plane.available) {
    if (planeFail) {
      attention.push({
        id: "plane-status",
        source: "plane",
        title: "Papan pekerjaan",
        reason:
          live.plane.failedChecks.length > 0
            ? `Yang menolak: ${live.plane.failedChecks.join(", ")}`
            : (live.plane.nextAction ??
              live.plane.problem ??
              `Keadaan: ${live.plane.status}`),
        statusClass: "fail",
        statusWord: live.plane.status,
      });
    } else if (planeWarn || planeWarnings > 0) {
      attention.push({
        id: "plane-status",
        source: "plane",
        title: "Papan pekerjaan",
        reason:
          planeWarnings > 0
            ? `${planeWarnings} peringatan (pemeriksaan utama lolos)`
            : (live.plane.nextAction ?? `Keadaan: ${live.plane.status}`),
        statusClass: "warn",
        statusWord: live.plane.status,
      });
    }
    for (const conflict of live.plane.conflicts) {
      attention.push({
        id: `plane-conflict-${conflict}`,
        source: "plane",
        title: "Ada yang bentrok",
        reason: conflict,
        statusClass: "fail",
        statusWord: "Bentrok",
      });
    }
  } else if (live.plane.problem) {
    attention.push({
      id: "plane-unavailable",
      source: "plane",
      title: "Papan pekerjaan",
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
      title: "Apakah komputer siap",
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
