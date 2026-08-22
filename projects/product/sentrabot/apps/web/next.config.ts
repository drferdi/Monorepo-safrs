import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const capsuleRoot = path.join(webRoot, "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@safrs/schemas", "@sentra/token"],
  typedRoutes: true,
  trailingSlash: true,
  outputFileTracingRoot: path.join(webRoot, "../../../.."),
  turbopack: {
    root: path.join(webRoot, "../../../.."),
  },
  experimental: {
    externalDir: true,
  },
  // Allow imports from capsule src/personas
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@sentrabot/personas": path.join(capsuleRoot, "src/personas/index.ts"),
    };
    return config;
  },
};

export default nextConfig;
