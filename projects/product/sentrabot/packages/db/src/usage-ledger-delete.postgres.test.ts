import { afterAll, describe, expect, it } from "vitest";
import { createDb, type PrismaClient } from "./client.js";

const databaseUrl = process.env.DATABASE_URL;
const describePostgres =
  process.env.VERIFY_DATABASE && databaseUrl ? describe.sequential : describe.skip;

describePostgres("usage ledger delete cascade (PostgreSQL)", () => {
  const suffix = `${Date.now()}`;
  const userId = `usage-ledger-user-${suffix}`;
  const workspaceId = `usage-ledger-ws-${suffix}`;
  let prisma: PrismaClient;
  let close: (() => Promise<void>) | undefined;
  let created = false;

  afterAll(async () => {
    if (created) {
      await prisma.usageLedger.deleteMany({ where: { userId } });
      await prisma.usageReservation.deleteMany({ where: { userId } });
      await prisma.organization.deleteMany({ where: { id: workspaceId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await close?.();
  });

  it("deleting a user with usage ledger rows succeeds and cascades the ledger", async () => {
    const db = createDb(databaseUrl!);
    prisma = db.prisma;
    close = async () => {
      await db.prisma.$disconnect();
      await db.pool.end();
    };

    await prisma.user.create({
      data: {
        id: userId,
        name: "Usage Ledger Fixture",
        email: `usage-ledger-${suffix}@example.invalid`,
        emailVerified: false,
      },
    });
    await prisma.organization.create({
      data: {
        id: workspaceId,
        name: "Usage Ledger Workspace",
        slug: `usage-ledger-${suffix}`,
        createdAt: new Date(),
      },
    });
    await prisma.member.create({
      data: {
        id: `usage-ledger-member-${suffix}`,
        organizationId: workspaceId,
        userId,
        role: "owner",
        createdAt: new Date(),
      },
    });
    created = true;

    const reservation = await prisma.usageReservation.create({
      data: {
        userId,
        workspaceId,
        idempotencyKey: `usage-ledger-key-${suffix}`,
        capability: "chat",
        estimatedCostMicros: BigInt(1000),
        status: "finalized",
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await prisma.usageLedger.create({
      data: {
        userId,
        workspaceId,
        reservationId: reservation.id,
        provider: "test-provider",
        model: "test-model",
        inputTokens: 10,
        outputTokens: 20,
        actualCostMicros: BigInt(900),
        priceVersion: "2026-09-04",
      },
    });

    await expect(prisma.user.delete({ where: { id: userId } })).resolves.toBeDefined();

    expect(await prisma.usageLedger.count({ where: { userId } })).toBe(0);
    expect(await prisma.usageReservation.count({ where: { userId } })).toBe(0);
  });
});
