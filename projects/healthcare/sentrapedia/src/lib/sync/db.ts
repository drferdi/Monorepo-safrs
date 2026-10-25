import "server-only";
import { Pool, type PoolClient } from "pg";

// Driver choice, from the installed Neon agent skill (skills/neon-postgres/SKILL.md): node-postgres for
// long-running runtimes that reuse a pool, @neondatabase/serverless for serverless and edge. This app is a
// long-lived Next standalone process, so node-postgres it is.
//
// Connection string: the POOLED url, which that skill names for ordinary application traffic. Pooling runs
// PgBouncer in transaction mode, which drops session state between transactions - which is exactly why the
// principal is set with set_config(..., true), transaction-local, inside the same transaction as the query.
// A session-level SET would silently not survive the pooler. Migrations use the unpooled url instead.
//
// The role in SENTRAPEDIA_DATABASE_URL must be sentrapedia_runtime, never neondb_owner: Neon's owner role has
// rolbypassrls = true, verified on this project, so connecting as the owner would skip every policy and
// "force row level security" would not help. That role is the only thing making RLS real here.

let pool: Pool | null = null;

export function syncConfigured(): boolean {
  return !!process.env.SENTRAPEDIA_DATABASE_URL && process.env.SENTRAPEDIA_SYNC_MODE !== "off";
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.SENTRAPEDIA_DATABASE_URL, max: 4, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
    // A pool error must not take the process down; the next request opens a fresh connection.
    pool.on("error", () => undefined);
  }
  return pool;
}

// Every query runs through here, so no code path can reach a table without a principal set. With none set the
// policies read current_setting('app.user_id', true) as null, which matches no row, so the failure is a denial.
export async function withPrincipal<T>(principal: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true)", [principal]);
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try { await client.query("rollback"); } catch { /* the connection is already unusable */ }
    throw error;
  } finally {
    client.release();
  }
}

export async function closeSyncPool(): Promise<void> {
  const current = pool;
  pool = null;
  await current?.end();
}
