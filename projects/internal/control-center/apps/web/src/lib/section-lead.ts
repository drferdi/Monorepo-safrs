import type { LiveSnapshot, NavId } from "./control-center.ts";
import { deriveSituation } from "./situation.ts";

/**
 * Every board section must expose three operator-facing facts:
 * feature name, what it does in plain language, and status with a reason.
 */

export type SectionStatusKind = "active" | "failed" | "attention";

export type SectionLeadModel = {
  name: string;
  purpose: string;
  status: SectionStatusKind;
  /** Short Indonesian label shown beside the glyph. */
  statusLabel: string;
  statusReason: string;
};

const STATUS_LABEL: Record<SectionStatusKind, string> = {
  active: "Aktif",
  failed: "Gagal",
  attention: "Perlu perhatian",
};

type SectionMeta = {
  name: string;
  purpose: string;
};

/** Plain-language names and purposes for each nav section. */
export const SECTION_META: Record<NavId, SectionMeta> = {
  home: {
    name: "Situasi SAFRS",
    purpose:
      "Ringkasan cepat: apakah monorepo di komputer ini siap, apa yang bermasalah, dan langkah aman berikutnya.",
  },
  projects: {
    name: "Proyek & paket",
    purpose:
      "Peta isi repository: kapsul produk dan paket bersama, serta seberapa luas dampak jika salah satunya diubah.",
  },
  agents: {
    name: "Agen & peran",
    purpose:
      "Siapa boleh mengerjakan apa. Memisahkan peran manusia dari identitas otomasi, lengkap dengan batas wewenang.",
  },
  tasks: {
    name: "Task & control plane",
    purpose:
      "Pekerjaan yang sedang tercatat di sistem, siapa yang memegangnya, dan apakah tata kelola lolos.",
  },
  health: {
    name: "Kesiapan mesin",
    purpose:
      "Memeriksa apakah Node, Docker, basis data lokal, dan berkas lingkungan siap dipakai di komputer ini.",
  },
  activity: {
    name: "Aktivitas & gerbang",
    purpose:
      "Apa yang baru berubah di git, dan apakah delapan gerbang publikasi SAFRS lolos pada checkout ini.",
  },
  governance: {
    name: "Tata kelola (risiko)",
    purpose:
      "Menjelaskan tingkatan risiko R0–R3: mana yang aman dijalankan agen, mana yang wajib keputusan manusia.",
  },
  knowledge: {
    name: "Pengetahuan resmi",
    purpose:
      "Daftar dokumen resmi repository. Jika ringkasan bentrok dengan spesifikasi, spesifikasi yang menang.",
  },
};

function lead(
  id: NavId,
  status: SectionStatusKind,
  statusReason: string,
): SectionLeadModel {
  const meta = SECTION_META[id];
  return {
    name: meta.name,
    purpose: meta.purpose,
    status,
    statusLabel: STATUS_LABEL[status],
    statusReason,
  };
}

/**
 * Derive section status from the live snapshot only — never invent health.
 */
