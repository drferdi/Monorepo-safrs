-- AlterTable
ALTER TABLE "computers" ALTER COLUMN "scope" SET DEFAULT 'team';

-- CreateTable
CREATE TABLE "entitlement_states" (
    "workspace_id" TEXT NOT NULL,
    "plan_code" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlement_states_pkey" PRIMARY KEY ("workspace_id")
);

-- CreateTable
CREATE TABLE "runtime_leases" (
    "workspace_id" TEXT NOT NULL,
    "active_runtime_id" TEXT NOT NULL,
    "execution_epoch" INTEGER NOT NULL,
    "lease_expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runtime_leases_pkey" PRIMARY KEY ("workspace_id")
);

-- CreateTable
CREATE TABLE "sync_object_index" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "opaque_object_id" TEXT NOT NULL,
    "object_type" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "ciphertext_locator" TEXT NOT NULL,
    "tombstoned_at" TIMESTAMP(3),
    "cursor_seq" BIGINT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_object_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sync_object_index_user_id_cursor_seq_idx" ON "sync_object_index"("user_id", "cursor_seq");

-- CreateIndex
CREATE UNIQUE INDEX "sync_object_index_user_id_opaque_object_id_key" ON "sync_object_index"("user_id", "opaque_object_id");

-- CreateIndex
CREATE INDEX "outbox_events_sent_at_created_at_idx" ON "outbox_events"("sent_at", "created_at");

-- RenameIndex
ALTER INDEX "action_approval_rules_workspaceId_createdByUserId_effect_matchK" RENAME TO "action_approval_rules_workspaceId_createdByUserId_effect_ma_key";
