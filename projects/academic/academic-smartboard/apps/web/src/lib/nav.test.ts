import { describe, expect, it } from "vitest";
import { filterByRole, NAV_ITEMS } from "./nav";

describe("filterByRole", () => {
  it("owner melihat semua item sub-fase 1", () => {
    expect(filterByRole(NAV_ITEMS, "owner")).toHaveLength(NAV_ITEMS.length);
  });
  it("murid_ortu tidak melihat item tanpa role murid_ortu", () => {
    const visible = filterByRole(NAV_ITEMS, "murid_ortu");
    expect(visible.every((item) => item.roles.includes("murid_ortu"))).toBe(
      true,
    );
  });
});
