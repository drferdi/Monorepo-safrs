import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { renameSync, writeFileSync } from "node:fs";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
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

async function assertNoOwnedWizardResidue(projectsRoot, slug) {
  const entries = await readdir(projectsRoot);
  assert.equal(entries.includes(slug), false, `destination ${slug} remains`);
  assert.equal(
    entries.some(
      (entry) =>
        entry.startsWith(`.${slug}-stage-`) ||
        entry.startsWith(`..${slug}-stage-`),
    ),
    false,
    `owned stage for ${slug} remains`,
  );
  assert.equal(
    entries.some(
      (entry) =>
        entry.startsWith(`.${slug}.lock`) || entry.startsWith(`..${slug}.lock`),
    ),
    false,
    `owned lock for ${slug} remains`,
  );
}

async function withPosixPublish(callback) {
  const platform = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { ...platform, value: "linux" });
  try {
    return await callback();
  } finally {
    Object.defineProperty(process, "platform", platform);
  }
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

test("rejects a symlinked intermediate template directory", async () => {
  const root = await createTemporaryRepo();
  try {
    const template = path.join(root, "projects", "_template");
    const outsideDocs = path.join(root, "outside-docs");
    await rename(path.join(template, "docs"), outsideDocs);
    await symlink(
      outsideDocs,
      path.join(template, "docs"),
      process.platform === "win32" ? "junction" : "dir",
    );

    assert.throws(
      () => renderProjectCapsule(normalizeProjectAnswers(input), template),
      /symbolic link/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a template file swapped after it is opened", async () => {
  const root = await createTemporaryRepo();
  try {
    const template = path.join(root, "projects", "_template");
    assert.throws(
      () =>
        renderProjectCapsule(normalizeProjectAnswers(input), template, {
          afterOpen(sourcePath) {
            if (sourcePath.endsWith("README.md")) {
              const displaced = `${sourcePath}.original`;
              renameSync(sourcePath, displaced);
              writeFileSync(sourcePath, "# swapped");
            }
          },
        }),
      /changed while being read/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fails closed for any unresolved template marker", async () => {
  const root = await createTemporaryRepo();
  try {
    const template = path.join(root, "projects", "_template");
    await writeFile(
      path.join(template, "docs", "architecture.md"),
      "# Architecture\n\n{{FUTURE_MARKER}}\n",
    );

    assert.throws(
      () => renderProjectCapsule(normalizeProjectAnswers(input), template),
      /marker remains/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("escapes user Markdown before placing it in a capsule", () => {
  const model = normalizeProjectAnswers({
    ...input,
    name: "Atlas [Demo](unsafe)",
    problem: "**Tidak** menjalankan [tautan](unsafe).",
  });
  const files = renderProjectCapsule(model, templateRoot);
  const readme = files.find((file) => file.relativePath === "README.md");

  assert.equal(readme.content.includes("Atlas \\[Demo\\]\\(unsafe\\)"), true);
  assert.equal(
    readme.content.includes(
      "\\*\\*Tidak\\*\\* menjalankan \\[tautan\\]\\(unsafe\\)\\.",
    ),
    true,
  );
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

test("refuses a destination created after preview before it can be published", async () => {
  const root = await createTemporaryRepo();
  try {
    const projectsRoot = path.join(root, "projects");
    const destination = path.join(projectsRoot, "race-demo");
    await assert.rejects(
      applyProjectCapsule(
        renderProjectCapsule(
          normalizeProjectAnswers(input),
          path.join(projectsRoot, "_template"),
        ),
        projectsRoot,
        "race-demo",
        { beforePublish: async () => mkdir(destination) },
      ),
      /already exists/i,
    );
    await lstat(destination);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects an empty pre-existing destination without replacing it", async () => {
  const root = await createTemporaryRepo();
  try {
    const projectsRoot = path.join(root, "projects");
    const destination = path.join(projectsRoot, "empty-demo");
    await mkdir(destination);
    await assert.rejects(
      applyProjectCapsule([], projectsRoot, "empty-demo"),
      /already exists/i,
    );
    assert.deepEqual(
      await (await import("node:fs/promises")).readdir(destination),
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects a swapped projects boundary before writing through it", async () => {
  const root = await createTemporaryRepo();
  try {
    const projectsRoot = path.join(root, "projects");
    const outside = path.join(root, "outside-projects");
    await mkdir(outside);
    await rm(projectsRoot, { recursive: true, force: true });
    await symlink(
      outside,
      projectsRoot,
      process.platform === "win32" ? "junction" : "dir",
    );

    await assert.rejects(
      applyProjectCapsule([], projectsRoot, "boundary-demo"),
      /symbolic link/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("preserves a swapped staging path during cleanup", async () => {
  const root = await createTemporaryRepo();
  try {
    const projectsRoot = path.join(root, "projects");
    let replacement;
    await assert.rejects(
      applyProjectCapsule(
        [{ relativePath: "README.md", content: "capsule" }],
        projectsRoot,
        "swap-demo",
        {
          afterStageReady: async (stage) => {
            const displaced = `${stage}-displaced`;
            await rename(stage, displaced);
            await mkdir(stage);
            replacement = path.join(stage, "keep.txt");
            await writeFile(replacement, "do not delete");
          },
        },
      ),
      /changed while being prepared/i,
    );
    assert.equal(await readFile(replacement, "utf8"), "do not delete");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("quarantines a swapped cleanup candidate and still releases the slug lock", async () => {
  const root = await createTemporaryRepo();
  try {
    const projectsRoot = path.join(root, "projects");
    await assert.rejects(
      applyProjectCapsule(
        [{ relativePath: "README.md", content: "capsule" }],
        projectsRoot,
        "quarantine-demo",
        {
          afterStageReady: async () => {
            throw new Error("injected stage failure");
          },
          beforeQuarantineRename: async (state) => {
            if (!state.directory.includes(".quarantine-demo-stage-")) return;
            const displaced = `${state.directory}-owned`;
            await rename(state.directory, displaced);
            await mkdir(state.directory);
            await writeFile(
              path.join(state.directory, "replacement.txt"),
              "preserve",
            );
          },
        },
      ),
    );
    const quarantined = (
      await (await import("node:fs/promises")).readdir(projectsRoot)
    ).find((entry) => entry.includes(".quarantine-"));
    assert.equal(
      await readFile(
        path.join(projectsRoot, quarantined, "replacement.txt"),
        "utf8",
      ),
      "preserve",
    );
    await applyProjectCapsule([], projectsRoot, "quarantine-demo");
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

for (const { name, hook, verify } of [
  {
    name: "lock open",
    hook: "afterLockOpen",
    verify: async ({ lockPath }) => {
      assert.equal(await readFile(lockPath, "utf8"), "");
    },
  },
  {
    name: "lock write",
    hook: "afterLockWrite",
    verify: async ({ lockPath, marker }) => {
      assert.equal(await readFile(lockPath, "utf8"), marker);
    },
  },
  {
    name: "lock stat",
    hook: "afterLockStat",
    verify: async ({ identity }) => {
      assert.equal(identity.isFile(), true);
    },
  },
]) {
  test(`cleans owned state when ${name} hook fails`, async () => {
    const root = await createTemporaryRepo();
    const slug = `failure-${hook.toLowerCase()}`;
    const projectsRoot = path.join(root, "projects");
    try {
      await assert.rejects(
        applyProjectCapsule([], projectsRoot, slug, {
          [hook]: async (state) => {
            await verify(state);
            throw new Error(`${hook} injected failure`);
          },
        }),
        new RegExp(`${hook} injected failure`),
      );
      await assertNoOwnedWizardResidue(projectsRoot, slug);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

for (const { name, hook, verify } of [
  {
    name: "stage directory creation",
    hook: "afterMkdtemp",
    verify: async ({ directory }) => {
      await assert.rejects(
        lstat(path.join(directory, ".safrs-project-wizard-stage.json")),
      );
    },
  },
  {
    name: "stage marker write",
    hook: "afterMarkerWrite",
    verify: async ({ marker, markerPath }) => {
      assert.equal(await readFile(markerPath, "utf8"), marker);
    },
  },
  {
    name: "stage marker stat",
    hook: "afterMarkerStat",
    verify: async ({ markerIdentity }) => {
      assert.equal(markerIdentity.isFile(), true);
    },
  },
]) {
  test(`cleans owned state when ${name} hook fails`, async () => {
    const root = await createTemporaryRepo();
    const slug = `failure-${hook.toLowerCase()}`;
    const projectsRoot = path.join(root, "projects");
    try {
      await assert.rejects(
        applyProjectCapsule([], projectsRoot, slug, {
          [hook]: async (state) => {
            await verify(state);
            throw new Error(`${hook} injected failure`);
          },
        }),
        new RegExp(`${hook} injected failure`),
      );
      await assertNoOwnedWizardResidue(projectsRoot, slug);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

for (const { name, hook, verify } of [
  {
    name: "destination directory creation",
    hook: "afterDestinationMkdir",
    verify: async ({ directory }) => {
      await assert.rejects(
        lstat(path.join(directory, ".safrs-project-wizard-incomplete")),
      );
    },
  },
  {
    name: "destination marker write",
    hook: "afterDestinationMarkerWrite",
    verify: async ({ marker, markerPath }) => {
      assert.equal(await readFile(markerPath, "utf8"), marker);
    },
  },
  {
    name: "destination marker stat",
    hook: "afterDestinationMarkerStat",
    verify: async ({ markerIdentity }) => {
      assert.equal(markerIdentity.isFile(), true);
    },
  },
]) {
  test(`cleans owned state when ${name} hook fails`, async () => {
    const root = await createTemporaryRepo();
    const slug = `failure-${hook.toLowerCase()}`;
    const projectsRoot = path.join(root, "projects");
    try {
      await withPosixPublish(async () => {
        await assert.rejects(
          applyProjectCapsule([], projectsRoot, slug, {
            [hook]: async (state) => {
              await verify(state);
              throw new Error(`${hook} injected failure`);
            },
          }),
          new RegExp(`${hook} injected failure`),
        );
      });
      await assertNoOwnedWizardResidue(projectsRoot, slug);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("keeps the primary error first, retains cleanup errors, and attempts lock release", async () => {
  const root = await createTemporaryRepo();
  const projectsRoot = path.join(root, "projects");
  const slug = "aggregate-cleanup-demo";
  const lockPath = path.join(projectsRoot, `.${slug}.lock`);
  try {
    await assert.rejects(
      applyProjectCapsule([], projectsRoot, slug, {
        afterLockWrite: async ({ handle }) => {
          await handle.close();
          await rm(lockPath);
          await mkdir(lockPath);
          await writeFile(path.join(lockPath, "replacement.txt"), "preserve");
        },
        afterStageReady: async () => {
          throw new Error("primary stage failure");
        },
        beforeQuarantineRename: async (state) => {
          await rm(state.directory, { recursive: true, force: true });
          throw new Error("stage cleanup failure");
        },
      }),
      (error) => {
        assert.equal(error instanceof AggregateError, true);
        assert.equal(error.errors[0].message, "primary stage failure");
        assert.equal(error.errors[1].message, "stage cleanup failure");
        assert.match(
          String(error.errors[2].code ?? error.errors[2].message),
          /EISDIR|EPERM/i,
        );
        return true;
      },
    );
    const entries = await readdir(projectsRoot);
    assert.equal(entries.includes(slug), false);
    assert.equal(
      entries.some((entry) => entry.startsWith(`.${slug}-stage-`)),
      false,
    );
    assert.equal(
      await readFile(path.join(lockPath, "replacement.txt"), "utf8"),
      "preserve",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
