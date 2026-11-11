import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("[DATABASE] SEED DITOLAK: DATABASE_URL wajib tersedia.");
}

const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const demo = {
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  id: "00000000-0000-4000-8000-000000000001",
  name: "Sentra Demo",
};

async function main() {
  await database.demo.upsert({
    where: { id: demo.id },
    create: demo,
    update: demo,
  });
}

try {
  await main();
} finally {
  await database.$disconnect();
}
