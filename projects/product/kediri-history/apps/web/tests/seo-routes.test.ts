import { describe, expect, it } from "vitest";

import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";

const SITE_URL = "https://kediri.sentrahai.com";

describe("public SEO routes", () => {
  it("menerbitkan halaman publik utama di sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        SITE_URL,
        `${SITE_URL}/journey`,
        `${SITE_URL}/archive`,
        `${SITE_URL}/explore`,
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
});
