export type Role =
  | "owner"
  | "admin_akademik"
  | "tentor"
  | "murid_ortu"
  | "finance"
  | "content_manager";

export type NavItem = { label: string; href: string; roles: Role[] };

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Murid",
    href: "/master/murid",
    roles: ["owner", "admin_akademik", "tentor", "murid_ortu"],
  },
];

export function filterByRole(items: NavItem[], role: Role): NavItem[] {
  return items.filter((item) => item.roles.includes(role));
}
