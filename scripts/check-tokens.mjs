#!/usr/bin/env node
/**
 * Sentraverse token gate — ported and adapted from abyss-monorepo.
 *
 * Two checks, both blocking:
 *   1. No raw colour or radius value outside the token package.
 *   2. Every semantic text/background pair still meets WCAG 2.2 AA.
 *
 * Instructions to a developer or an agent are advisory; this script is the
 * part that actually holds.
 *
 *   node scripts/check-tokens.mjs           gate (CI / governance)
 *   node scripts/check-tokens.mjs --audit   report unmigrated raw values
 */
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const TOKEN_PKG = "packages/token";
const SCAN = ["projects", "packages", "tools"];
const EXT = new Set([
  ".css",
  ".scss",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".vue",
  ".svelte",
]);

/* Allowed to hold literal values: the token package, and swatch demos which
   must show the real hex. Anything else uses var(--token). */
const EXEMPT = [TOKEN_PKG, "/__swatches__/", ".stories.", "/node_modules/"];

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
/* The whitespace must live inside the lookahead. With `:\s*(?!0|var\()` the
   engine backtracks `\s*` to zero width, tests the lookahead against the space
   instead of the value, and flags every correct `border-radius: var(--...)`. */
const RADIUS = /border-radius\s*:(?!\s*(?:0\b|var\())/g;

const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  ".turbo",
  ".git",
  "venv",
  ".venv",
  "env",
  ".env",
  "__pycache__",
  "site-packages",
  "coverage",
  "test-results",
  "playwright-report",
]);
const skip = (name) => SKIP_DIR.has(name) || name.startsWith(".next");

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (skip(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile() && EXT.has(extname(p))) out.push(p);
  }
  return out;
}

/* The raw-value check applies to migrated code only. Scope is opt-in: a path
   enters scope.txt when it has been migrated, and from that moment it can
   never regress. Legacy code is out of scope loudly rather than silently —
   `--audit` reports what is still outstanding. */
const SCOPE_FILE = "packages/token/scope.txt";
const AUDIT = process.argv.includes("--audit");

