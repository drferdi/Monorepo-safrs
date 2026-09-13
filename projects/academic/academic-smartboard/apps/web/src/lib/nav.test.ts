import { describe, expect, it } from "vitest";
import { filterByRole, NAV_GROUPS, NAV_ITEMS, flattenNav } from "./nav";

describe("filterByRole", () => {
  it("owner melihat semua item", () => {
    expect(filterByRole(NAV_ITEMS, "owner")).toHaveLength(NAV_ITEMS.length);
  });

  it("murid_ortu tidak melihat item tanpa role murid_ortu", () => {
    const visible = filterByRole(NAV_ITEMS, "murid_ortu");
    expect(visible.every((item) => item.roles.includes("murid_ortu"))).toBe(
      true,
    );
  });
});

describe("NAV_GROUPS sub-fase 2+3", () => {
  it("berisi grup Master, Operasional, Akademik, Pengajar, Keuangan", () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual([
      "Master",
      "Operasional",
      "Akademik",
      "Pengajar",
      "Keuangan",
    ]);
  });

  it("jadwal hanya untuk owner/admin_akademik/tentor", () => {
    const jadwal = flattenNav(NAV_GROUPS).find((i) => i.href === "/jadwal");
    expect(jadwal?.roles).toEqual(["owner", "admin_akademik", "tentor"]);
  });

  it("filterByRole: finance melihat kurikulum dan payroll, tidak melihat jadwal", () => {
    const finance = filterByRole(NAV_ITEMS, "finance");
    expect(finance.some((i) => i.href === "/akademik/kurikulum")).toBe(true);
    expect(finance.some((i) => i.href === "/keuangan/payroll")).toBe(true);
    expect(finance.some((i) => i.href === "/jadwal")).toBe(false);
  });

  it("tentor melihat rekap honor dan lembur, tidak payroll", () => {
    const tentor = filterByRole(NAV_ITEMS, "tentor");
    expect(tentor.some((i) => i.href === "/keuangan/honor")).toBe(true);
    expect(tentor.some((i) => i.href === "/lembur")).toBe(true);
    expect(tentor.some((i) => i.href === "/keuangan/payroll")).toBe(false);
  });
});
