#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ContractError } from "./contract.mjs";
import { statusCapsules, verifyCapsule } from "./verify.mjs";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(sourceDirectory, "../../..");
const defaultChecker = path.join(
  defaultRoot,
  "tools",
  "safrs",
  "check_project_independence.py",
);

function usage() {
  return [
    "Usage:",
    "  node tools/project-standalone/src/cli.mjs status [domain/capsule]",
    "  node tools/project-standalone/src/cli.mjs verify <domain/capsule>",
  ].join("\n");
}

function parseArguments(args) {
  const [command, selector, ...extra] = args;
  if (extra.length || !new Set(["status", "verify"]).has(command)) {
    throw new ContractError(usage());
  }
  if (command === "verify" && !selector) {
    throw new ContractError(`verify requires a capsule selector.\n${usage()}`);
  }
  return { command, selector };
}

function formatStatus(results) {
  if (!results.length) return "No active project capsules.";
  return results
    .map((result) =>
      [
        `CAPSULE ${result.id}`,
        `  contract: PASS (${result.risk})`,
        `  runtime: ${result.runtime}`,
        `  structural: ${result.structural}`,
      ].join("\n"),
    )
    .join("\n");
}

function formatVerification(result) {
  return [
    `CAPSULE ${result.id}`,
    `  extraction: ${result.extraction}`,
    ...result.stages.map(
      (stage) =>
        `  ${stage.name}: ${stage.status}${stage.detail ? ` — ${stage.detail}` : ""}`,
    ),
    `RESULT ${result.ok && result.extractedRemoved ? "PASS" : "FAIL"}`,
  ].join("\n");
}

export async function runCli(
  args,
  {
    root = defaultRoot,
    checkerPath = defaultChecker,
    stdout = process.stdout,
  } = {},
) {
  const { command, selector } = parseArguments(args);
  if (command === "status") {
    const results = await statusCapsules({ root, selector, checkerPath });
    stdout.write(`${formatStatus(results)}\n`);
    return 0;
  }
  const result = await verifyCapsule({ root, selector, checkerPath });
  stdout.write(`${formatVerification(result)}\n`);
  return 0;
}

async function main() {
  try {
    process.exitCode = await runCli(process.argv.slice(2));
  } catch (error) {
    if (error.result)
      process.stderr.write(`${formatVerification(error.result)}\n`);
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = error instanceof ContractError ? 2 : 1;
  }
}

if (import.meta.main) await main();
