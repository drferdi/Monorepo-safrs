import type { NextConfig } from "next";

// Sengaja TANPA import "@safrs/env/server": static export tidak punya env
// server (Keputusan terbuka #1 — arsip adalah SPA client-only, apps/web
// mengikuti pola sama seperti apps/site).
const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@sentra/token"],
  typedRoutes: true,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
