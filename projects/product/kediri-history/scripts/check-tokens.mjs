#!/usr/bin/env node
/**
 * Token gate — capsule-local copy adapted from the Sentra Monorepo
 * `scripts/check-tokens.mjs` (source commit 2fa329a). Adapted because the
 * standalone-capsule contract forbids this capsule from resolving a root
 * script; the rule it enforces is unchanged.
 *
 * Two checks, both blocking:
 *   1. No raw colour or radius value outside the token snapshot.
 *   2. Every semantic text/background pair still meets WCAG 2.2 AA.
 *
 * Instructions to a developer or an agent are advisory; this script is the
 * part that actually holds.
 *
 *   node scripts/check-tokens.mjs           gate (runs inside `pnpm run test`)
 *   node scripts/check-tokens.mjs --audit   report unmigrated raw values
 */
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TOKEN_DIR = "apps/web/src/modules/design-system/tokens";
const SCAN = ["apps", "scripts"];
const EXT = new Set([".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".mjs"]);

/* Allowed to hold literal values: the token snapshot itself. Anything else
   uses var(--token). */
const EXEMPT = [TOKEN_DIR, "/node_modules/"];

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
    const target = join(dir, entry.name);
    if (entry.isDirectory()) walk(target, out);
    else if (entry.isFile() && EXT.has(extname(target))) out.push(target);
  }
  return out;
}

/* The raw-value check applies to migrated code only. Scope is opt-in: a path
   enters scope.txt when it has been migrated, and from that moment it can
   never regress. Unmigrated code is out of scope loudly rather than silently —
   `--audit` reports what is still outstanding. */
const SCOPE_FILE = `${TOKEN_DIR}/scope.txt`;
const AUDIT = process.argv.includes("--audit");

let scope = [];
try {
  scope = readFileSync(join(ROOT, SCOPE_FILE), "utf8")
    .split("\n")
    .map((line) => line.replace(/#.*$/, "").trim().replaceAll("\\", "/"))
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
    if (EXEMPT.some((exempt) => rel.includes(exempt))) continue;
    if (!inScope(rel)) {
      if (AUDIT) {
        const source = readFileSync(file, "utf8");
        const count =
          (source.match(HEX)?.length ?? 0) +
          (source.match(RADIUS)?.length ?? 0);
        if (count) {
          const owner = rel.split("/").slice(0, 3).join("/");
          legacy.set(owner, (legacy.get(owner) ?? 0) + count);
        }
      }
      continue;
    }
    const source = readFileSync(file, "utf8");
    source.split("\n").forEach((line, index) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
      for (const match of line.matchAll(HEX)) {
        violations.push({
          rel,
          line: index + 1,
          found: match[0],
          why: "raw colour — use var(--color-*)",
        });
      }
      for (const _ of line.matchAll(RADIUS)) {
        violations.push({
          rel,
          line: index + 1,
          found: line.trim().slice(0, 60),
          why: "raw radius — use var(--radius-structure|--radius-control)",
        });
      }
    });
  }
}

/* ---- contrast ---- */
const tokens = JSON.parse(
  readFileSync(join(ROOT, TOKEN_DIR, "tokens.json"), "utf8"),
);
const THEMES = [
  { name: "light", map: tokens.color },
  { name: "dark", map: tokens.colorDark },
];

const valIn = (map, name) => {
  const token = map[name] ?? tokens.color[name] ?? tokens.primitive[name];
  return (token?.resolved ?? token?.value ?? "").trim();
};
const luminance = (hex) => {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4]
    .map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const ratio = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (high + 0.05) / (low + 0.05);
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
];

/* Lapisan Kediri: palet proyek dari Bible 04. Pasangannya diukur di sini
   supaya "citra sinematik besar tidak pernah menjadi alasan teks yang tidak
   terbaca" menjadi gerbang, bukan niat. */
const kediri = JSON.parse(
  readFileSync(join(ROOT, TOKEN_DIR, "kediri.json"), "utf8"),
);
const kediriMaps = { ...kediri.readingLight, ...kediri.cinemaDark };
const kediriValue = (name) => (kediriMaps[name]?.resolved ?? "").trim();

const contrastFails = [];
let checks = 0;

for (const [fg, bg, min, note] of kediri.contrastPairs) {
  checks += 1;
  const foreground = kediriValue(fg);
  const background = kediriValue(bg);
  if (!foreground || !background) {
    contrastFails.push({
      note: `kediri · ${note}`,
      fg,
      bg,
      got: "missing",
      min,
    });
    continue;
  }
  const measured = ratio(foreground, background);
  if (measured < min) {
    contrastFails.push({
      note: `kediri · ${note}`,
      fg,
      bg,
      got: measured.toFixed(2),
      min,
    });
  }
}

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
    checks += 1;
    const measured = ratio(valIn(theme.map, fg), valIn(theme.map, bg));
    if (measured < min) {
      contrastFails.push({
        note: `${theme.name} · ${note}`,
        fg,
        bg,
        got: measured.toFixed(2),
        min,
      });
    }
  }
}

/* ---- report ---- */
if (AUDIT) {
  const rows = [...legacy.entries()].sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  console.log(
    `\nUnmigrated raw values, by area — ${total} across ${rows.length} areas:\n`,
  );
  for (const [owner, count] of rows) {
    console.log(`  ${String(count).padStart(6)}  ${owner}`);
  }
  console.log(`\n${scope.length} path(s) already in ${SCOPE_FILE}.`);
}

let bad = false;
if (violations.length) {
  bad = true;
  console.error(`\n${violations.length} raw value(s) in token-scoped code:\n`);
  for (const violation of violations.slice(0, 40)) {
    console.error(
      `  ${violation.rel}:${violation.line}  ${violation.found}  — ${violation.why}`,
    );
  }
  if (violations.length > 40) {
    console.error(`  ... and ${violations.length - 40} more`);
  }
}
if (contrastFails.length) {
  bad = true;
  console.error(`\n${contrastFails.length} contrast failure(s):\n`);
  for (const failure of contrastFails) {
    console.error(
      `  ${failure.note}: ${failure.fg} on ${failure.bg} = ${failure.got}:1, needs ${failure.min}:1`,
    );
  }
}
if (bad) {
  console.error(
    "\nToken gate failed. Fix the values, or change the token and re-measure.\n",
  );
  process.exit(1);
}
console.log(
  `Token gate passed. ${checks} contrast checks across ${THEMES.length} Sentra themes ` +
    `plus the Kediri layer, ` +
    `0 raw values in ${scope.length} scoped path(s). Scanned ${scanned.join(", ")}.`,
);
