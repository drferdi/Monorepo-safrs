import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { canonicalize } from "../../automation/src/canonical-json.mjs";
import {
  nextEvent,
  replayState,
  scopeDigest,
  verifyEventChain,
} from "../../automation/src/leases.mjs";
import { runTaskCommand } from "../src/cli.mjs";
import { atomicReplaceFile, transferJournalPath } from "../src/storage.mjs";
import {
  executeScopeTransfer,
  recoverTransferJournal,
} from "../src/transfer.mjs";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

const WHEN = "2026-10-01T00:00:00Z";

function task(id, state, scopes) {
  return {
    id,
    title: id,
    state,
    risk: "R1",
    scope_prefixes: scopes,
    allowed_tools: [],
    owner_id: "owner",
    owner_label: "Owner",
    worktree_id: "main",
    claimed_at: WHEN,
    updated_at: WHEN,
    expires_at: null,
  };
}

function claimLine(item) {
  const outcome = nextEvent(
    [],
    {
      action: "CLAIM",
      task_id: item.id,
      lease_id: `LEASE-${item.id}`,
      actor: item.owner_id,
      worktree_id: item.worktree_id,
      scope_prefixes: item.scope_prefixes,
      expires_at: null,
    },
    {
      occurred_at: WHEN,
      authority_run_url: null,
      event_id: `claim-${item.id}`,
    },
  );
  assert.equal(outcome.denied, undefined);
  return canonicalize(outcome.event);
}

