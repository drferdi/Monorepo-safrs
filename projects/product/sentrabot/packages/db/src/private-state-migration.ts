export type WorkspacePrivacyMode = "legacy" | "e2ee_ready";

export interface LegacyPrivateStateRecord {
  objectId: string;
  objectType: "bot" | "conversation" | "memory" | "setting";
  version: number;
  plaintext: string;
}

export interface WorkspacePrivacyMigrationDatabase {
  workspacePrivacyState: {
    upsert(input: {
      where: { workspaceId: string };
      create: { workspaceId: string; mode: WorkspacePrivacyMode; migratedAt: Date };
      update: { mode: WorkspacePrivacyMode; migratedAt: Date };
    }): Promise<unknown>;
  };
}

/**
 * The caller owns the explicit export/import UX. This marks the Control Plane
 * only after the trusted Desktop Runtime has acknowledged local encrypted
 * import; source records are intentionally untouched.
 */
export async function migrateWorkspaceToE2ee(
  db: WorkspacePrivacyMigrationDatabase,
  input: {
    workspaceId: string;
    importEncryptedLocally(): Promise<void>;
    now: Date;
  },
): Promise<void> {
  await input.importEncryptedLocally();
  await acknowledgeWorkspaceE2eeMigration(db, {
    workspaceId: input.workspaceId,
    now: input.now,
  });
}

/**
 * The Desktop Runtime calls this only after completing its local encrypted
 * import. It changes no legacy source records and never carries private data.
 */
export async function acknowledgeWorkspaceE2eeMigration(
  db: WorkspacePrivacyMigrationDatabase,
  input: { workspaceId: string; now: Date },
): Promise<void> {
  await db.workspacePrivacyState.upsert({
    where: { workspaceId: input.workspaceId },
    create: { workspaceId: input.workspaceId, mode: "e2ee_ready", migratedAt: input.now },
    update: { mode: "e2ee_ready", migratedAt: input.now },
  });
}

/** Snapshot only user-owned bot, conversation, memory, and routine state. Secrets stay out. */
export async function exportLegacyPrivateState(
  db: {
    bot: { findMany(input: unknown): Promise<Array<Record<string, unknown>>> };
    thread: { findMany(input: unknown): Promise<Array<Record<string, unknown>>> };
    memoryDocument: { findMany(input: unknown): Promise<Array<Record<string, unknown>>> };
    routine: { findMany(input: unknown): Promise<Array<Record<string, unknown>>> };
  },
  owner: { userId: string; workspaceId: string },
): Promise<LegacyPrivateStateRecord[]> {
  const where = { userId: owner.userId, workspaceId: owner.workspaceId };
  const [bots, threads, memories, routines] = await Promise.all([
    db.bot.findMany({
      where,
      select: {
        id: true,
        name: true,
        title: true,
        description: true,
        instructions: true,
        color: true,
        notifyOnFinish: true,
        pinned: true,
        position: true,
        archivedAt: true,
        memoryScope: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.thread.findMany({
      where,
      include: {
        messages: {
          orderBy: { seq: "asc" },
          select: {
            id: true,
            seq: true,
            role: true,
            blocks: true,
            botId: true,
            replyToMessageId: true,
            createdAt: true,
          },
        },
      },
    }),
    db.memoryDocument.findMany({
      where,
      select: {
        id: true,
        botId: true,
        scope: true,
        path: true,
        content: true,
        revision: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.routine.findMany({
      where,
      select: {
        id: true,
        botId: true,
        threadId: true,
        name: true,
        prompt: true,
        crons: true,
        timezone: true,
        active: true,
        notify: true,
        webhookEnabled: true,
        lastRunAt: true,
        nextRunAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);
  return [
    ...toRecords("bot", bots, 1),
    ...toRecords("conversation", threads, 1),
    ...toRecords("memory", memories, (row) => Number(row.revision) || 1),
    ...toRecords("setting", routines, 1),
  ];
}

function toRecords(
  objectType: LegacyPrivateStateRecord["objectType"],
  rows: Array<Record<string, unknown>>,
  version: number | ((row: Record<string, unknown>) => number),
): LegacyPrivateStateRecord[] {
  const prefix =
    objectType === "conversation" ? "thread" : objectType === "setting" ? "routine" : objectType;
  return rows.map((row) => ({
    objectId: `legacy:${prefix}:${String(row.id)}`,
    objectType,
    version: typeof version === "function" ? version(row) : version,
    plaintext: JSON.stringify(row),
  }));
}
