import { describe, expect, it } from "vitest";
import { allPages, NAV_ITEMS } from "./index.ts";

const routes = () =>
  new Set(allPages.map((p) => (p.slug === "" ? "/" : `/${p.slug}`)));

describe("modul konten", () => {
  it("10 halaman, slug unik, field wajib terisi", () => {
    expect(allPages).toHaveLength(10);
    expect(new Set(allPages.map((p) => p.slug)).size).toBe(10);
    for (const p of allPages) {
      expect(p.title.length, p.slug).toBeGreaterThan(0);
      expect(p.description.length, p.slug).toBeGreaterThan(0);
      expect(p.hero.heading.length, p.slug).toBeGreaterThan(0);
    }
  });
  it("semua href internal (nav + cta) menunjuk route yang ada", () => {
    const known = routes();
    const hrefs = [
      ...NAV_ITEMS.map((n) => n.href),
      ...allPages.flatMap((p) => (p.hero.cta ? [p.hero.cta.href] : [])),
    ].filter((h) => h.startsWith("/"));
    for (const h of hrefs) expect(known.has(h), h).toBe(true);
  });
});
