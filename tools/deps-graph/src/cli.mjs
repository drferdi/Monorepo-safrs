#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { detectCycle } from "./graph.mjs";
import { buildPackageGraph } from "./packages.mjs";
import { renderASCII, renderDOT, renderMermaid, renderSVG } from "./render.mjs";
import { loadWorkspaceMembers } from "./workspace.mjs";

const HELP = `Usage: node tools/deps-graph/src/cli.mjs [options]

Render the monorepo inter-package dependency graph.

Options:
  --format <dot|mermaid|ascii|svg>  Output format (default: ascii)
  --output <path>                   Write output to a file (default: stdout)
  --repo-root <path>                Repository root (default: cwd)
  --cycles                          Print detected cycles and exit non-zero
  --help                            Show this help
`;

function parseArgs(args) {
  const options = { format: "ascii", repoRoot: process.cwd(), cycles: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--format") {
      options.format = args[++i];
    } else if (arg === "--output") {
      options.output = args[++i];
    } else if (arg === "--repo-root") {
      options.repoRoot = args[++i];
    } else if (arg === "--cycles") {
      options.cycles = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[DEPS-GRAPH] ${error.message}\n\n${HELP}`);
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    console.log(HELP);
    return;
  }
  if (!["dot", "mermaid", "ascii", "svg"].includes(options.format)) {
    console.error(`[DEPS-GRAPH] Unknown format '${options.format}'.`);
    process.exitCode = 1;
    return;
  }

  const members = await loadWorkspaceMembers(options.repoRoot);
  const { nodes, edges } = await buildPackageGraph(options.repoRoot, members);
  const graph = {
    nodes: nodes.map((n) => n.name).sort(),
    edges,
  };

  const cycle = detectCycle(edges);
  if (cycle) {
    console.error(
      `[DEPS-GRAPH] Circular dependency detected: ${cycle.join(" -> ")}`,
    );
    if (options.cycles) process.exitCode = 1;
  } else if (options.cycles) {
    console.log("[DEPS-GRAPH] No circular dependencies detected.");
  }

  let output;
  switch (options.format) {
    case "dot":
      output = renderDOT(graph);
      break;
    case "mermaid":
      output = renderMermaid(graph);
      break;
    case "svg":
      output = (await renderSVG(graph)) ?? `${renderMermaid(graph)}\n`;
      break;
    default:
      output = renderASCII(graph);
  }

  if (options.output) {
    await writeFile(
      path.join(options.repoRoot, options.output),
      output,
      "utf8",
    );
    console.log(
      `[DEPS-GRAPH] Wrote ${options.format} graph to ${options.output}`,
    );
  } else {
    console.log(output);
  }
}

main().catch((error) => {
  console.error(`[DEPS-GRAPH] ${error.message}`);
  process.exitCode = 1;
});
