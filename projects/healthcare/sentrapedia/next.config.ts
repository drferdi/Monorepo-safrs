import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    "/api/mira": ["./oracle-ii/sentra_clinical_core_source_reparsed.sqlite"],
  },
  turbopack: { root: process.cwd() },
  devIndicators: false,
};

export default config;
