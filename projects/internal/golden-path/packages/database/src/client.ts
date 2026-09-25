import { PrismaPg } from "@prisma/adapter-pg";
import { serverEnv } from "@safrs/env/server";
import { PrismaClient } from "./generated/prisma/client.ts";

const globalForDatabase = globalThis as typeof globalThis & {
  database?: PrismaClient;
};

function createDatabaseClient() {
  const adapter = new PrismaPg({
    connectionString: serverEnv.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
    max: 5,
  });

  return new PrismaClient({ adapter });
}

export const database = globalForDatabase.database ?? createDatabaseClient();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.database = database;
}
