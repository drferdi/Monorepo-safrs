import type { NextConfig } from "next";

// Build-time environment validation (Feature #2): importing the shared server
// environment here makes `next build` fail fast with an explicit error when a
// required variable is missing, instead of crashing at first request in
// production. Runtime code paths still consume the same validated object.
import "@safrs/env/server";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  experimental: {
    useTypeScriptCli: true,
  },
  transpilePackages: [
    "@safrs/api",
    "@safrs/database",
    "@safrs/env",
    "@safrs/schemas",
    "@safrs/ui",
    "@sentra/token",
  ],
  typedRoutes: true,
};

export default nextConfig;
