import type { MetadataRoute } from "next";

import kediriTokens from "../modules/design-system/tokens/kediri.json";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME } from "../site";

/**
 * Web App Manifest, disajikan di `/manifest.webmanifest`; Next menyisipkan
 * `<link rel="manifest">` sendiri.
 *
 * Warnanya DIBACA dari snapshot token, bukan ditulis ulang di sini. Dua alasan:
 * layar pembuka aplikasi terpasang harus memakai kanvas sinematik yang sama
 * dengan situsnya, dan gerbang token menolak nilai warna mentah di luar
 * direktori token.
 */
const BACKGROUND = kediriTokens.cinemaDark["--cinema-canvas"].resolved;
const THEME = kediriTokens.primitive["--kediri-civic-gold"].value;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BACKGROUND,
    theme_color: THEME,
    lang: "id",
    icons: [
      { src: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
