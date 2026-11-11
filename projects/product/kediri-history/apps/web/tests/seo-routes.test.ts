import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/content/queries", () => ({
  listArtifacts: async () => [{ slug: "prasasti-hantang" }],
  listEventsChronologically: async () => [{ slug: "hantang" }],
  listPeople: async () => [{ slug: "jayabaya" }],
  listPlaces: async () => [{ slug: "brantas" }],
}));

import manifest from "../src/app/manifest";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import {
  resolveSiteUrl,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SITE_URL,
  siteUrl,
} from "../src/site";

describe("public SEO routes", () => {
  it("menerbitkan halaman publik dan catatan arsip terbit di sitemap", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        SITE_URL,
        `${SITE_URL}/journey`,
        `${SITE_URL}/archive`,
        `${SITE_URL}/explore`,
        `${SITE_URL}/archive/events/hantang`,
        `${SITE_URL}/archive/people/jayabaya`,
        `${SITE_URL}/archive/places/brantas`,
        `${SITE_URL}/archive/objects/prasasti-hantang`,
      ]),
    );
  });

  it("membuka halaman publik dan menunjuk sitemap untuk crawler", () => {
    const policy = robots();

    expect(policy.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(policy.rules).toEqual(
      expect.objectContaining({
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      }),
    );
  });

  /*
   * URL kanonis pernah ditulis ulang di tiga berkas dan mulai menyimpang.
   * Tes ini mengunci satu sumbernya: robots, sitemap, dan metadata harus
   * memakai asal yang SAMA, dan tidak satu pun boleh menyebut host pratinjau.
   */
  it("memakai satu asal kanonis untuk robots dan sitemap", async () => {
    const origins = new Set([
      new URL(siteUrl("/")).origin,
      new URL(robots().sitemap as string).origin,
      ...(await sitemap()).map((entry) => new URL(entry.url).origin),
    ]);

    expect([...origins]).toEqual([SITE_URL]);
    expect(SITE_URL.endsWith("/")).toBe(false);
    expect(SITE_URL.startsWith("https://")).toBe(true);
  });

  /*
   * Build produksi pernah menerbitkan `canonical` dan `og:image` yang menunjuk
   * `http://127.0.0.1:4320`, karena `.env.local` capsule ini memang menyetel
   * origin itu dan nilainya terpanggang saat build. Kegagalannya senyap —
   * tautan tetap terkirim, hanya tidak pernah terindeks. Ini gerbangnya.
   */
  it("tidak pernah memakai origin lokal sebagai kanonis produksi", () => {
    for (const local of [
      "http://127.0.0.1:4320",
      "http://localhost:3000",
      "http://0.0.0.0:8080",
    ]) {
      expect(resolveSiteUrl(local, "production")).toBe(
        "https://kediri.sentrahai.com",
      );
      // Pengembangan tetap boleh menunjuk mesin sendiri.
      expect(resolveSiteUrl(local, "development")).toBe(local);
    }
  });

  it("menghormati host publik yang disetel operator dan menolak nilai rusak", () => {
    expect(
      resolveSiteUrl("https://kings-century.vercel.app", "production"),
    ).toBe("https://kings-century.vercel.app");
    expect(resolveSiteUrl("https://kediri.example/", "production")).toBe(
      "https://kediri.example",
    );
    expect(resolveSiteUrl("bukan-url", "production")).toBe(
      "https://kediri.sentrahai.com",
    );
    expect(resolveSiteUrl(undefined, "production")).toBe(
      "https://kediri.sentrahai.com",
    );
  });

  it("menyajikan manifest yang dapat dipasang dengan warna dari token", () => {
    const app = manifest();

    expect(app).toEqual(
      expect.objectContaining({
        short_name: "Kediri",
        start_url: "/",
        display: "standalone",
        description: SITE_DESCRIPTION,
      }),
    );
    // Warna diambil dari snapshot token, bukan ditulis ulang di manifest.
    expect(app.background_color).toMatch(/^#[0-9A-Fa-f]{6}$/u);
    expect(app.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/u);
    // Dua ukuran PNG adalah minimum yang membuat aplikasi dapat dipasang.
    const sizes = (app.icons ?? []).map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  });

  /*
   * Pratinjau sosial gagal diam-diam: tautan tetap terkirim, hanya kartunya
   * kosong. Ukuran dan tipe karena itu dikunci di sini, bukan dipercaya.
   */
  it("menjaga citra Open Graph tetap seukuran kartu besar", () => {
    expect(SITE_OG_IMAGE.width).toBe(1200);
    expect(SITE_OG_IMAGE.height).toBe(630);
    expect(SITE_OG_IMAGE.type).toBe("image/jpeg");
    expect(SITE_OG_IMAGE.alt.length).toBeGreaterThan(20);
  });

  it("menjaga judul dan deskripsi tetap dalam panjang yang terpakai mesin pencari", () => {
    expect(SITE_TITLE.length).toBeLessThanOrEqual(60);
    expect(SITE_DESCRIPTION.length).toBeGreaterThanOrEqual(140);
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(170);
  });

  /*
   * Layout publik SENGAJA tidak mewariskan kanonis: kanonis yang diwariskan
   * membuat halaman yang lupa menyatakannya mengaku sebagai beranda, dan
   * kegagalan itu tidak terlihat sampai mesin pencari membuang halamannya.
   * Harganya, setiap halaman wajib menyatakan kanonisnya sendiri — dan
   * prosa tidak menjaga kewajiban itu, berkas inilah yang menjaganya.
   */
  it("setiap halaman publik menyatakan kanonisnya sendiri", () => {
    const publicDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../src/app/(public)",
    );

    const pages: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const target = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(target);
        else if (entry.name === "page.tsx") pages.push(target);
      }
    };
    walk(publicDir);

    const missing = pages
      .filter((file) => !readFileSync(file, "utf8").includes("canonical"))
      .map((file) => path.relative(publicDir, file));

    expect(pages.length).toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });

  it("tidak mewariskan kanonis dari layout publik", () => {
    const layout = readFileSync(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../src/app/(public)/layout.tsx",
      ),
      "utf8",
    );

    expect(layout).not.toMatch(/alternates\s*:/u);
  });
});
