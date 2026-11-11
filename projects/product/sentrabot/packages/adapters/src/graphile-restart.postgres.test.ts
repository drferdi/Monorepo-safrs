import { type BackgroundJobHandlers, runContinueJob, runJobKey } from "@sentrabot/adapter-kit";
import { makeWorkerUtils } from "graphile-worker";
import { Client } from "pg";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { GraphileJobPublisher, GraphileJobWorkerHost } from "./wakeup.js";

const databaseUrl = process.env.DATABASE_URL;
const describePostgres =
  process.env.VERIFY_DATABASE && databaseUrl ? describe.sequential : describe.skip;

const DEAD_WORKER_ID = "dead-worker";

function handlers(overrides: Partial<BackgroundJobHandlers> = {}): BackgroundJobHandlers {
  return {
    "run.continue": vi.fn(async () => undefined),
    "routine.wakeup": vi.fn(async () => undefined),
    "computer.sleep": vi.fn(async () => undefined),
    "computer.control-expire": vi.fn(async () => undefined),
    "skill.teaching-expire": vi.fn(async () => undefined),
    "history.compact": vi.fn(async () => undefined),
    "phone.deliver": vi.fn(async () => undefined),
    ...overrides,
  };
}

async function waitFor(assertion: () => void, timeoutMs = 10_000): Promise<void> {
  await vi.waitFor(assertion, { timeout: timeoutMs, interval: 25 });
}

async function settle(ms = 300): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Removes the keyed job and any orphaned row left behind by the simulated dead worker. */
async function purge(client: Client, key: string): Promise<void> {
  await client.query("select graphile_worker.remove_job($1::text)", [key]);
  await client.query("delete from graphile_worker._private_jobs where locked_by = $1", [
    DEAD_WORKER_ID,
  ]);
}

describePostgres("Graphile job recovery after a worker dies", () => {
  // Self-sufficient: the graphile_worker schema must exist before purge() touches it.
  beforeAll(async () => {
    const utils = await makeWorkerUtils({ connectionString: databaseUrl! });
    await utils.migrate();
    await utils.release();
  });

  it("a job locked by a dead worker is re-driven after a keyed re-enqueue", async () => {
    const publisher = new GraphileJobPublisher(databaseUrl!);
    const host = new GraphileJobWorkerHost(databaseUrl!, { concurrency: 1, pollInterval: 25 });
    const client = new Client({ connectionString: databaseUrl! });
    const observed: string[] = [];
    const target = handlers({
      "run.continue": async ({ runId }) => {
        observed.push(runId);
      },
    });
    const key = runJobKey("run-dead-1");

    await client.connect();
    try {
      await purge(client, key);

      // The run reconciler's world: a job was enqueued, a worker picked it up and then died,
      // so the row stays locked (graphile only reclaims such rows after its stale-lock window
      // of `interval '4 hours'` - see graphile-worker sql/000016.sql and sql/000018.sql).
      await publisher.enqueue(runContinueJob("run-dead-1"));
      const locked = await client.query(
        `update graphile_worker._private_jobs
            set locked_at = now() - interval '2 hours', locked_by = $2
          where key = $1`,
        [key, DEAD_WORKER_ID],
      );
      expect(locked.rowCount).toBe(1);

      // What the reconciler does after the lease expires: re-enqueue under the same job key.
      await publisher.enqueue(runContinueJob("run-dead-1"));

      await host.start(target);
      await waitFor(() => expect(observed).toEqual(["run-dead-1"]));
      await settle();
      expect(observed).toEqual(["run-dead-1"]);

      // Mechanism: the keyed re-enqueue does not preempt the dead worker's lock. graphile's
      // `add_jobs` orphans the locked row (key = null, attempts = max_attempts, so it is
      // permanently failed and will never run again) and inserts a fresh, unlocked row under
      // the key. Recovery is therefore prompt and does not wait for the 4 hour stale-lock timeout.
      const orphan = await client.query<{
        key: string | null;
        attempts: number;
        max_attempts: number;
      }>(
        `select key, attempts, max_attempts
           from graphile_worker._private_jobs
          where locked_by = $1`,
        [DEAD_WORKER_ID],
      );
      expect(orphan.rowCount).toBe(1);
      expect(orphan.rows[0]?.key).toBeNull();
      expect(orphan.rows[0]?.attempts).toBe(orphan.rows[0]?.max_attempts);
    } finally {
      await host.stop();
      await purge(client, key).catch(() => undefined);
      await publisher.close();
      await client.end();
    }
  });

  it("a keyed re-enqueue while the job is unlocked runs exactly once", async () => {
    const publisher = new GraphileJobPublisher(databaseUrl!);
    const host = new GraphileJobWorkerHost(databaseUrl!, { concurrency: 1, pollInterval: 25 });
    const client = new Client({ connectionString: databaseUrl! });
    const observed: string[] = [];
    const target = handlers({
      "run.continue": async ({ runId }) => {
        observed.push(runId);
      },
    });
    const key = runJobKey("run-keyed-once");

    await client.connect();
    try {
      await purge(client, key);

      // No worker is running, so both enqueues land on an unlocked row: the second replaces
      // the first instead of queueing a duplicate. This is the semantics the reconciler leans on.
      await publisher.enqueue(runContinueJob("run-keyed-once"));
      await publisher.enqueue(runContinueJob("run-keyed-once"));

      await host.start(target);
      await waitFor(() => expect(observed).toEqual(["run-keyed-once"]));
      await settle();
      expect(observed).toEqual(["run-keyed-once"]);
    } finally {
      await host.stop();
      await purge(client, key).catch(() => undefined);
      await publisher.close();
      await client.end();
    }
  });
});
