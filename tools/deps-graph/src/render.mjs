/**
 * Renders for the dependency graph. All renderers take the same graph shape
 * ({ nodes: string[], edges: Map<string, Set<string>> }) and return a string.
 */

/**
 * @param {{nodes: string[], edges: Map<string, Set<string>>}} graph
 * @returns {string} Graphviz DOT source
 */
export function renderDOT(graph) {
  const lines = ["digraph deps {"];
  for (const node of graph.nodes) {
    const label = node.replaceAll('"', '\\"');
    lines.push(`  "${label}";`);
  }
  for (const [from, deps] of graph.edges) {
    for (const to of deps) {
      lines.push(
        `  "${from.replaceAll('"', '\\"')}" -> "${to.replaceAll('"', '\\"')}";`,
      );
    }
  }
  lines.push("}");
  return lines.join("\n");
}

/**
 * @param {{nodes: string[], edges: Map<string, Set<string>>}} graph
 * @returns {string} Mermaid flowchart source
 */
export function renderMermaid(graph) {
  const lines = ["flowchart LR"];
  for (const node of graph.nodes) {
    lines.push(`  "${node}"`);
  }
  for (const [from, deps] of graph.edges) {
    for (const to of deps) {
      lines.push(`  "${from}" --> "${to}"`);
    }
  }
  return lines.join("\n");
}

/**
 * ASCII-art renderer: one line per dependency edge, grouped by source.
 * Deterministic and dependency-free.
 *
 * @param {{nodes: string[], edges: Map<string, Set<string>>}} graph
 * @returns {string}
 */
export function renderASCII(graph) {
  const lines = [];
  for (const node of graph.nodes) {
    const deps = graph.edges.get(node) ?? new Set();
    if (deps.size === 0) {
      lines.push(`${node}  (no workspace deps)`);
      continue;
    }
    lines.push(`${node}`);
    for (const to of [...deps].sort()) {
      lines.push(`  \u2514\u2500 ${to}`);
    }
  }
  return lines.join("\n");
}

/**
 * Render an SVG by shelling out to the Graphviz `dot` binary when available.
 * Returns null if `dot` is not installed (the CLI may then fall back).
 *
 * @param {{nodes: string[], edges: Map<string, Set<string>>}} graph
 * @returns {Promise<string|null>}
 */
export async function renderSVG(graph) {
  const { spawn } = await import("node:child_process");
  const source = renderDOT(graph);
  return new Promise((resolve) => {
    const dot = spawn("dot", ["-Tsvg"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    dot.stdout.on("data", (d) => (stdout += d));
    dot.stderr.on("data", (d) => (stderr += d));
    dot.on("error", () => resolve(null));
    dot.on("close", (code) => {
      if (code !== 0) resolve(null);
      else resolve(stdout || null);
    });
    dot.stdin.on("error", () => resolve(null));
    dot.stdin.write(source);
    dot.stdin.end();
  });
}
