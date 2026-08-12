#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderClientModule } from "./client.mjs";
import { renderMockModule } from "./mock.mjs";
import { buildOpenApiDocument } from "./openapi.mjs";
import { importSchemas } from "./schemas.mjs";

const HELP = `Usage: node tools/codegen/src/cli.mjs [options]

Generate artifacts from the Zod schemas in @safrs/schemas.

Options:
  --schema <path>     Entry module exporting Zod schemas (default packages/schemas/src/index.ts)
  --out <dir>         Output directory (default codegen)
  --openapi           Write openapi.json
  --mock              Write mock.js
  --client            Write client.ts
  --title <text>      OpenAPI title
  --version <ver>     OpenAPI version
  --help              Show this help
`;

function parseArgs(args) {
  const options = {
    schema: "packages/schemas/src/index.ts",
    out: "codegen",
    title: "SAFRS Schema API",
    version: "0.0.0",
    openapi: false,
    mock: false,
    client: false,
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--schema") options.schema = args[++i];
    else if (arg === "--out") options.out = args[++i];
    else if (arg === "--title") options.title = args[++i];
    else if (arg === "--version") options.version = args[++i];
    else if (arg === "--openapi") options.openapi = true;
    else if (arg === "--mock") options.mock = true;
    else if (arg === "--client") options.client = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.openapi && !options.mock && !options.client) {
    options.openapi = options.mock = options.client = true;
  }
  return options;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[CODEGEN] ${error.message}\n\n${HELP}`);
    process.exitCode = 1;
    return;
  }
  if (options.help) {
    console.log(HELP);
    return;
  }

  const schemaPath = path.resolve(process.cwd(), options.schema);
  const schemas = await importSchemas(pathToFileURL(schemaPath).href);
  if (schemas.length === 0) {
    console.error(`[CODEGEN] No Zod schemas exported by ${options.schema}`);
    process.exitCode = 1;
    return;
  }

  const outDir = path.resolve(process.cwd(), options.out);
  await mkdir(outDir, { recursive: true });

  if (options.openapi) {
    const doc = buildOpenApiDocument(schemas, {
      title: options.title,
      version: options.version,
    });
    await writeFile(
      path.join(outDir, "openapi.json"),
      JSON.stringify(doc, null, 2),
      "utf8",
    );
    console.log(`[CODEGEN] wrote ${path.join(options.out, "openapi.json")}`);
  }

  if (options.mock) {
    await writeFile(
      path.join(outDir, "mock.js"),
      renderMockModule(schemas),
      "utf8",
    );
    console.log(`[CODEGEN] wrote ${path.join(options.out, "mock.js")}`);
  }

  if (options.client) {
    await writeFile(
      path.join(outDir, "client.ts"),
      renderClientModule(),
      "utf8",
    );
    console.log(`[CODEGEN] wrote ${path.join(options.out, "client.ts")}`);
  }
}

main().catch((error) => {
  console.error(`[CODEGEN] ${error.message}`);
  process.exitCode = 1;
});
