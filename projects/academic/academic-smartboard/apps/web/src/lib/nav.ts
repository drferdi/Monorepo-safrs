export type Role =
  | "owner"
  | "admin_akademik"
  | "tentor"
  | "murid_ortu"
  | "finance"
  | "content_manager";

export type NavItem = { label: string; href: string; roles: Role[] };

export type NavGroup = { label: string; items: NavItem[] };

const ALL_ROLES: Role[] = [
  "owner",
  "admin_akademik",
  "tentor",
  "murid_ortu",
  "finance",
  "content_manager",
];

/** Nav arsip Layout.jsx — diperluas sub-fase 4 (Utama, master sisa, laporan). */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Utama",
    items: [
      {
        label: "Smartboard",
        href: "/dashboard",
        roles: ALL_ROLES,
      },
      {
        label: "Pengumuman",
        href: "/pengumuman",
        roles: ALL_ROLES,
      },
      {
        label: "Tutorial",
        href: "/tutorial",
        roles: ALL_ROLES,
      },
    ],
  },
  {
    label: "Master Data",
    items: [
      {
        label: "Murid",
        href: "/master/murid",
        roles: ["owner", "admin_akademik", "tentor", "murid_ortu"],
      },
      {
        label: "Pengajar",
        href: "/pengajar",
        roles: ["owner", "admin_akademik"],
      },
      {
        label: "TIM",
        href: "/master/tim",
        roles: ["owner", "admin_akademik"],
      },
      {
        label: "Orang Tua",
        href: "/master/orang-tua",
        roles: ["owner", "admin_akademik"],
      },
      {
        label: "Sekolah",
        href: "/master/sekolah",
        roles: ["owner", "admin_akademik"],
      },
      {
        label: "Mata Pelajaran",
        href: "/master/mata-pelajaran",
        roles: ["owner", "admin_akademik"],
      },
      {
        label: "Jenjang / Kelas",
        href: "/master/jenjang",
        roles: ["owner", "admin_akademik"],
      },
      {
        label: "Tahun Ajaran",
        href: "/master/tahun-ajaran",
        roles: ["owner", "admin_akademik"],
      },
    ],
  },
  {
    label: "Operasional",
    items: [
      {
        label: "Kalender & Jadwal",
        href: "/jadwal",
        roles: ["owner", "admin_akademik", "tentor"],
      },
      {
        label: "Sesi Pembelajaran",
        href: "/sesi",
        roles: ["owner", "admin_akademik", "tentor", "murid_ortu", "finance"],
      },
      {
        label: "Percakapan",
        href: "/komunikasi",
        roles: ["owner", "admin_akademik", "tentor", "murid_ortu", "finance"],
      },
    ],
  },
  {
    label: "Akademik",
    items: [
      {
        label: "Evaluasi Murid",
        href: "/evaluasi",
        roles: ["owner", "admin_akademik", "tentor", "murid_ortu"],
      },
      {
        label: "Perkembangan Murid",
        href: "/akademik/perkembangan",
        roles: ["owner", "admin_akademik", "tentor", "murid_ortu"],
      },
      {
        label: "Kurikulum Nasional",
        href: "/akademik/kurikulum",
        roles: ALL_ROLES,
      },
      {
        label: "Keselarasan Kurikulum",
        href: "/akademik/keselarasan",
        roles: ALL_ROLES,
      },
      {
        label: "Cakupan Kurikulum",
        href: "/akademik/cakupan",
        roles: ["owner", "admin_akademik", "tentor"],
      },
    ],
  },
  {
    label: "Pengajar",
    items: [
      {
        label: "Task & Rutinitas",
        href: "/tasks",
        roles: ["owner", "admin_akademik", "tentor"],
      },
      {
        label: "Pengajuan Lembur",
        href: "/lembur",
        roles: ["owner", "admin_akademik", "tentor", "finance"],
      },
    ],
  },
  {
    label: "Keuangan",
    items: [
      {
        label: "Rekap Honor",
        href: "/keuangan/honor",
        roles: ["owner", "finance", "tentor"],
      },
      {
        label: "Payroll",
        href: "/keuangan/payroll",
        roles: ["owner", "finance"],
      },
      {
        label: "Pembayaran",
        href: "/keuangan/pembayaran",
        roles: ["owner", "finance"],
      },
      {
        label: "Tarif",
        href: "/keuangan/tarif",
        roles: ["owner", "finance"],
      },
    ],
  },
  {
    label: "Laporan",
    items: [
      {
        label: "Laporan Terpadu",
        href: "/laporan",
        roles: ["owner", "admin_akademik", "finance"],
      },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      {
        label: "Hak Akses",
        href: "/pengaturan/hak-akses",
        roles: ["owner"],
      },
      {
        label: "Directory Tutor",
        href: "/pengaturan/directory-tutor",
        roles: ["owner", "admin_akademik"],
      },
      {
        label: "Persetujuan",
        href: "/persetujuan",
        roles: ["owner"],
      },
      {
        label: "Template Evaluasi",
        href: "/pengaturan/template-evaluasi",
        roles: ["owner", "admin_akademik", "content_manager"],
      },
      {
        label: "Audit Log",
        href: "/pengaturan/audit",
        roles: ["owner", "admin_akademik", "finance"],
      },
    ],
  },
];

export function flattenNav(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

export const NAV_ITEMS: NavItem[] = flattenNav(NAV_GROUPS);

export function filterByRole(items: NavItem[], role: Role): NavItem[] {
  return items.filter((item) => item.roles.includes(role));
}
