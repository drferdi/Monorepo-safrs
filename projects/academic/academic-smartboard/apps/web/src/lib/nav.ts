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

/** Nav arsip Layout.jsx — Operasional + Akademik (+ Master dari sub-fase 1). */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Master",
    items: [
      {
        label: "Murid",
        href: "/master/murid",
        roles: ["owner", "admin_akademik", "tentor", "murid_ortu"],
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
];

export function flattenNav(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

/** Flat list for AppShell / filterByRole — sub-fase 1 + 2. */
export const NAV_ITEMS: NavItem[] = flattenNav(NAV_GROUPS);

export function filterByRole(items: NavItem[], role: Role): NavItem[] {
  return items.filter((item) => item.roles.includes(role));
}
