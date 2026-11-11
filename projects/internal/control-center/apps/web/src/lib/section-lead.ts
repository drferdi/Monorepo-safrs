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
  active: "Baik",
  failed: "Rusak / belum siap",
  attention: "Perlu dilihat",
};

type SectionMeta = {
  name: string;
  purpose: string;
};

/** Section titles in English; purposes stay plain Indonesian. */
export const SECTION_META: Record<NavId, SectionMeta> = {
  home: {
    name: "SAFRS Dashboard",
    purpose: 'Welcome to Sentraverse, dr Ferdi Iskandar "The Gaffer".',
  },
  projects: {
    name: "Projects",
    purpose:
      "Menunjukkan proyek-proyek yang ada di rumah besar ini, dan apa yang ikut berubah jika salah satunya diubah.",
  },
  agents: {
    name: "Agents",
    purpose:
      "Menjelaskan siapa manusia dan siapa pembantu komputer, plus apa yang boleh dan tidak boleh mereka lakukan.",
  },
  tasks: {
    name: "Tasks",
    purpose:
      "Melihat daftar pekerjaan yang sedang dikerjakan, siapa yang memegangnya, dan apakah aturannya masih tertib.",
  },
  health: {
    name: "Health",
    purpose:
      "Halaman khusus untuk cek mesin lokal dan memperbaikinya: setup, Postgres, Prisma, lalu cek ulang. Docker Desktop Windows tetap dibuka manual.",
  },
  activity: {
    name: "Activity",
    purpose:
      "Melihat perubahan terbaru yang sudah disimpan, dan apakah pemeriksaan penting sebelum dibagikan sudah lolos.",
  },
  governance: {
    name: "Governance",
    purpose:
      "Menjelaskan tingkat bahaya suatu pekerjaan: mana yang aman, mana yang perlu hati-hati, mana yang wajib izin Anda.",
  },
  knowledge: {
    name: "Knowledge",
    purpose:
      "Daftar dokumen resmi. Kalau penjelasan singkat bertentangan dengan buku aturan, yang diikuti adalah buku aturan.",
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
          "Semua yang dicek terlihat baik pada pembacaan ini.",
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
          "Daftar proyek tidak ketemu. File daftar di komputer ini sepertinya kosong atau rusak.",
        );
      }
      if (problems.length > 0) {
        return lead(
          id,
          "attention",
          `Ada ${problems.length} masalah saat membaca daftar. Daftar tetap ditampilkan, tapi belum sempurna.`,
        );
      }
      return lead(
        id,
        "active",
        `Ada ${members.length} bagian proyek yang terbaca dari komputer ini.`,
      );
    }
    case "agents": {
      if (!live.roles.available) {
        return lead(
          id,
          "attention",
          "Aturan peran tidak terbaca. Yang ditampilkan adalah catatan umum, bukan aturan terbaru dari file kebijakan.",
        );
      }
      return lead(
        id,
        "active",
        "Aturan peran terbaca dengan baik dan digabung dengan daftar orang/pembantu.",
      );
    }
    case "tasks": {
      if (!live.plane.available) {
        return lead(
          id,
          "failed",
          live.plane.problem ?? "Papan pekerjaan tidak bisa dibaca sekarang.",
        );
      }
      const planeStatus = live.plane.status.toUpperCase();
      if (planeStatus === "FAIL") {
        return lead(
          id,
          "failed",
          `Papan pekerjaan bermasalah (status: ${live.plane.status}). ${
            live.plane.failedChecks.length > 0
              ? `Yang menolak: ${live.plane.failedChecks.join(", ")}.`
              : (live.plane.nextAction ?? "")
          }`.trim(),
        );
      }
      if (
        planeStatus === "WARN" ||
        live.plane.conflicts.length > 0 ||
        live.plane.warnings.length > 0
      ) {
        return lead(
          id,
          "attention",
          `${live.plane.activeTasks.length} pekerjaan masih jalan; ${live.plane.conflicts.length} bentrok; ${live.plane.warnings.length} peringatan.`,
        );
      }
      return lead(
        id,
        "active",
        `Papan pekerjaan tertib. ${live.plane.tasks.length} pekerjaan tercatat; ${live.plane.activeTasks.length} masih aktif.`,
      );
    }
    case "health": {
      if (!live.health.available) {
        return lead(
          id,
          "failed",
          live.health.problem ??
            "Pemeriksaan komputer tidak bisa dijalankan sekarang.",
        );
      }
      if (!live.health.ok) {
        const blocked = live.health.checks.filter((c) => !c.ok).length;
        return lead(
          id,
          "failed",
          `${blocked} dari ${live.health.checks.length} pemeriksaan belum oke. Perbaiki satu per satu di bawah.`,
        );
      }
      return lead(
        id,
        "active",
        "Semua pemeriksaan peralatan di komputer ini lolos. Siap dipakai.",
      );
    }
    case "activity": {
      const gitOk = live.activity.available;
      const gatesOk = live.gates.available;
      if (!gitOk && !gatesOk) {
        return lead(
          id,
          "failed",
          "Riwayat perubahan dan pemeriksaan berbagi tidak terbaca.",
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
            `${failed} pemeriksaan sebelum dibagikan belum lolos. Lihat tabel di bawah.`,
          );
        }
      }
      if (!gitOk || !gatesOk) {
        return lead(
          id,
          "attention",
          !gitOk
            ? "Riwayat perubahan belum lengkap; pemeriksaan berbagi tetap ditampilkan bila ada."
            : (live.gates.problem ??
                "Pemeriksaan berbagi belum lengkap; riwayat perubahan tetap ditampilkan."),
        );
      }
      return lead(
        id,
        "active",
        `${live.activity.recent.length} perubahan terbaru terbaca; pemeriksaan sebelum dibagikan lolos.`,
      );
    }
    case "governance": {
      return lead(
        id,
        "active",
        "Ini penjelasan tetap tentang tingkat bahaya — tidak berubah tiap detik. Keputusan besar tetap milik Anda.",
      );
    }
    case "knowledge": {
      if (!live.knowledge.available) {
        return lead(
          id,
          "failed",
          "Daftar buku aturan resmi tidak terbaca dari komputer ini.",
        );
      }
      return lead(
        id,
        "active",
        `${live.knowledge.documents.length} dokumen resmi tercatat.`,
      );
    }
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
