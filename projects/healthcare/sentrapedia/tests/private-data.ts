import { existsSync } from "node:fs";
import { theOracleSample } from "../src/lib/theoracle";

// Public code, private data (2026-10-19): the public repository carries the fictional sample catalogue and no TheOracle
// index, so tests that read the real catalogue or index skip there and run wherever the private data is installed.
export const withCatalog = !theOracleSample;
export const withIndex = existsSync("theoracle/index/manifest.json") && existsSync("theoracle/index/vectors.f32");
