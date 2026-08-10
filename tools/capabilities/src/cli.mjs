#!/usr/bin/env node
import { stderr, stdout } from "node:process";
import { applyCapability, capabilityPreview } from "./catalog.mjs";

function parseArgs(args) {
  const options = { repoRoot: process.cwd(), mode: "preview" };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--preview") options.mode = "preview";
    else if (argument === "--apply") options.mode = "apply";
    else if (
      [
        "--capability",
        "--project",
        "--repo-root",
        "--confirm",
        "--justification",
      ].includes(argument)
    ) {
      const value = args[index + 1];
      if (!value || value.startsWith("--"))
        throw new Error(`${argument} requires a value.`);
      options[
        argument
          .slice(2)
          .replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase())
      ] = value;
      index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.capability || !options.project)
    throw new Error("--capability and --project are required.");
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const preview = await capabilityPreview({
    capabilityId: options.capability,
    project: options.project,
    repoRoot: options.repoRoot,
  });
  stdout.write(`${preview}\n`);
  if (options.mode === "preview") return;
  await applyCapability({
    capabilityId: options.capability,
    project: options.project,
    repoRoot: options.repoRoot,
    confirmation: options.confirm,
    justification: options.justification,
  });
  stdout.write(`Recorded: projects/${options.project}/capabilities.json\n`);
}

try {
  await main();
} catch (error) {
  stderr.write(`Error: ${error.message}\n`);
  process.exitCode = 1;
}
