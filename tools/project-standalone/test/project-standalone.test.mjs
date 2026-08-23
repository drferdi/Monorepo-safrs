import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runCli } from "../src/cli.mjs";
import { loadAndValidateContract, validateContract } from "../src/contract.mjs";
import { assertSafeTree, copyCapsule } from "../src/extraction.mjs";
import { createSanitizedEnvironment, runCommand } from "../src/process.mjs";
import { statusCapsules, verifyCapsule } from "../src/verify.mjs";

const toolRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = path.resolve(toolRoot, "../..");
const checkerPath = path.join(
  repositoryRoot,
  "tools",
  "safrs",
  "check_project_independence.py",
);

async function temporaryDirectory(prefix = "safrs-project-standalone-test-") {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

function command(stage) {
  return { program: "node", args: ["lifecycle.mjs", stage] };
}

function contract(overrides = {}) {
  return {
    schemaVersion: 1,
    id: "internal/example",
    owner: "test-owner",
    risk: "R1",
    runtime: { name: "node", version: process.versions.node },
    packageManager: { name: "none", version: null, lockfile: null },
    commands: {
      install: command("install"),
      lint: {
        program: null,
        args: [],
        notApplicableReason:
          "No linter is used by this dependency-free fixture.",
      },
      typecheck: {
        program: null,
        args: [],
        notApplicableReason:
          "No type checker is used by this JavaScript fixture.",
      },
      test: command("test"),
      build: command("build"),
      run: command("run"),
      deployDryRun: command("deploy"),
    },
    smoke: {
      kind: "none",
      notApplicableReason: "The run command is a finite executable check.",
    },
    artifacts: ["dist/app.txt"],
    externalDependencies: [],
    mutableStatePaths: [".state"],
    ...overrides,
  };
}

const lifecycleSource = String.raw`
import { appendFile, mkdir, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import http from "node:http";

const stage = process.argv[2];
if (process.env.SAFRS_TEST_SECRET || process.env.SAFRS_CREDENTIAL_URL) {
  throw new Error("inherited secret reached lifecycle process");
}
if (existsSync("../root-sentinel.txt")) {
  throw new Error("monorepo root sentinel was copied");
}
await appendFile("stages.log", stage + "\n");
if (stage === "build") {
  await mkdir("dist", { recursive: true });
  await writeFile("dist/app.txt", "built\n");
}
if (stage === "mutate-link") {
  await symlink("../home", "runtime-escape", "dir");
}
if (stage === "http") {
  const server = http.createServer((_request, response) => {
    response.writeHead(204);
    response.end();
  });
  server.listen(Number(process.env.PORT), process.env.HOST);
}
`;

async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function createRepository(projectContract = contract()) {
  const root = await temporaryDirectory();
  const capsule = path.join(root, "projects", "internal", "example");
  await mkdir(capsule, { recursive: true });
  await writeFile(
    path.join(capsule, "project.contract.json"),
    `${JSON.stringify(projectContract, null, 2)}\n`,
  );
  await writeFile(path.join(capsule, "lifecycle.mjs"), lifecycleSource);
  await writeFile(path.join(root, "root-sentinel.txt"), "root-only\n");
  return { root, capsule };
}

test("contract validation reports precise fields and rejects unsafe argv", async () => {
  assert.deepEqual(validateContract(contract()), []);

  const invalid = contract({ surprise: true });
  invalid.commands.lint = { program: null, args: [] };
  invalid.commands.test = { program: "node", args: ["--config=../root.json"] };
  const errors = validateContract(invalid);
  assert.ok(errors.some((error) => error.includes("$.surprise")));
  assert.ok(
    errors.some((error) =>
      error.includes("$.commands.lint.notApplicableReason"),
    ),
  );
  assert.ok(errors.some((error) => error.includes("$.commands.test.args[0]")));

  const shellContract = contract();
  shellContract.commands.install = {
    program: "cmd.exe",
    args: ["/c", "echo unsafe"],
  };
  shellContract.commands.test = { program: "unsafe.cmd", args: [] };
  shellContract.commands.build = { program: "C:outside.exe", args: [] };
  shellContract.smoke = {
    kind: "http",
    host: "example.com",
    port: 443,
    path: "/",
    expectedStatus: 200,
    startupTimeoutSeconds: 1,
  };
  const shellErrors = validateContract(shellContract);
  assert.ok(shellErrors.some((error) => error.includes("shell interpreter")));
  assert.ok(shellErrors.some((error) => error.includes("batch file")));
  assert.ok(
    shellErrors.some(
      (error) =>
        error.includes("$.commands.build.program") &&
        error.includes("capsule-relative"),
    ),
  );
  assert.ok(shellErrors.some((error) => error.includes("loopback host")));
});

test("contract loader rejects invalid JSON with an actionable path", async () => {
  const root = await temporaryDirectory();
  try {
    const file = path.join(root, "project.contract.json");
    await writeFile(file, "{ invalid");
    await assert.rejects(
      loadAndValidateContract(file),
      /project\.contract\.json.*valid JSON/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("safe extraction copies only capsule files and excludes outputs", async () => {
  const { root, capsule } = await createRepository();
  const destination = await temporaryDirectory("safrs-project-copy-");
  try {
    await mkdir(path.join(capsule, ".git"));
    await writeFile(path.join(capsule, ".git", "config"), "not copied");
    await mkdir(path.join(capsule, "dist"));
    await writeFile(path.join(capsule, "dist", "app.txt"), "stale");
    await mkdir(path.join(capsule, ".state"));
    await writeFile(path.join(capsule, ".state", "old.txt"), "stale");

    await copyCapsule(capsule, destination, contract());
    await assertSafeTree(destination);
    assert.equal(
      await readFile(path.join(destination, "lifecycle.mjs"), "utf8"),
      lifecycleSource,
    );
    await assert.rejects(readFile(path.join(destination, ".git", "config")));
    await assert.rejects(readFile(path.join(destination, "dist", "app.txt")));
    await assert.rejects(readFile(path.join(destination, ".state", "old.txt")));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});

test("safe tree rejects source symlinks without following them", async (context) => {
  const { root, capsule } = await createRepository();
  const outside = path.join(root, "outside.txt");
  await writeFile(outside, "outside");
  try {
    try {
      await symlink(outside, path.join(capsule, "escape-link"));
    } catch (error) {
      if (error?.code === "EPERM") {
        context.skip("This Windows account cannot create test symlinks.");
        return;
      }
      throw error;
    }
    await assert.rejects(assertSafeTree(capsule), /symbolic link|reparse/iu);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("sanitized environment is a strict allowlist with an isolated home", () => {
  const isolatedHome = path.join(os.tmpdir(), "safrs-isolated-home");
  const forbiddenRoot = path.join(os.tmpdir(), "safrs-forbidden-repository");
  const environment = createSanitizedEnvironment(
    { HOST: "127.0.0.1", PORT: "43210" },
    {
      PATH: [
        path.dirname(process.execPath),
        forbiddenRoot,
        path.join(forbiddenRoot, "node_modules", ".bin"),
      ].join(path.delimiter),
      PATHEXT: process.env.PATHEXT,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      SAFRS_TEST_SECRET: "never-forward",
      RANDOM_BENIGN_VALUE: "also-never-forward",
      SAFRS_CREDENTIAL_URL: "https://user:pass@example.invalid/path",
    },
    isolatedHome,
    { forbiddenRoots: [forbiddenRoot] },
  );
  assert.equal(environment.HOST, "127.0.0.1");
  assert.equal(environment.PORT, "43210");
  assert.equal(environment.SAFRS_TEST_SECRET, undefined);
  assert.equal(environment.RANDOM_BENIGN_VALUE, undefined);
  assert.equal(environment.SAFRS_CREDENTIAL_URL, undefined);
  assert.equal(environment.HOME, isolatedHome);
  assert.equal(environment.USERPROFILE, isolatedHome);
  assert.ok(environment.PATH.includes(path.dirname(process.execPath)));
  assert.ok(!environment.PATH.includes(forbiddenRoot));
});

test("status validates structural readiness without lifecycle execution", async () => {
  const { root, capsule } = await createRepository();
  try {
    const results = await statusCapsules({
      root,
      selector: "internal/example",
      checkerPath,
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "internal/example");
    assert.equal(results[0].structural, "PASS");
    await assert.rejects(readFile(path.join(capsule, "stages.log")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("status rejects missing capsule-owned programs before execution", async () => {
  const invalid = contract();
  invalid.commands.install = { program: "./missing-install.mjs", args: [] };
  const { root } = await createRepository(invalid);
  try {
    await assert.rejects(
      statusCapsules({ root, selector: "internal/example", checkerPath }),
      /commands\.install\.program is missing/iu,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI status emits a concise deterministic readiness ledger", async () => {
  const { root } = await createRepository();
  let output = "";
  try {
    const exitCode = await runCli(["status", "projects/internal/example"], {
      root,
      checkerPath,
      stdout: {
        write: (chunk) => {
          output += chunk;
        },
      },
    });
    assert.equal(exitCode, 0);
    assert.match(output, /^CAPSULE internal\/example$/mu);
    assert.match(output, /^ {2}contract: PASS \(R1\)$/mu);
    assert.match(output, /^ {2}structural: PASS$/mu);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("verify runs the finite lifecycle in order inside an extracted capsule", async () => {
  const { root, capsule } = await createRepository();
  process.env.SAFRS_TEST_SECRET = "sentinel-secret";
  process.env.SAFRS_CREDENTIAL_URL = "https://user:pass@example.invalid/path";
  try {
    const result = await verifyCapsule({
      root,
      selector: "internal/example",
      checkerPath,
    });
    assert.equal(result.ok, true);
    assert.deepEqual(
      result.stages.map(({ name, status }) => [name, status]),
      [
        ["install", "PASS"],
        ["lint", "SKIP"],
        ["typecheck", "SKIP"],
        ["test", "PASS"],
        ["build", "PASS"],
        ["artifacts", "PASS"],
        ["deployDryRun", "PASS"],
        ["run", "PASS"],
        ["cleanup", "PASS"],
      ],
    );
    assert.equal(result.extractedRemoved, true);
    await assert.rejects(readFile(path.join(capsule, "stages.log")));
  } finally {
    delete process.env.SAFRS_TEST_SECRET;
    delete process.env.SAFRS_CREDENTIAL_URL;
    await rm(root, { recursive: true, force: true });
  }
});

test("HTTP smoke starts run once, probes it, and terminates the process tree", async () => {
  const port = await unusedPort();
  const httpContract = contract({
    commands: { ...contract().commands, run: command("http") },
    smoke: {
      kind: "http",
      host: "127.0.0.1",
      port,
      path: "/ready",
      expectedStatus: 204,
      startupTimeoutSeconds: 5,
    },
  });
  const { root } = await createRepository(httpContract);
  try {
    const result = await verifyCapsule({
      root,
      selector: "internal/example",
      checkerPath,
    });
    assert.equal(result.ok, true);
    assert.equal(
      result.stages.filter((stage) => stage.name === "run").length,
      1,
    );
    assert.equal(
      result.stages.find((stage) => stage.name === "smoke")?.status,
      "PASS",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("missing artifacts fail verification and still clean extraction", async () => {
  const missingArtifact = contract({ artifacts: ["dist/missing.txt"] });
  const { root } = await createRepository(missingArtifact);
  try {
    await assert.rejects(
      verifyCapsule({ root, selector: "internal/example", checkerPath }),
      (error) => {
        assert.match(error.message, /artifact.*missing/iu);
        assert.equal(error.result?.stages.at(-1)?.name, "cleanup");
        assert.equal(error.result?.stages.at(-1)?.status, "PASS");
        assert.equal(error.result?.extractedRemoved, true);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a symlink created by a lifecycle command is rejected before the next stage", async (context) => {
  const { root } = await createRepository();
  const preflightTarget = path.join(root, "preflight-target");
  const preflightLink = path.join(root, "preflight-link");
  await mkdir(preflightTarget);
  try {
    try {
      await symlink(preflightTarget, preflightLink, "dir");
      await rm(preflightLink);
    } catch (error) {
      if (error?.code === "EPERM") {
        context.skip("This Windows account cannot create test symlinks.");
        return;
      }
      throw error;
    }
    const unsafeContract = contract();
    unsafeContract.commands.install = command("mutate-link");
    await writeFile(
      path.join(
        root,
        "projects",
        "internal",
        "example",
        "project.contract.json",
      ),
      `${JSON.stringify(unsafeContract, null, 2)}\n`,
    );
    await assert.rejects(
      verifyCapsule({ root, selector: "internal/example", checkerPath }),
      /symbolic link|reparse point/iu,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("command timeout terminates the real child process", async () => {
  const root = await temporaryDirectory();
  try {
    const result = await runCommand(
      "node",
      ["-e", "setInterval(() => {}, 1000)"],
      {
        cwd: root,
        env: createSanitizedEnvironment(),
        timeoutMs: 100,
      },
    );
    assert.equal(result.timedOut, true);
    assert.equal(result.exitCode, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a lifecycle failure remains primary while extraction is cleaned", async () => {
  const failing = contract();
  failing.commands.test = { program: "node", args: ["-e", "process.exit(7)"] };
  const { root } = await createRepository(failing);
  try {
    await assert.rejects(
      verifyCapsule({ root, selector: "internal/example", checkerPath }),
      (error) => {
        assert.match(error.message, /test.*exit code 7/iu);
        assert.equal(error.result?.stages.at(-1)?.name, "cleanup");
        assert.equal(error.result?.stages.at(-1)?.status, "PASS");
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