function fixture(tasks) {
  const directory = mkdtempSync(join(tmpdir(), "safrs-transfer-"));
  const paths = {
    controlDirectory: directory,
    registryPath: join(directory, "active-tasks.json"),
    lockPath: join(directory, "active-tasks.lock"),
    leaseEventsPath: join(directory, "lease-events.ndjson"),
  };
  writeFileSync(
    paths.registryPath,
    `${JSON.stringify({ version: 1, tasks }, null, 2)}\n`,
  );
  writeFileSync(
    paths.leaseEventsPath,
    `${tasks.map((item) => claimLine(item)).join("\n")}\n`,
  );
  return {
    directory,
    paths,
    cleanup() {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

function readRegistry(paths) {
  return JSON.parse(readFileSync(paths.registryPath, "utf8"));
}

function baseTasks() {
  return [
    task("TASK-20261013-SOURCE-A", "REVIEW", [
      "alpha.txt",
      "beta.txt",
      "keep-a.txt",
    ]),
    task("TASK-20261013-SOURCE-B", "EXECUTING", ["gamma.txt", "keep-b.txt"]),
    task("TASK-20261013-DEST-ONE", "EXECUTING", ["dest.txt"]),
  ];
}

function request(moves) {
  return {
    operationId: "TRANSFER-20261013-DEMO",
    destinationId: "TASK-20261013-DEST-ONE",
    actor: "gaffer",
    reason: "authorized test transfer",
    worktreeId: "main",
    moves,
  };
}

function temporaryNames(directory) {
  return readdirSync(directory).filter((name) => name.includes(".tmp"));
}

function fileStamp(path) {
  const stat = statSync(path);
  return {
    bytes: readFileSync(path),
    size: stat.size,
    mtimeMs: stat.mtimeMs,
  };
}

function contextFor(paths) {
  return { repositoryRoot, paths, worktreeId: "main" };
}

function runLocal(paths, argv) {
  return runTaskCommand(argv, contextFor(paths));
}

function runChild(paths, argv) {
  const cliHref = pathToFileURL(
    fileURLToPath(new URL("../src/cli.mjs", import.meta.url)),
  ).href;
  const script = `
    import { runTaskCommand } from ${JSON.stringify(cliHref)};
    const code = runTaskCommand(process.argv.slice(1), {
      repositoryRoot: ${JSON.stringify(repositoryRoot)},
      paths: ${JSON.stringify(paths)},
      worktreeId: "main",
    });
    process.exit(code ?? 0);
  `;
  return spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", script, ...argv],
    { encoding: "utf8" },
  );
}

function oneMove() {
  return request([{ sourceId: "TASK-20261013-SOURCE-A", path: "alpha.txt" }]);
}

test("transfers several paths from two active tasks in one operation", () => {
  const world = fixture(baseTasks());
  try {
    const before = readFileSync(world.paths.leaseEventsPath, "utf8");
    const result = executeScopeTransfer(
      world.paths,
      request([
        { sourceId: "TASK-20261013-SOURCE-A", path: "alpha.txt" },
        { sourceId: "TASK-20261013-SOURCE-A", path: "beta.txt" },
        { sourceId: "TASK-20261013-SOURCE-B", path: "gamma.txt" },
      ]),
    );
    assert.equal(result.events, 3);
    const registry = readRegistry(world.paths);
    const byId = new Map(registry.tasks.map((item) => [item.id, item]));
    assert.equal(byId.get("TASK-20261013-SOURCE-A").state, "REVIEW");
    assert.deepEqual(byId.get("TASK-20261013-SOURCE-A").scope_prefixes, [
      "keep-a.txt",
    ]);
    assert.equal(byId.get("TASK-20261013-SOURCE-B").state, "EXECUTING");
    assert.deepEqual(byId.get("TASK-20261013-SOURCE-B").scope_prefixes, [
      "keep-b.txt",
    ]);
    assert.equal(byId.get("TASK-20261013-DEST-ONE").state, "EXECUTING");
    assert.deepEqual(byId.get("TASK-20261013-DEST-ONE").scope_prefixes, [
      "dest.txt",
      "alpha.txt",
      "beta.txt",
      "gamma.txt",
    ]);
    const ledger = readFileSync(world.paths.leaseEventsPath, "utf8");
    assert.ok(ledger.startsWith(before.trimEnd()));
    const events = ledger
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    for (const id of [
      "TASK-20261013-SOURCE-A",
      "TASK-20261013-SOURCE-B",
      "TASK-20261013-DEST-ONE",
    ]) {
      const chain = events.filter((event) => event.task_id === id);
      assert.equal(chain[0].event_type, "CLAIM");
      assert.deepEqual(verifyEventChain(chain).errors, []);
      assert.equal(
        replayState(chain).scope_digest,
        scopeDigest(byId.get(id).scope_prefixes),
      );
      assert.equal(chain.at(-1).event_type, "SCOPE_AMEND");
      assert.equal(chain.at(-1).authorized_actor, "gaffer");
      assert.equal(chain.at(-1).next_state, chain[0].next_state);
      assert.equal(chain.at(-1).fencing_token, chain[0].fencing_token);
      assert.deepEqual(
        chain.map((event) => event.sequence),
        chain.map((_, index) => index + 1),
      );
    }
  } finally {
    world.cleanup();
  }
});

test("rejects a path the source does not exactly own", () => {
  const world = fixture(baseTasks());
  try {
    assert.throws(
      () =>
        executeScopeTransfer(
          world.paths,
          request([
            { sourceId: "TASK-20261013-SOURCE-A", path: "missing.txt" },
          ]),
        ),
      /does not exactly own/u,
    );
    assert.equal(
      readFileSync(world.paths.registryPath, "utf8").includes("missing.txt"),
      false,
    );
  } finally {
    world.cleanup();
  }
});

test("rejects a source or destination bound to another worktree", () => {
  for (const foreignId of [
    "TASK-20261013-SOURCE-A",
    "TASK-20261013-DEST-ONE",
  ]) {
    const tasks = baseTasks().map((item) =>
      item.id === foreignId
        ? { ...item, worktree_id: "worktrees/other" }
        : item,
    );
    const world = fixture(tasks);
    try {
      const before = readFileSync(world.paths.registryPath, "utf8");
      assert.throws(
        () =>
          executeScopeTransfer(
            world.paths,
            request([
              { sourceId: "TASK-20261013-SOURCE-A", path: "alpha.txt" },
            ]),
          ),
        new RegExp(`${foreignId} belongs to worktree worktrees/other`, "u"),
      );
      assert.equal(readFileSync(world.paths.registryPath, "utf8"), before);
    } finally {
      world.cleanup();
    }
  }
});

test("rejects a destination prefix that already covers the path", () => {
  const world = fixture([
    task("TASK-20261013-SOURCE-A", "REVIEW", ["docs/readme.md", "keep-a.txt"]),
    task("TASK-20261013-DEST-ONE", "EXECUTING", ["docs/"]),
  ]);
  try {
    assert.throws(
      () =>
        executeScopeTransfer(
          world.paths,
          request([
            { sourceId: "TASK-20261013-SOURCE-A", path: "docs/readme.md" },
          ]),
        ),
      /already overlaps/u,
    );
  } finally {
    world.cleanup();
  }
});

test("a held registry lock rejects a concurrent transfer", () => {
  const world = fixture(baseTasks());
  const handle = openSync(world.paths.lockPath, "wx");
  const registry = readFileSync(world.paths.registryPath);
  const ledger = readFileSync(world.paths.leaseEventsPath);
  try {
    assert.throws(
      () =>
        executeScopeTransfer(
          world.paths,
          request([{ sourceId: "TASK-20261013-SOURCE-A", path: "alpha.txt" }]),
        ),
      /locked/u,
    );
    assert.equal(existsSync(world.paths.lockPath), true);
    assert.deepEqual(readFileSync(world.paths.registryPath), registry);
    assert.deepEqual(readFileSync(world.paths.leaseEventsPath), ledger);
  } finally {
    closeSync(handle);
    world.cleanup();
  }
});

test("a failed ledger write rolls the registry back", () => {
  const world = fixture(baseTasks());
  const original = readFileSync(world.paths.registryPath, "utf8");
  const ledger = readFileSync(world.paths.leaseEventsPath, "utf8");
  try {
    assert.throws(
      () =>
        executeScopeTransfer(
          world.paths,
          request([{ sourceId: "TASK-20261013-SOURCE-A", path: "alpha.txt" }]),
          {
            afterRegistry() {
              throw new Error("interrupted");
            },
          },
        ),
      /interrupted/u,
    );
    assert.equal(readFileSync(world.paths.registryPath, "utf8"), original);
    assert.equal(readFileSync(world.paths.leaseEventsPath, "utf8"), ledger);
    assert.equal(existsSync(transferJournalPath(world.paths)), false);
    assert.deepEqual(temporaryNames(world.directory), []);
  } finally {
    world.cleanup();
  }
});

test("an abandoned registry write is completed from the journal", () => {
  const world = fixture(baseTasks());
  const originalLedger = readFileSync(world.paths.leaseEventsPath, "utf8");
  try {
    const abandoned = executeScopeTransfer(
      world.paths,
      request([{ sourceId: "TASK-20261013-SOURCE-A", path: "alpha.txt" }]),
      { abandonAfterRegistry: true },
    );
    assert.equal(abandoned.abandoned, true);
    assert.equal(
      readFileSync(world.paths.leaseEventsPath, "utf8"),
      originalLedger,
    );
    assert.equal(recoverTransferJournal(world.paths), true);
    const ledger = readFileSync(world.paths.leaseEventsPath, "utf8");
    assert.ok(ledger.startsWith(originalLedger));
    assert.equal(existsSync(transferJournalPath(world.paths)), false);
    assert.equal(recoverTransferJournal(world.paths), false);
    assert.equal(readFileSync(world.paths.leaseEventsPath, "utf8"), ledger);
    const events = ledger
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const amend = events.filter((event) => event.event_type === "SCOPE_AMEND");
    assert.equal(amend.length, 2);
  } finally {
    world.cleanup();
  }
});

test("replacement failure leaves the destination in place", () => {
  const world = fixture(baseTasks());
  const sample = join(world.directory, "sample.txt");
  writeFileSync(sample, "original\n");
  try {
    for (const stage of ["before", "during"]) {
      assert.throws(
        () => atomicReplaceFile(sample, "replacement\n", { failStage: stage }),
        /injected failure/u,
      );
      assert.equal(readFileSync(sample, "utf8"), "original\n");
      assert.equal(existsSync(sample), true);
    }
    assert.throws(
      () =>
        atomicReplaceFile(sample, "replacement\n", {
          replace() {
            throw new Error("injected failure during replacement");
          },
        }),
      /during replacement/u,
    );
    assert.equal(readFileSync(sample, "utf8"), "original\n");
    assert.throws(
      () => atomicReplaceFile(sample, "replacement\n", { failStage: "after" }),
      /after replacement/u,
    );
    assert.equal(readFileSync(sample, "utf8"), "replacement\n");
    assert.deepEqual(temporaryNames(world.directory), []);
    writeFileSync(sample, "original\n");
    let missing = false;
    atomicReplaceFile(sample, "replacement\n", {
      observe(target) {
        if (!existsSync(target)) {
          missing = true;
        }
      },
      replace(temporary, target) {
        if (!existsSync(target)) {
          missing = true;
        }
        renameSync(temporary, target);
        if (!existsSync(target)) {
          missing = true;
        }
      },
    });
    assert.equal(missing, false);
    assert.equal(readFileSync(sample, "utf8"), "replacement\n");
    const registry = readFileSync(world.paths.registryPath, "utf8");
    assert.throws(
      () =>
        executeScopeTransfer(world.paths, oneMove(), {
          registryReplaceOptions: {
            replace() {
              throw new Error("injected failure during replacement");
            },
          },
        }),
      /during replacement/u,
    );
    assert.equal(readFileSync(world.paths.registryPath, "utf8"), registry);
    assert.equal(existsSync(world.paths.registryPath), true);
    assert.equal(existsSync(transferJournalPath(world.paths)), false);
    assert.deepEqual(temporaryNames(world.directory), []);
  } finally {
    world.cleanup();
  }
});

test("concurrent claim, state, and close cannot append during transfer", () => {
  const attempts = [
    [
      "claim",
      "--id",
      "TASK-20261013-ISOLATED",
      "--title",
      "Isolated",
      "--owner-id",
      "owner",
      "--owner-label",
      "Owner",
      "--risk",
      "R1",
      "--scope",
      "isolated-claim.txt",
      "--state",
      "EXECUTING",
      "--yes",
    ],
    ["state", "--id", "TASK-20261013-SOURCE-B", "--to", "VERIFYING", "--yes"],
    ["close", "--id", "TASK-20261013-SOURCE-B", "--yes"],
  ];
  for (const argv of attempts) {
    const world = fixture(baseTasks());
    const before = readFileSync(world.paths.leaseEventsPath, "utf8");
    try {
      const outcome = executeScopeTransfer(world.paths, oneMove(), {
        afterRegistry() {
          const child = runChild(world.paths, argv);
          assert.equal(child.status, 1, `${argv[0]} ${child.stderr}`);
          assert.match(child.stderr, /locked/u);
        },
      });
      assert.equal(outcome.dryRun, false);
      const ledger = readFileSync(world.paths.leaseEventsPath, "utf8");
      assert.ok(ledger.startsWith(before));
      const events = ledger
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      assert.equal(
        events.some(
          (event) =>
            event.event_type === "TRANSITION" ||
            event.event_type === "RELEASE" ||
            event.task_id === "TASK-20261013-ISOLATED",
        ),
        false,
      );
    } finally {
      world.cleanup();
    }
  }
});

test("state then transfer keeps claim history and both new events", () => {
  const world = fixture(baseTasks());
  const before = readFileSync(world.paths.leaseEventsPath, "utf8");
  try {
    assert.equal(
      runLocal(world.paths, [
        "state",
        "--id",
        "TASK-20261013-SOURCE-B",
        "--to",
        "VERIFYING",
        "--yes",
      ]),
      0,
    );
    const moved = executeScopeTransfer(world.paths, oneMove());
    assert.equal(moved.events, 2);
    const ledger = readFileSync(world.paths.leaseEventsPath, "utf8");
    assert.ok(ledger.startsWith(before));
    const events = ledger
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const sourceB = events.filter(
      (event) => event.task_id === "TASK-20261013-SOURCE-B",
    );
    assert.deepEqual(
      sourceB.map((event) => event.event_type),
      ["CLAIM", "TRANSITION"],
    );
    assert.deepEqual(verifyEventChain(sourceB).errors, []);
    assert.equal(sourceB.at(-1).fencing_token, sourceB[0].fencing_token);
    assert.equal(
      readRegistry(world.paths).tasks.find(
        (item) => item.id === "TASK-20261013-SOURCE-B",
      ).state,
      "VERIFYING",
    );
  } finally {
    world.cleanup();
  }
});

test("close appends RELEASE without rewriting the claim", () => {
  const world = fixture(baseTasks());
  const before = readFileSync(world.paths.leaseEventsPath, "utf8");
  try {
    assert.equal(
      runLocal(world.paths, [
        "close",
        "--id",
        "TASK-20261013-SOURCE-B",
        "--yes",
      ]),
      0,
    );
    const ledger = readFileSync(world.paths.leaseEventsPath, "utf8");
    assert.ok(ledger.startsWith(before));
    const events = ledger
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const sourceB = events.filter(
      (event) => event.task_id === "TASK-20261013-SOURCE-B",
    );
    assert.deepEqual(
      sourceB.map((event) => event.event_type),
      ["CLAIM", "RELEASE"],
    );
    assert.equal(sourceB.at(-1).next_state, "ABORTED");
    assert.equal(sourceB[0].fencing_token, sourceB.at(-1).fencing_token);
    assert.deepEqual(verifyEventChain(sourceB).errors, []);
    assert.equal(
      readRegistry(world.paths).tasks.find(
        (item) => item.id === "TASK-20261013-SOURCE-B",
      ).state,
      "ABORTED",
    );
  } finally {
    world.cleanup();
  }
});

test("journal recovery is idempotent across interruption points", () => {
  const world = fixture(baseTasks());
  try {
    const original = readFileSync(world.paths.registryPath, "utf8");
    const originalLedger = readFileSync(world.paths.leaseEventsPath, "utf8");
    executeScopeTransfer(world.paths, oneMove(), {
      abandonAfterJournal: true,
    });
    assert.equal(readFileSync(world.paths.registryPath, "utf8"), original);
    assert.equal(recoverTransferJournal(world.paths), true);
    assert.equal(readFileSync(world.paths.registryPath, "utf8"), original);
    assert.equal(
      readFileSync(world.paths.leaseEventsPath, "utf8"),
      originalLedger,
    );
    assert.equal(recoverTransferJournal(world.paths), false);

    executeScopeTransfer(world.paths, oneMove(), {
      abandonAfterLedger: true,
    });
    const completed = readFileSync(world.paths.leaseEventsPath, "utf8");
    assert.ok(completed.startsWith(originalLedger));
    assert.equal(existsSync(transferJournalPath(world.paths)), true);
    assert.equal(recoverTransferJournal(world.paths), true);
    assert.equal(readFileSync(world.paths.leaseEventsPath, "utf8"), completed);
    assert.equal(recoverTransferJournal(world.paths), false);
    assert.equal(existsSync(transferJournalPath(world.paths)), false);
  } finally {
    world.cleanup();
  }
});

test("an orphan lock is left in place", () => {
  const world = fixture(baseTasks());
  const handle = openSync(world.paths.lockPath, "wx");
  const registry = readFileSync(world.paths.registryPath);
  const ledger = readFileSync(world.paths.leaseEventsPath);
  try {
    assert.throws(
      () =>
        executeScopeTransfer(world.paths, oneMove(), {
          abandonAfterRegistry: true,
        }),
      /locked/u,
    );
    assert.equal(runLocal(world.paths, ["recover"]), 1);
    assert.equal(existsSync(world.paths.lockPath), true);
    assert.deepEqual(readFileSync(world.paths.registryPath), registry);
    assert.deepEqual(readFileSync(world.paths.leaseEventsPath), ledger);
    assert.equal(existsSync(transferJournalPath(world.paths)), false);
  } finally {
    closeSync(handle);
    world.cleanup();
  }
});

test("recovery refuses a torn ledger and a foreign registry", () => {
  const world = fixture(baseTasks());
  try {
    executeScopeTransfer(world.paths, oneMove(), {
      abandonAfterRegistry: true,
    });
    const journal = readFileSync(transferJournalPath(world.paths));
    const registry = readFileSync(world.paths.registryPath);
    writeFileSync(world.paths.leaseEventsPath, '{"torn":true');
    assert.throws(
      () => recoverTransferJournal(world.paths),
      /torn trailing line/u,
    );
    assert.deepEqual(readFileSync(transferJournalPath(world.paths)), journal);
    assert.deepEqual(readFileSync(world.paths.registryPath), registry);
    writeFileSync(world.paths.leaseEventsPath, '{"kept":true}\n');
    writeFileSync(world.paths.registryPath, '{"version":1,"tasks":[]}\n');
    assert.throws(
      () => recoverTransferJournal(world.paths),
      /does not match the current registry/u,
    );
    assert.equal(
      readFileSync(world.paths.registryPath, "utf8"),
      '{"version":1,"tasks":[]}\n',
    );
    assert.equal(
      readFileSync(world.paths.leaseEventsPath, "utf8"),
      '{"kept":true}\n',
    );
    assert.deepEqual(readFileSync(transferJournalPath(world.paths)), journal);
  } finally {
    world.cleanup();
  }
});

test("dry-run with a pending journal changes no file metadata", () => {
  const world = fixture(baseTasks());
  try {
    executeScopeTransfer(world.paths, oneMove(), {
      abandonAfterRegistry: true,
    });
    const before = {
      registry: fileStamp(world.paths.registryPath),
      ledger: fileStamp(world.paths.leaseEventsPath),
      journal: fileStamp(transferJournalPath(world.paths)),
    };
    assert.equal(existsSync(world.paths.lockPath), false);
    const preview = executeScopeTransfer(world.paths, {
      ...oneMove(),
      dryRun: true,
    });
    assert.equal(preview.recoveryPending, true);
    assert.deepEqual(preview.touched, []);
    assert.deepEqual(fileStamp(world.paths.registryPath), before.registry);
    assert.deepEqual(fileStamp(world.paths.leaseEventsPath), before.ledger);
    assert.deepEqual(
      fileStamp(transferJournalPath(world.paths)),
      before.journal,
    );
    assert.equal(existsSync(world.paths.lockPath), false);
    const cli = runChild(world.paths, [
      "transfer",
      "--operation",
      "TRANSFER-20261013-DEMO",
      "--destination",
      "TASK-20261013-DEST-ONE",
      "--actor",
      "gaffer",
      "--reason",
      "authorized test transfer",
      "--move",
      "TASK-20261013-SOURCE-A=alpha.txt",
    ]);
    assert.equal(cli.status, 1, cli.stderr);
    assert.match(cli.stdout, /recoveryPending":true/u);
    assert.deepEqual(fileStamp(world.paths.registryPath), before.registry);
    assert.deepEqual(fileStamp(world.paths.leaseEventsPath), before.ledger);
    assert.deepEqual(
      fileStamp(transferJournalPath(world.paths)),
      before.journal,
    );
    assert.equal(existsSync(world.paths.lockPath), false);
  } finally {
    world.cleanup();
  }
});

test("a clean dry-run previews the transfer without writing", () => {
  const world = fixture(baseTasks());
  const registry = fileStamp(world.paths.registryPath);
  const ledger = fileStamp(world.paths.leaseEventsPath);
  try {
    const preview = executeScopeTransfer(world.paths, {
      ...oneMove(),
      dryRun: true,
    });
    assert.equal(preview.dryRun, true);
    assert.equal(preview.recoveryPending, false);
    assert.deepEqual(preview.touched, [
      "TASK-20261013-DEST-ONE",
      "TASK-20261013-SOURCE-A",
    ]);
    assert.deepEqual(fileStamp(world.paths.registryPath), registry);
    assert.deepEqual(fileStamp(world.paths.leaseEventsPath), ledger);
    assert.equal(existsSync(transferJournalPath(world.paths)), false);
    assert.equal(existsSync(world.paths.lockPath), false);
  } finally {
    world.cleanup();
  }
});

test("SCOPE_AMEND follows a RECLAIM without taking over the lease", () => {
  const item = task("TASK-20261013-SOURCE-A", "EXECUTING", [
    "alpha.txt",
    "keep-a.txt",
  ]);
  const destination = task("TASK-20261013-DEST-ONE", "EXECUTING", ["dest.txt"]);
  const world = fixture([item, destination]);
  try {
    const claim = nextEvent(
      [],
      {
        action: "CLAIM",
        task_id: item.id,
        lease_id: `LEASE-${item.id}`,
        actor: item.owner_id,
        worktree_id: item.worktree_id,
        scope_prefixes: item.scope_prefixes,
        expires_at: "2026-09-01T00:00:00Z",
      },
      {
        occurred_at: "2026-08-01T00:00:00Z",
        authority_run_url: null,
        event_id: "claim-reclaim",
      },
    );
    const reclaim = nextEvent(
      [claim.event],
      {
        action: "RECLAIM",
        task_id: item.id,
        lease_id: `LEASE-${item.id}`,
        actor: item.owner_id,
        worktree_id: item.worktree_id,
        scope_prefixes: item.scope_prefixes,
        expires_at: "2027-01-01T00:00:00Z",
        fencing_token: claim.event.fencing_token,
      },
      {
        occurred_at: WHEN,
        authority_run_url: null,
        event_id: "reclaim-1",
      },
    );
    assert.equal(reclaim.denied, undefined);
    const destinationClaim = claimLine(destination);
    writeFileSync(
      world.paths.leaseEventsPath,
      `${canonicalize(claim.event)}\n${canonicalize(reclaim.event)}\n${destinationClaim}\n`,
    );
    const before = readFileSync(world.paths.leaseEventsPath, "utf8");
    const moved = executeScopeTransfer(world.paths, oneMove());
    assert.equal(moved.events, 2);
    const ledger = readFileSync(world.paths.leaseEventsPath, "utf8");
    assert.ok(ledger.startsWith(before.trimEnd()));
    const chain = ledger
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
      .filter((event) => event.task_id === item.id);
    assert.deepEqual(
      chain.map((event) => event.event_type),
      ["CLAIM", "RECLAIM", "SCOPE_AMEND"],
    );
    assert.deepEqual(verifyEventChain(chain).errors, []);
    assert.equal(chain[1].fencing_token, chain[0].fencing_token + 1);
    assert.equal(chain[2].fencing_token, chain[1].fencing_token);
    assert.equal(replayState(chain).actor, item.owner_id);
    assert.equal(replayState(chain).worktree_id, item.worktree_id);
  } finally {
    world.cleanup();
  }
});
