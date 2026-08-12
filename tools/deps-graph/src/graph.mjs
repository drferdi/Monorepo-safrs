/**
 * @typedef {Object} DependencyGraph
 * @property {string[]} nodes package names
 * @property {Map<string, Set<string>>} edges package name -> workspace deps
 */

/**
 * Detect a cycle in a directed graph using DFS. Returns the first cycle found
 * as a path of node names, or null if the graph is acyclic.
 *
 * @param {Map<string, Set<string>>} edges
 * @returns {string[] | null}
 */
export function detectCycle(edges) {
  const WHITE = 0; // unvisited
  const GRAY = 1; // on current DFS stack
  const BLACK = 2; // fully explored
  const color = new Map();
  const stack = [];

  for (const start of edges.keys()) color.set(start, WHITE);

  const visit = (node) => {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of edges.get(node) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) {
        // Found a back edge: node -> next, where next is still on the DFS
        // stack. The cycle is the stack segment from `next` through `node`,
        // closed by the back edge back to `next`.
        const start = stack.indexOf(next);
        return [...stack.slice(start), next];
      }
      if (c === WHITE) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(node, BLACK);
    return null;
  };

  for (const node of edges.keys()) {
    if (color.get(node) === WHITE) {
      const found = visit(node);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Return package names that declare a dependency on `name` (reverse edges).
 *
 * @param {Map<string, Set<string>>} edges
 * @param {string} name
 * @returns {string[]}
 */
export function dependentsOf(edges, name) {
  const out = [];
  for (const [from, deps] of edges) {
    if (deps.has(name)) out.push(from);
  }
  return out.sort();
}
