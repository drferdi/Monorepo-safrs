import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { applyProjectCapsule } from "../src/cli.mjs";
import { normalizeProjectAnswers } from "../src/model.mjs";
import { renderProjectCapsule } from "../src/render.mjs";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const templateRoot = path.join(repoRoot, "projects", "_template");
const cliPath = path.join(
  repoRoot,
  "tools",
  "project-wizard",
  "src",
  "cli.mjs",
);
const fixturePath = path.join(
  repoRoot,
  "tools",
  "project-wizard",
  "test",
  "fixtures",
  "atlas-demo.json",
);
const input = {
  name: "Atlas Demo",
  problem: "Membantu tim sekolah mengelola kegiatan belajar.",
  kind: "web",
  capabilities: ["ai", "file storage"],
  sensitiveDomains: ["education"],
};

async function createTemporaryRepo() {
  const root = await mkdtemp(path.join(tmpdir(), "safrs-project-wizard-"));
  await mkdir(path.join(root, "projects"), { recursive: true });
  await cp(templateRoot, path.join(root, "projects", "_template"), {
    recursive: true,
  });
  return root;
}

function runCli(root, args) {
  return spawnSync(process.execPath, [cliPath, "--repo-root", root, ...args], {
    encoding: "utf8",
  });
}

test("renders a deterministic complete capsule without template markers", () => {
  const model = normalizeProjectAnswers(input);
  const first = renderProjectCapsule(model, templateRoot);
  const second = renderProjectCapsule(model, templateRoot);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.map((file) => file.relativePath),
    [
      "AGENTS.md",
      "README.md",
      "docs/architecture.md",
      "docs/data.md",
      "docs/testing.md",
      "src/README.md",
      "tests/README.md",
    ],
  );
  assert.equal(
    first.some((file) =>
      /<replace-|<project-name>|<Describe/.test(file.content),
    ),
    false,
  );
});

test("rejects a symlinked template file instead of following it", async () => {
  const root = await createTemporaryRepo();
  try {
    const rogue = path.join(root, "outside.md");
    await writeFile(rogue, "outside");
    await rm(path.join(root, "projects", "_template", "README.md"));
    await symlink(
      rogue,
      path.join(root, "projects", "_template", "README.md"),
      "file",
    );

    assert.throws(
      () =>
        renderProjectCapsule(
          normalizeProjectAnswers(input),
          path.join(root, "projects", "_template"),
        ),
      /symbolic link/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("preview prints exact capsule files and performs no writes", async () => {
  const root = await createTemporaryRepo();
  try {
    const inputPath = path.join(root, "input.json");
    await writeFile(inputPath, JSON.stringify(input));

    const result = runCli(root, ["--input", inputPath, "--preview"]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Destination: projects\/atlas-demo/);
    assert.match(result.stdout, /projects\/atlas-demo\/AGENTS\.md/);
    assert.match(result.stdout, /App binding: apps\/web/);
    assert.match(result.stdout, /Computed risk: R1/);
    await assert.rejects(lstat(path.join(root, "projects", "atlas-demo")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("root project:new command accepts pnpm argument separator and remains write-free in preview", () => {
  const result =
    process.platform === "win32"
      ? spawnSync(
          "cmd.exe",
          ["/d", "/c", `pnpm project:new -- --input ${fixturePath} --preview`],
          {
            cwd: repoRoot,
            encoding: "utf8",
          },
        )
      : spawnSync(
          "pnpm",
          ["project:new", "--", "--input", fixturePath, "--preview"],
          {
            cwd: repoRoot,
            encoding: "utf8",
          },
        );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Destination: projects\/atlas-demo/);
});

test("apply requires exact confirmation and creates a complete capsule atomically", async () => {
  const root = await createTemporaryRepo();
  try {
    const inputPath = path.join(root, "input.json");
    await writeFile(inputPath, JSON.stringify(input));

    const rejected = runCli(root, [
      "--input",
      inputPath,
      "--apply",
      "--confirm",
      "yes",
    ]);
    assert.equal(rejected.status, 1);
    await assert.rejects(lstat(path.join(root, "projects", "atlas-demo")));

    const applied = runCli(root, [
      "--input",
      inputPath,
      "--apply",
      "--confirm",
      "CREATE atlas-demo",
    ]);
    assert.equal(applied.status, 0, applied.stderr);
    const readme = await readFile(
      path.join(root, "projects", "atlas-demo", "README.md"),
      "utf8",
    );
    assert.match(readme, /Atlas Demo/);
    for (const relativePath of [
      "AGENTS.md",
      "docs/architecture.md",
      "docs/data.md",
      "docs/testing.md",
      "src",
      "tests",
    ]) {
      await lstat(path.join(root, "projects", "atlas-demo", relativePath));
    }
    const entries = await (await import("node:fs/promises")).readdir(
      path.join(root, "projects"),
      { withFileTypes: true },
    );
    assert.equal(
      entries.some((entry) => entry.name.startsWith(".atlas-demo-stage-")),
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cleans only its staging directory when a capsule write fails", async () => {
  const root = await createTemporaryRepo();
  try {
    const projectsRoot = path.join(root, "projects");
    await assert.rejects(
      applyProjectCapsule(
        [
          { relativePath: "conflict", content: "file" },
          {
            relativePath: "conflict/child.md",
            content: "cannot create below a file",
          },
        ],
        projectsRoot,
        "failure-demo",
      ),
    );
    const entries = await (await import("node:fs/promises")).readdir(
      projectsRoot,
      { withFileTypes: true },
    );
    assert.equal(
      entries.some((entry) => entry.name.startsWith(".failure-demo-stage-")),
      false,
    );
    await assert.rejects(lstat(path.join(projectsRoot, "failure-demo")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses an existing destination without modifying it", async () => {
  const root = await createTemporaryRepo();
  try {
    const inputPath = path.join(root, "input.json");
    const destination = path.join(root, "projects", "atlas-demo");
    await mkdir(destination);
    await writeFile(path.join(destination, "sentinel.txt"), "preserve");
    await writeFile(inputPath, JSON.stringify(input));

    const result = runCli(root, [
      "--input",
      inputPath,
      "--apply",
      "--confirm",
      "CREATE atlas-demo",
    ]);

    assert.equal(result.status, 1);
    assert.equal(
      await readFile(path.join(destination, "sentinel.txt"), "utf8"),
      "preserve",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
