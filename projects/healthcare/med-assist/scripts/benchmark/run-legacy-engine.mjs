#!/usr/bin/env node
// Gate 1 benchmark export: runs the legacy diagnosis engine on every case file in --cases
// (format of mira-system/assist/cases/*.json) and writes one EngineResult per case to --out.
//
//   node scripts/benchmark/run-legacy-engine.mjs --cases <folder> --out <folder>
//
// Real cases are de-identified and kept outside the repository; the output folder must be
// outside the capsule too (the runner refuses otherwise). The run uses the legacy engine's
// Node runtime from lib/diagnosis-engine/testing/ (no OpenAI key, so KB-only and deterministic).

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const capsuleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : undefined;
}

const casesDir = readArg('--cases');
const outDir = readArg('--out');
if (!casesDir || !outDir) {
  console.error(
    'Usage: node scripts/benchmark/run-legacy-engine.mjs --cases <folder> --out <folder>'
  );
  process.exit(2);
}

const result = spawnSync(
  process.execPath,
  [
    resolve(capsuleRoot, 'scripts', 'pnpm.mjs'),
    'exec',
    'vitest',
    'run',
    'lib/diagnosis-engine/benchmark/legacy-benchmark.test.ts',
    '-t',
    'benchmark-run',
  ],
  {
    cwd: capsuleRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      BENCHMARK_CASES_DIR: resolve(casesDir),
      BENCHMARK_OUT_DIR: resolve(outDir),
    },
  }
);
process.exit(result.status ?? 1);
