import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const capsule = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function read(relative) {
  return readFile(path.join(capsule, relative), "utf8");
}

async function readJson(relative) {
  return JSON.parse(await read(relative));
}

async function runScript(relative) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [relative], {
      cwd: capsule,
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) =>
      resolve({ exitCode: null, error, stdout, stderr }),
    );
    child.once("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}

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

async function verifyBuiltServer(dist) {
  const port = await unusedPort();
  const child = spawn(process.execPath, ["server.js"], {
    cwd: dist,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
    shell: false,
    stdio: "ignore",
    windowsHide: true,
  });
  let spawnError;
  child.once("error", (error) => {
    spawnError = error;
  });
  try {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) {
        throw new Error(`Built server exited early with ${child.exitCode}.`);
      }
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`, {
          signal: AbortSignal.timeout(500),
        });
        await response.body?.cancel();
        if (response.status === 200) return;
      } catch {
        // The server may still be starting inside the bounded deadline.
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Built server did not pass HTTP smoke within 5 seconds.");
  } finally {
    if (child.exitCode === null) child.kill();
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      const onClose = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        child.off("close", onClose);
        resolve();
      }, 2000);
      child.once("close", onClose);
    });
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

test("standalone contract owns the complete lifecycle", async () => {
  const contract = await readJson("project.contract.json");
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.id, "corporate/portfolio-drnovia");
  assert.deepEqual(contract.packageManager, {
    name: "none",
    version: null,
    lockfile: null,
  });
  assert.deepEqual(contract.commands.install, {
    program: "node",
    args: ["scripts/install.mjs"],
  });
  assert.deepEqual(contract.commands.test, {
    program: "node",
    args: [
      "--test",
      "tests/capsule-paths.test.mjs",
      "tests/lenis-contract.test.mjs",
      "tests/standalone-contract.test.mjs",
    ],
  });
  assert.deepEqual(contract.commands.build, {
    program: "node",
    args: ["scripts/build.mjs"],
  });
  assert.deepEqual(contract.commands.run, {
    program: "node",
    args: ["server.js"],
  });
  assert.deepEqual(contract.commands.deployDryRun, {
    program: "node",
    args: ["scripts/deploy-dry-run.mjs"],
  });
  assert.equal(contract.commands.lint.program, null);
  assert.equal(contract.commands.typecheck.program, null);
  assert.deepEqual(contract.artifacts, ["dist"]);
  assert.deepEqual(contract.mutableStatePaths, []);
  assert.equal(contract.smoke.kind, "http");
  assert.equal(contract.smoke.host, "127.0.0.1");
  assert.equal(contract.smoke.port, 4173);
});

test("package scripts are capsule-local aliases of the contract", async () => {
  const manifest = await readJson("package.json");
  assert.deepEqual(manifest.scripts, {
    install: "node scripts/install.mjs",
    build: "node scripts/build.mjs",
    test: "node --test tests/capsule-paths.test.mjs tests/lenis-contract.test.mjs tests/standalone-contract.test.mjs",
    start: "node server.js",
    dev: "node server.js",
    "deploy:dry-run": "node scripts/deploy-dry-run.mjs",
  });
  assert.equal(manifest.engines.node, ">=24 <25");
  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    assert.equal(manifest[field], undefined);
  }
});

test("Docker deployment is pinned and uses exec-form lifecycle commands", async () => {
  const dockerfile = await read("Dockerfile");
  const pinnedImage =
    "node:24-alpine3.22@sha256:191c9f0080fcbbc6547a85dc0ff7988072214a355aabdc1d2ec55a7dae5eea8a";
  assert.equal(dockerfile.match(new RegExp(pinnedImage, "g"))?.length, 2);
  assert.match(dockerfile, /RUN \["node", "scripts\/install\.mjs"\]/u);
  assert.match(dockerfile, /RUN \["node", "scripts\/build\.mjs"\]/u);
  assert.match(
    dockerfile,
    /COPY --from=build --chown=node:node \/workspace\/dist\/ \.\//u,
  );
  assert.match(dockerfile, /USER node/u);
  assert.match(dockerfile, /CMD \["node", "server\.js"\]/u);
  assert.doesNotMatch(dockerfile, /\.\.\//u);
});

test("capsule lifecycle builds deterministically and dry-run detects tampering", async () => {
  const dist = path.join(capsule, "dist");
  try {
    const install = await runScript("scripts/install.mjs");
    assert.equal(install.exitCode, 0, install.stderr);

    const firstBuild = await runScript("scripts/build.mjs");
    assert.equal(firstBuild.exitCode, 0, firstBuild.stderr);
    await verifyBuiltServer(dist);
    const firstManifest = await read("dist/build-manifest.json");

    const deploy = await runScript("scripts/deploy-dry-run.mjs");
    assert.equal(deploy.exitCode, 0, deploy.stderr);
    assert.match(deploy.stdout, /no external write/u);

    await writeFile(path.join(dist, "undeclared.txt"), "unexpected\n");
    const undeclared = await runScript("scripts/deploy-dry-run.mjs");
    assert.notEqual(undeclared.exitCode, 0);
    assert.match(undeclared.stderr, /undeclared files/u);

    const restoredBuild = await runScript("scripts/build.mjs");
    assert.equal(restoredBuild.exitCode, 0, restoredBuild.stderr);
    await writeFile(path.join(dist, "index.html"), "tampered\n");
    const rejected = await runScript("scripts/deploy-dry-run.mjs");
    assert.notEqual(rejected.exitCode, 0);
    assert.match(rejected.stderr, /integrity mismatch/u);

    const secondBuild = await runScript("scripts/build.mjs");
    assert.equal(secondBuild.exitCode, 0, secondBuild.stderr);
    assert.equal(await read("dist/build-manifest.json"), firstManifest);
  } finally {
    await rm(dist, { recursive: true, force: true });
  }
});