let scope = [];
try {
  scope = readFileSync(join(ROOT, SCOPE_FILE), "utf8")
    .split("\n")
    .map((l) => l.replace(/#.*$/, "").trim().replaceAll("\\", "/"))
    .filter(Boolean);
} catch {
  console.error(
    `Missing ${SCOPE_FILE}. Create it, even empty, so scope is explicit.`,
  );
  process.exit(1);
}

const inScope = (rel) =>
  scope.some((s) => rel === s || rel.startsWith(s.replace(/\/?$/, "/")));

const violations = [];
const legacy = new Map();
const scanned = [];
for (const base of SCAN) {
  const files = walk(join(ROOT, base));
  scanned.push(`${base}: ${files.length}`);
  for (const file of files) {
    const rel = relative(ROOT, file).replaceAll("\\", "/");
    if (EXEMPT.some((e) => rel.includes(e))) continue;
    if (!inScope(rel)) {
      if (AUDIT) {
        const src = readFileSync(file, "utf8");
        const n =
          (src.match(HEX)?.length ?? 0) + (src.match(RADIUS)?.length ?? 0);
        if (n) {
          const owner = rel.split("/").slice(0, 3).join("/");
          legacy.set(owner, (legacy.get(owner) ?? 0) + n);
        }
      }
      continue;
    }
    const src = readFileSync(file, "utf8");
    src.split("\n").forEach((line, i) => {
      if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*"))
        return;
      for (const m of line.matchAll(HEX))
        violations.push({
          rel,
          line: i + 1,
          found: m[0],
          why: "raw colour — use var(--color-*)",
        });
      for (const _ of line.matchAll(RADIUS))
        violations.push({
          rel,
          line: i + 1,
          found: line.trim().slice(0, 60),
          why: "raw radius — use var(--radius-structure|--radius-control)",
        });
    });
  }
}

/* ---- contrast ---- */
const tokens = JSON.parse(
  readFileSync(join(ROOT, TOKEN_PKG, "src/tokens.json"), "utf8"),
);
const THEMES = [
  { name: "light", map: tokens.color },
  { name: "dark", map: tokens.colorDark },
];

const valIn = (map, name) => {
  const t = map[name] ?? tokens.color[name] ?? tokens.primitive[name];
  return (t?.resolved ?? t?.value ?? "").trim();
};
const lum = (hex) => {
  const h = hex.replace("#", "");
  const c = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/* fg, bg, minimum, note */
const PAIRS = [
  ["--color-text-primary", "--color-background-canvas", 4.5, "body text"],
  [
    "--color-text-secondary",
    "--color-background-canvas",
    4.5,
    "secondary text",
  ],
  [
    "--color-text-primary",
    "--color-background-surface",
    4.5,
    "text on surface",
  ],
  ["--color-accent-text", "--color-background-canvas", 4.5, "accent text"],
  ["--color-status-critical", "--color-background-canvas", 4.5, "critical"],
  ["--color-status-warning", "--color-background-canvas", 4.5, "warning"],
  ["--color-status-success", "--color-background-canvas", 4.5, "success"],
  [
    "--color-text-inverse",
    "--color-action-primary",
    4.5,
    "primary button label",
  ],
  [
    "--color-text-on-emphasis",
    "--color-surface-emphasis",
    4.5,
    "emphasis tile label",
  ],
  [
    "--color-text-inverse",
    "--color-status-critical",
    4.5,
    "unread count on critical badge",
  ],
  [
    "--color-text-primary",
    "--color-surface-critical",
    4.5,
    "text on failing row",
  ],
  [
    "--color-accent",
    "--color-background-canvas",
    3.0,
    "accent as graphic mark",
  ],
  [
    "--color-border-strong",
    "--color-background-canvas",
    3.0,
    "control boundary",
  ],
  ["--color-data-1", "--color-background-canvas", 3.0, "data series 1"],
  ["--color-data-2", "--color-background-canvas", 3.0, "data series 2"],
  ["--color-data-3", "--color-background-canvas", 3.0, "data series 3"],
];

/* data ramp must stay separable in greyscale */
const ramp = [
  "--color-data-1",
  "--color-data-2",
  "--color-data-3",
  "--color-data-4",
];

const contrastFails = [];
let checks = 0;
for (const theme of THEMES) {
  if (!theme.map) {
    contrastFails.push({
      note: `${theme.name} palette is missing from tokens.json`,
      fg: "-",
      bg: "-",
      got: "-",
      min: "-",
    });
    continue;
  }
  for (const [fg, bg, min, note] of PAIRS) {
    checks++;
    const r = ratio(valIn(theme.map, fg), valIn(theme.map, bg));
    if (r < min)
      contrastFails.push({
        note: `${theme.name} · ${note}`,
        fg,
        bg,
        got: r.toFixed(2),
        min,
      });
  }
  for (let i = 0; i < ramp.length - 1; i++) {
    checks++;
    const r = ratio(valIn(theme.map, ramp[i]), valIn(theme.map, ramp[i + 1]));
    if (r < 1.6)
      contrastFails.push({
        note: `${theme.name} · data ramp step`,
        fg: ramp[i],
        bg: ramp[i + 1],
        got: r.toFixed(2),
        min: 1.6,
      });
  }
}

/* ---- report ---- */
if (AUDIT) {
  const rows = [...legacy.entries()].sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((s, [, n]) => s + n, 0);
  console.log(
    `\nUnmigrated raw values, by area — ${total} across ${rows.length} areas:\n`,
  );
  for (const [owner, n] of rows)
    console.log(`  ${String(n).padStart(6)}  ${owner}`);
  console.log(`\n${scope.length} path(s) already in ${SCOPE_FILE}.`);
}

let bad = false;
if (violations.length) {
  bad = true;
  console.error(
    `\n${violations.length} raw value(s) in Sentraverse-scoped code:\n`,
  );
  for (const v of violations.slice(0, 40))
    console.error(`  ${v.rel}:${v.line}  ${v.found}  — ${v.why}`);
  if (violations.length > 40)
    console.error(`  ... and ${violations.length - 40} more`);
}
if (contrastFails.length) {
  bad = true;
  console.error(`\n${contrastFails.length} contrast failure(s):\n`);
  for (const c of contrastFails)
    console.error(
      `  ${c.note}: ${c.fg} on ${c.bg} = ${c.got}:1, needs ${c.min}:1`,
    );
}
if (bad) {
  console.error(
    "\nToken gate failed. Fix the values, or change the token and re-measure.\n",
  );
  process.exit(1);
}
console.log(
  `Token gate passed. ${checks} contrast checks across ${THEMES.length} themes, ` +
    `0 raw values in ${scope.length} scoped path(s). Scanned ${scanned.join(", ")}.`,
);
if (!scope.length)
  console.log(
    `Note: ${SCOPE_FILE} is empty, so only contrast was checked. ` +
      `Add a path there as soon as a screen is migrated, or the gate guards nothing.`,
  );