export function deriveSectionLead(
  id: NavId,
  live: LiveSnapshot,
): SectionLeadModel {
  switch (id) {
    case "home": {
      const situation = deriveSituation(live);
      if (situation.level === "pass") {
        return lead(
          id,
          "active",
          "Gerbang, control plane, dan kesiapan mesin terbaca bersih pada pembacaan ini.",
        );
      }
      if (situation.level === "fail" || situation.level === "unknown") {
        return lead(id, "failed", situation.verdictSentence);
      }
      return lead(id, "attention", situation.verdictSentence);
    }
    case "projects": {
      const { members, problems } = live.workspace;
      if (members.length === 0) {
        return lead(
          id,
          "failed",
          "Tidak ada anggota workspace yang terbaca dari pnpm-workspace.yaml.",
        );
      }
      if (problems.length > 0) {
        return lead(
          id,
          "attention",
          `${problems.length} masalah saat membaca peta workspace. Daftar paket masih ditampilkan.`,
        );
      }
      return lead(
        id,
        "active",
        `${members.length} paket/anggota workspace terbaca dari disk.`,
      );
    }
    case "agents": {
      if (!live.roles.available) {
        return lead(
          id,
          "attention",
          "Kebijakan peran (.safrs/policy.json) tidak terbaca — daftar memakai teks katalog, bukan kebijakan live.",
        );
      }
      return lead(
        id,
        "active",
        "Kebijakan peran terbaca dari .safrs/policy.json dan digabung dengan katalog agen.",
      );
    }
    case "tasks": {
      if (!live.plane.available) {
        return lead(
          id,
          "failed",
          live.plane.problem ??
            "Control plane tidak dapat dibaca (tools/status --json).",
        );
      }
      if (live.plane.status.toUpperCase() !== "PASS") {
        return lead(
          id,
          "failed",
          `Control plane berstatus ${live.plane.status}. ${
            live.plane.failedChecks.length > 0
              ? `Pemeriksa yang menolak: ${live.plane.failedChecks.join(", ")}.`
              : (live.plane.nextAction ?? "")
          }`.trim(),
        );
      }
      if (live.plane.conflicts.length > 0 || live.plane.warnings.length > 0) {
        return lead(
          id,
          "attention",
          `${live.plane.activeTasks.length} task aktif; ${live.plane.conflicts.length} konflik; ${live.plane.warnings.length} peringatan.`,
        );
      }
      return lead(
        id,
        "active",
        `Control plane PASS. ${live.plane.tasks.length} task tercatat; ${live.plane.activeTasks.length} masih aktif.`,
      );
    }
    case "health": {
      if (!live.health.available) {
        return lead(
          id,
          "failed",
          live.health.problem ??
            "Pemeriksaan kesiapan (doctor) tidak dapat dijalankan pada checkout ini.",
        );
      }
      if (!live.health.ok) {
        const blocked = live.health.checks.filter((c) => !c.ok).length;
        return lead(
          id,
          "failed",
          `${blocked} dari ${live.health.checks.length} pemeriksaan menghalangi. Perbaiki satu per satu di bawah.`,
        );
      }
      return lead(
        id,
        "active",
        "Semua pemeriksaan kesiapan lokal lolos. Mesin siap dipakai.",
      );
    }
    case "activity": {
      const gitOk = live.activity.available;
      const gatesOk = live.gates.available;
      if (!gitOk && !gatesOk) {
        return lead(
          id,
          "failed",
          "Git dan gerbang publikasi tidak terbaca pada checkout ini.",
        );
      }
      if (gatesOk) {
        const failed = live.gates.gates.filter(
          (g) => g.verdict !== "PASS",
        ).length;
        if (failed > 0) {
          return lead(
            id,
            "failed",
            `${failed} gerbang publikasi ditolak. Lihat tabel gerbang di bawah.`,
          );
        }
      }
      if (!gitOk || !gatesOk) {
        return lead(
          id,
          "attention",
          !gitOk
            ? "Aktivitas git tidak lengkap; gerbang masih ditampilkan bila tersedia."
            : (live.gates.problem ??
                "Gerbang publikasi tidak lengkap; aktivitas git masih ditampilkan."),
        );
      }
      return lead(
        id,
        "active",
        `${live.activity.recent.length} commit terbaru terbaca; semua gerbang publikasi yang dievaluasi lolos.`,
      );
    }
    case "governance": {
      return lead(
        id,
        "active",
        "Ini panduan tetap tentang tingkatan risiko — tidak bergantung pada pembaca live. Keputusan R2/R3 tetap milik manusia.",
      );
    }
    case "knowledge": {
      if (!live.knowledge.available) {
        return lead(
          id,
          "failed",
          "Registry dokumen resmi (.safrs/document-registry.json) tidak terbaca.",
        );
      }
      return lead(
        id,
        "active",
        `${live.knowledge.documents.length} dokumen resmi tercatat di registry.`,
      );
    }
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
