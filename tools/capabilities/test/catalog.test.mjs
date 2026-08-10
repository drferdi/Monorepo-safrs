import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  applyCapability,
  capabilityPreview,
  loadCatalog,
} from "../src/catalog.mjs";

const requiredFields = [
  "id",
  "label",
  "description",
  "risk",
  "dependencies",
  "environment",
  "commands",
  "tests",
  "sensitivePaths",
  "sideEffects",
  "removal",
];
const capabilityIds = ["ai", "electron", "email", "python", "stripe", "wxt"];

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "safrs-capability-"));
  await mkdir(join(root, "projects", "golden-path"), { recursive: true });
  return root;
}

test("catalog contains complete, bounded optional capability manifests", async () => {
  const catalog = await loadCatalog();

  assert.deepEqual([...catalog.keys()].sort(), capabilityIds);
  for (const manifest of catalog.values()) {
    for (const field of requiredFields)
      assert.ok(field in manifest, `${manifest.id} needs ${field}`);
    assert.match(manifest.risk, /^R[12]$/u);
    assert.ok(Array.isArray(manifest.dependencies));
    assert.ok(Array.isArray(manifest.environment));
    assert.ok(Array.isArray(manifest.commands));
    assert.ok(Array.isArray(manifest.tests));
    assert.ok(Array.isArray(manifest.sensitivePaths));
    assert.ok(Array.isArray(manifest.sideEffects));
    assert.equal(typeof manifest.removal, "string");
  }
});

test("root workspace does not install optional runtime dependencies", async () => {
  const rootPackage = JSON.parse(
    await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
  );
  const installed = new Set([
    ...Object.keys(rootPackage.dependencies ?? {}),
    ...Object.keys(rootPackage.devDependencies ?? {}),
  ]);
  const catalog = await loadCatalog();

  for (const manifest of catalog.values()) {
    for (const dependency of manifest.dependencies) {
      assert.equal(
        installed.has(dependency),
        false,
        `${dependency} must stay optional`,
      );
    }
  }
});

test("preview is write-free and lists the complete capability contract", async () => {
  const root = await fixtureRoot();
  try {
    const preview = await capabilityPreview({
      capabilityId: "stripe",
      project: "golden-path",
      repoRoot: root,
    });

    assert.match(preview, /Dependencies:/u);
    assert.match(preview, /Environment:/u);
    assert.match(preview, /Commands:/u);
    assert.match(preview, /Risk: R2/u);
    await assert.rejects(
      readFile(join(root, "projects", "golden-path", "capabilities.json")),
      { code: "ENOENT" },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI maps --capability to the selector preview without writing", async () => {
  const root = await fixtureRoot();
  try {
    const result = spawnSync(
      process.execPath,
      [
        "src/cli.mjs",
        "--capability",
        "email",
        "--project",
        "golden-path",
        "--preview",
        "--repo-root",
        root,
      ],
      { cwd: new URL("..", import.meta.url), encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Capability: Local email development/u);
    await assert.rejects(
      readFile(join(root, "projects", "golden-path", "capabilities.json")),
      { code: "ENOENT" },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("apply requires exact confirmation and only records a deterministic project capsule selection", async () => {
  const root = await fixtureRoot();
  try {
    await assert.rejects(
      applyCapability({
        capabilityId: "email",
        project: "golden-path",
        repoRoot: root,
        confirmation: "ENABLE email",
      }),
      /ENABLE email FOR golden-path/u,
    );

    await applyCapability({
      capabilityId: "email",
      project: "golden-path",
      repoRoot: root,
      confirmation: "ENABLE email FOR golden-path",
    });
    await applyCapability({
      capabilityId: "stripe",
      project: "golden-path",
      repoRoot: root,
      confirmation: "ENABLE stripe FOR golden-path",
    });
    await applyCapability({
      capabilityId: "email",
      project: "golden-path",
      repoRoot: root,
      confirmation: "ENABLE email FOR golden-path",
    });

    assert.deepEqual(
      JSON.parse(
        await readFile(
          join(root, "projects", "golden-path", "capabilities.json"),
          "utf8",
        ),
      ),
      {
        version: 1,
        capabilities: [
          { id: "email", risk: "R2" },
          { id: "stripe", risk: "R2" },
        ],
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("selector rejects path traversal and project links, preserves a higher recorded risk, and requires Python justification", async () => {
  const root = await fixtureRoot();
  const outside = await mkdtemp(join(tmpdir(), "safrs-capability-outside-"));
  try {
    await assert.rejects(
      capabilityPreview({
        capabilityId: "email",
        project: "../outside",
        repoRoot: root,
      }),
      /safe project slug/u,
    );
    await rm(join(root, "projects", "golden-path"), {
      recursive: true,
      force: true,
    });
    await symlink(outside, join(root, "projects", "golden-path"), "junction");
    await assert.rejects(
      capabilityPreview({
        capabilityId: "email",
        project: "golden-path",
        repoRoot: root,
      }),
      /symbolic link|junction/u,
    );

    await rm(join(root, "projects", "golden-path"), {
      recursive: true,
      force: true,
    });
    await mkdir(join(root, "projects", "golden-path"), { recursive: true });
    await writeFile(
      join(root, "projects", "golden-path", "capabilities.json"),
      '{"version": 1, "capabilities": [{"id": "email", "risk": "R3"}]}\n',
    );
    await applyCapability({
      capabilityId: "stripe",
      project: "golden-path",
      repoRoot: root,
      confirmation: "ENABLE stripe FOR golden-path",
    });
    assert.deepEqual(
      JSON.parse(
        await readFile(
          join(root, "projects", "golden-path", "capabilities.json"),
          "utf8",
        ),
      ).capabilities,
      [
        { id: "email", risk: "R3" },
        { id: "stripe", risk: "R2" },
      ],
    );
    await assert.rejects(
      applyCapability({
        capabilityId: "python",
        project: "golden-path",
        repoRoot: root,
        confirmation: "ENABLE python FOR golden-path",
      }),
      /technical justification/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
