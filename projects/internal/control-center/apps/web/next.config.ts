import type { NextConfig } from "next";

/**
 * The Control Center deliberately does not import `@safrs/env/server`.
 *
 * Golden Path validates the server environment at build time because it cannot
 * function without a database. This dashboard has the opposite requirement: it
 * must start and render even when nothing else on the machine is ready, because
 * diagnosing exactly that situation is its job. Missing prerequisites are shown
 * as observed status, not raised as a build failure.
 */
const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: true,
  },
  transpilePackages: ["@sentra/token"],
  typedRoutes: true,
};

export default nextConfig;
