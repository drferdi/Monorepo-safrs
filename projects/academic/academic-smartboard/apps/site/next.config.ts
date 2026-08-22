import type { NextConfig } from "next";

// Sengaja TANPA import "@safrs/env/server": static export tidak punya env server
// (rasional sama dengan projects/internal/control-center/apps/web/next.config.ts).
// TANPA cacheComponents: fitur server-side, salah untuk output "export".
const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@sentra/token"],
  typedRoutes: true,
  images: { unoptimized: true },
  // out/<route>/index.html per route (bukan out/<route>.html) — lebih ramah
  // untuk static host mana pun dan konsisten dengan tests/build-output.test.mjs.
  trailingSlash: true,
};

export default nextConfig;
