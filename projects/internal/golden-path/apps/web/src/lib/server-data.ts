import { app } from "@safrs/api";
import { cacheLife, cacheTag } from "next/cache";

export type ReadinessItem = {
  detail: string;
  state: "attention" | "ready";
};

export type Readiness = {
  api: ReadinessItem;
  database: ReadinessItem;
};

export async function readApiStatus(): Promise<ReadinessItem> {
  "use cache";

  cacheLife("minutes");
  cacheTag("safrs:readiness:api");

  try {
    const response = await app.request("/api/health");
    if (response.ok) {
      return { detail: "Endpoint Hono merespons.", state: "ready" };
    }
  } catch {
    // The readiness desk stays useful when a dependency is unavailable.
  }

  return {
    detail: "API belum dapat diperiksa. Jalankan pnpm setup lalu muat ulang.",
    state: "attention",
  };
}

export async function readDatabaseStatus(): Promise<ReadinessItem> {
  try {
    const { database } = await import("@safrs/database");
    await database.$queryRawUnsafe("SELECT 1");

    return { detail: "PostgreSQL dapat dijangkau.", state: "ready" };
  } catch {
    return {
      detail:
        "Database belum siap. Jalankan pnpm setup lalu muat ulang halaman ini.",
      state: "attention",
    };
  }
}

export async function getReadiness(): Promise<Readiness> {
  const [database, api] = await Promise.all([
    readDatabaseStatus(),
    readApiStatus(),
  ]);

  return { api, database };
}

export type DemoView = {
  createdAt: string;
  id: string;
  name: string;
};

export async function readDemos(): Promise<DemoView[]> {
  try {
    const { database } = await import("@safrs/database");
    const rows = await database.demo.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return rows.map((demo) => ({
      createdAt: demo.createdAt.toISOString(),
      id: demo.id,
      name: demo.name,
    }));
  } catch {
    return [];
  }
}
