import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const hookPath = join(repositoryRoot, ".husky", "pre-commit");
const bashExecutable = "C:\\Program Files\\Git\\bin\\bash.exe";

function shellPath(file) {
  const normalized = file.replaceAll("\\", "/");
  return normalized.replace(
    /^([A-Za-z]):/u,
    (_, drive) => `/${drive.toLowerCase()}`,
  );
}

async function hookEnvironment(root) {
  const bin = join(root, ".hook-bin");
  const biome = shellPath(
    join(repositoryRoot, "node_modules", "@biomejs", "biome", "bin", "biome"),
  );
  await mkdir(bin);
  await writeFile(
    join(bin, "pnpm"),
    `#!/usr/bin/env bash\n[ "$1" = exec ] && [ "$2" = biome ] || exit 64\nshift 2\nexec '${shellPath(process.execPath)}' '${biome}' "$@"\n`,
    { mode: 0o755 },
  );
  return { ...process.env, PATH: `${shellPath(bin)}:/usr/bin:/bin` };
}

function command(directory, args, options = {}) {
  return execFileSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    ...options,
  });
}

test("hook declares staged-only Biome repair, partial-stage protection, and no full build", async () => {
  const hook = await readFile(hookPath, "utf8");

  assert.match(
    hook,
    /pnpm exec biome check --write --staged --no-errors-on-unmatched/u,
  );
  assert.match(hook, /sudah di-stage sebagian/u);
  assert.match(hook, /git diff --cached --name-only -z/u);
  assert.match(hook, /git add --pathspec-from-file=/u);
  assert.doesNotMatch(hook, /pnpm (run )?build|turbo run build/u);
});

test("hook repairs a fully staged TypeScript file and leaves unrelated unstaged work untouched", async () => {
  const root = await mkdtemp(join(tmpdir(), "safrs-precommit-"));
  try {
    command(root, ["init", "--quiet"]);
    command(root, ["config", "user.email", "chief@example.test"]);
    command(root, ["config", "user.name", "Chief"]);
    const environment = await hookEnvironment(root);
    await symlink(
      join(repositoryRoot, "node_modules"),
      join(root, "node_modules"),
      "junction",
    );
    await symlink(
      join(repositoryRoot, "biome.jsonc"),
      join(root, "biome.jsonc"),
      "file",
    );
    await writeFile(join(root, "staged.ts"), "export const    answer=42\n");
    await writeFile(join(root, "unrelated.txt"), "jangan disentuh\n");
    command(root, ["add", "staged.ts"]);

    execFileSync(bashExecutable, ["-c", `exec '${shellPath(hookPath)}'`], {
      cwd: root,
      encoding: "utf8",
      env: environment,
    });

    assert.equal(
      await readFile(join(root, "staged.ts"), "utf8"),
      "export const answer = 42;\n",
    );
    assert.equal(
      command(root, ["diff", "--cached", "--name-only"]).trim(),
      "staged.ts",
    );
    assert.equal(command(root, ["diff", "--name-only"]).trim(), "");
    assert.equal(
      await readFile(join(root, "unrelated.txt"), "utf8"),
      "jangan disentuh\n",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("hook fails closed when a staged file has unstaged changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "safrs-precommit-partial-"));
  try {
    command(root, ["init", "--quiet"]);
    command(root, ["config", "user.email", "chief@example.test"]);
    command(root, ["config", "user.name", "Chief"]);
    const environment = await hookEnvironment(root);
    await writeFile(join(root, "partial.ts"), "export const answer = 42;\n");
    command(root, ["add", "partial.ts"]);
    await writeFile(join(root, "partial.ts"), "export const answer = 43;\n");

    const result = execFileSync(
      bashExecutable,
      ["-c", `exec '${shellPath(hookPath)}'`],
      {
        cwd: root,
        encoding: "utf8",
        stdio: "pipe",
        env: environment,
      },
    );
    assert.fail(`hook unexpectedly passed: ${result}`);
  } catch (error) {
    assert.match(
      `${error.stdout}\n${error.stderr}`,
      /sudah di-stage sebagian/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
