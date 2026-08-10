#!/usr/bin/env node
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { stderr, stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { normalizeProjectAnswers } from "./model.mjs";
import { renderProjectCapsule } from "./render.mjs";

function parseArgs(args) {
  const options = { repoRoot: process.cwd() };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
    } else if (argument === "--preview" || argument === "--apply") {
      if (options.mode)
        throw new Error("Use only one of --preview or --apply.");
      options.mode = argument.slice(2);
    } else if (
      argument === "--input" ||
      argument === "--repo-root" ||
      argument === "--confirm"
    ) {
      const value = args[index + 1];
      if (!value || value.startsWith("--"))
        throw new Error(`${argument} requires a value.`);
      options[
        argument
          .slice(2)
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      ] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

async function realDirectory(directory, label) {
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(`${label} must be a real directory, not a symbolic link.`);
  }
  return path.resolve(directory);
}

async function loadInput(inputPath) {
  const source = await readFile(path.resolve(inputPath), "utf8");
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Input JSON must be an object.");
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error(`Input JSON is invalid: ${error.message}`);
    throw error;
  }
}

async function askForInput() {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const name = await prompt.question("Nama proyek: ");
    const problem = await prompt.question("Masalah yang diselesaikan: ");
    const kind = await prompt.question("Jenis (web/desktop/extension): ");
    const capabilities = await prompt.question(
      "Kemampuan (pisahkan dengan koma, atau kosong): ",
    );
    const sensitiveDomains = await prompt.question(
      "Domain sensitif (pisahkan dengan koma, atau kosong): ",
    );
    return {
      name,
      problem,
      kind,
      capabilities: capabilities.trim()
        ? capabilities.split(",").map((item) => item.trim())
        : [],
      sensitiveDomains: sensitiveDomains.trim()
        ? sensitiveDomains.split(",").map((item) => item.trim())
        : [],
    };
  } finally {
    prompt.close();
  }
}

export function previewText(model, files) {
  const destination = `projects/${model.slug}`;
  return [
    "Pratinjau kapsul proyek SAFRS",
    `Destination: ${destination}`,
    `App binding: ${model.appBinding}`,
    `Capabilities: ${model.capabilities.length ? model.capabilities.join(", ") : "none"}`,
    `Sensitive domains: ${model.sensitiveDomains.length ? model.sensitiveDomains.join(", ") : "none"}`,
    `Computed risk: ${model.risk}`,
    "Files:",
    ...files.map((file) => `- ${destination}/${file.relativePath}`),
  ].join("\n");
}

async function destinationExists(destination) {
  try {
    await lstat(destination);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

export async function applyProjectCapsule(files, projectsRoot, slug) {
  const destination = path.resolve(projectsRoot, slug);
  if (!destination.startsWith(`${projectsRoot}${path.sep}`)) {
    throw new Error("Project destination escapes the projects directory.");
  }
  if (await destinationExists(destination)) {
    throw new Error(`Destination already exists: projects/${slug}`);
  }

  const staging = await mkdtemp(path.join(projectsRoot, `.${slug}-stage-`));
  let moved = false;
  try {
    for (const file of files) {
      const target = path.resolve(staging, file.relativePath);
      if (!target.startsWith(`${staging}${path.sep}`))
        throw new Error("Rendered file escapes staging.");
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.content, { encoding: "utf8", flag: "wx" });
    }
    await rename(staging, destination);
    moved = true;
  } finally {
    if (!moved) await rm(staging, { recursive: true, force: true });
  }
}

async function interactiveConfirmation(slug) {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    return await prompt.question(
      `Ketik CREATE ${slug} untuk membuat kapsul, atau tekan Enter untuk batal: `,
    );
  } finally {
    prompt.close();
  }
}

export async function run(options) {
  const repoRoot = await realDirectory(options.repoRoot, "Repository root");
  const projectsRoot = await realDirectory(
    path.join(repoRoot, "projects"),
    "projects directory",
  );
  const templateRoot = path.join(projectsRoot, "_template");
  const rawInput = options.input
    ? await loadInput(options.input)
    : await askForInput();
  const model = normalizeProjectAnswers(rawInput);
  const files = renderProjectCapsule(model, templateRoot);

  stdout.write(`${previewText(model, files)}\n`);
  if (options.mode === "preview" || (!options.mode && options.input)) return 0;

  const confirmation =
    options.confirm ??
    rawInput.confirmation ??
    (options.input ? undefined : await interactiveConfirmation(model.slug));
  if (confirmation !== `CREATE ${model.slug}`) {
    throw new Error(
      `Confirmation must exactly equal CREATE ${model.slug}. No files were written.`,
    );
  }
  await applyProjectCapsule(files, projectsRoot, model.slug);
  stdout.write(`Created: projects/${model.slug}\n`);
  return 0;
}

async function main() {
  try {
    process.exitCode = await run(parseArgs(process.argv.slice(2)));
  } catch (error) {
    stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.main) await main();
