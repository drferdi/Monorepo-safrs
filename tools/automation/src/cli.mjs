#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writeForm } from "./canonical-json.mjs";
import { compileTaskContract, loadCompileContext } from "./contracts.mjs";

/**
 * Minimal `saf` entry point. Phase 2 exposes contract compilation only;
 * later phases add lease, run, publish, and status commands. Root
 * package.json wiring is deferred until the stale claim on that file is
 * released — invoke as: node tools/automation/src/cli.mjs <command>.
 */

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

function usage() {
  console.log(
    [
      "Usage:",
      "  node tools/automation/src/cli.mjs contract compile <input.json> [--write <output.json>]",
    ].join("\n"),
  );
  return 2;
}

function main(argv) {
  const [domain, action, inputPath, ...rest] = argv;
  if (domain !== "contract" || action !== "compile" || !inputPath) {
    return usage();
  }
  const input = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
  const context = loadCompileContext(repositoryRoot);
  const { contract, contractDigest } = compileTaskContract(input, context);
  if (rest.length === 0) {
    console.log(JSON.stringify(contract, null, 2));
    return 0;
  }
  if (rest.length !== 2 || rest[0] !== "--write" || !rest[1]) {
    return usage();
  }
  writeFileSync(resolve(rest[1]), writeForm(contract), "utf8");
  console.log(`${contractDigest}  ${rest[1]}`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
