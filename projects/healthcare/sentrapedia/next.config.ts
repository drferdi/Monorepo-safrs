import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  // Loaded at runtime from node_modules (native ONNX binaries); never bundled.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
  // transformers.js loads onnxruntime-node through createRequire and sharp's addon needs its
  // libvips libraries, neither of which tracing follows; ship both for the platform that builds
  // (Linux x64 in Docker).
  outputFileTracingIncludes: {
    "/api/mira": [
      "./node_modules/onnxruntime-node/package.json",
      "./node_modules/onnxruntime-node/dist/**",
      `./node_modules/onnxruntime-node/bin/napi-v6/${process.platform}/${process.arch}/**`,
      "./node_modules/onnxruntime-common/**",
      `./node_modules/@img/sharp-*${process.platform}-${process.arch}/**`,
    ],
  },
  turbopack: { root: process.cwd() },
  devIndicators: false,
};

export default config;
