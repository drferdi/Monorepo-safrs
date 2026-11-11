#!/usr/bin/env node
/**
 * Capsule token gate: no new raw colour or radius value in scoped code outside
 * the token package (`packages/ui-tokens`). Same raw-value rule the Monorepo
 * root gate applied to `apps/web/src`, which never passed there: the existing
 * values are recorded per file in `scripts/token-baseline.json`, and a file may
 * only go down. A file above its baseline, or a new file with raw values, fails.
 *
 *   node scripts/check-tokens.mjs                    gate
 *   node scripts/check-tokens.mjs --lower-baseline   record reductions only
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BASELINE_FILE = join(ROOT, "scripts", "token-baseline.json");
const SCOPE = ["apps/web/src"];
const EXT = new Set([".css", ".scss", ".ts", ".tsx", ".js", ".jsx"]);
const EXEMPT = ["packages/ui-tokens", "/__swatches__/", ".stories.", "/node_modules/"];

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
/* The whitespace must live inside the lookahead, or `\s*` backtracks to zero
   width and every correct `border-radius: var(--...)` is flagged. */
const RADIUS = /border-radius\s*:(?!\s*(?:0\b|var\())/g;

const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  ".turbo",
  "coverage",
  "test-results",
  "playwright-report",
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (entry.isFile() && EXT.has(extname(path))) out.push(path);
  }
  return out;
}

function countRawValues(source) {
  let count = 0;
  for (const line of source.split("\n")) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    count += (line.match(HEX)?.length ?? 0) + (line.match(RADIUS)?.length ?? 0);
  }
  return count;
}

const current = {};
let scanned = 0;
for (const base of SCOPE) {
  for (const file of walk(join(ROOT, base))) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    if (EXEMPT.some((item) => rel.includes(item))) continue;
    scanned++;
    const count = countRawValues(readFileSync(file, "utf8"));
    if (count > 0) current[rel] = count;
  }
}

const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
const regressions = Object.entries(current)
  .filter(([rel, count]) => count > (baseline[rel] ?? 0))
  .map(([rel, count]) => `${rel}: ${count} raw value(s), baseline ${baseline[rel] ?? 0}`);
const lowered = Object.keys(baseline).filter((rel) => (current[rel] ?? 0) < baseline[rel]);

if (regressions.length > 0) {
  console.error(`\n${regressions.length} file(s) gained raw colour or radius values:\n`);
  for (const regression of regressions) console.error(`  ${regression}`);
  console.error("\nUse var(--color-*) and radius tokens from packages/ui-tokens.\n");
  process.exit(1);
}

if (process.argv.includes("--lower-baseline")) {
  const next = Object.fromEntries(
    Object.entries(baseline)
      .map(([rel, count]) => [rel, Math.min(count, current[rel] ?? 0)])
      .filter(([, count]) => count > 0)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Baseline lowered for ${lowered.length} file(s).`);
} else if (lowered.length > 0) {
  console.log(
    `${lowered.length} file(s) are below baseline; run with --lower-baseline to lock it in.`,
  );
}

const total = Object.values(current).reduce((sum, count) => sum + count, 0);
console.log(
  `Token gate passed. ${scanned} files in ${SCOPE.join(", ")}; ${total} legacy raw value(s), none above baseline.`,
);
