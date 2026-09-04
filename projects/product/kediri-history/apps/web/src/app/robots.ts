import type { MetadataRoute } from "next";

import { SITE_URL } from "../site";

/**
 * Konten sejarah publik terbuka penuh untuk crawler. Yang ditutup hanya
 * permukaan yang memang bukan halaman publik: admin Payload dan route API
 * (termasuk jalur pratinjau editorial, yang berada di bawah `/api/`).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
