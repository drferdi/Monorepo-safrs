import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * Removes `//` line comments from JSONC without touching sequences that appear
 * inside string literals, so `"https://..."` survives the strip.
 */
function stripLineComments(source) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      output += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
      output += character;
      continue;
    }
    if (character === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      output += "\n";
      continue;
    }
    output += character;
  }
  return output;
}

async function readBiomeConfiguration() {
  return JSON.parse(stripLineComments(await readFile("biome.jsonc", "utf8")));
}

test("tracked source is stored and checked out as LF on every platform", async () => {
  const attributes = await readFile(".gitattributes", "utf8");

  assert.match(
    attributes,
    /^\* text=auto eol=lf$/mu,
    "the catch-all rule must pin the working tree to LF so formatting is platform independent",
  );
});

test("the formatter emits a single deterministic line ending", async () => {
  const biome = await readBiomeConfiguration();

  assert.equal(
    biome.formatter.lineEnding,
    "lf",
    'lineEnding "auto" makes formatter output depend on the host platform',
  );
});

test("lint scope follows the ignore file instead of scanning local artifacts", async () => {
  const biome = await readBiomeConfiguration();

  assert.equal(biome.vcs?.enabled, true);
  assert.equal(biome.vcs?.clientKind, "git");
  assert.equal(
    biome.vcs?.useIgnoreFile,
    true,
    "untracked editor and agent state must not decide the lint result",
  );
});

test("no tracked text file carries CRLF in the Git index", () => {
  const result = spawnSync("git", ["ls-files", "--eol", "-z"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });

  assert.equal(result.status, 0, result.stderr);

  // Format: "i/<index-eol>  w/<worktree-eol>  attr/<attributes>\t<path>".
  // The three fields are space padded; a single tab separates them from the path.
  const entryPattern = /^i\/(\S+)\s+w\/(\S+)\s+attr\/[^\t]*\t(.+)$/su;
  const offenders = [];
  let examined = 0;
  for (const entry of result.stdout.split("\0")) {
    if (!entry.trim()) {
      continue;
    }
    const match = entryPattern.exec(entry);
    assert.ok(match, `unparsable git ls-files --eol entry: ${entry}`);
    examined += 1;
    const [, indexEol, , path] = match;
    if (indexEol === "crlf" || indexEol === "mixed") {
      offenders.push(path);
    }
  }

  assert.ok(examined > 0, "no tracked files were examined");

  assert.deepEqual(
    offenders,
    [],
    "run `git add --renormalize .` — these files were committed with CRLF",
  );
});
