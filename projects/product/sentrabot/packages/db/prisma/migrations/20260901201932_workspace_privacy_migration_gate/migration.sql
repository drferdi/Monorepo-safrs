-- CreateTable
CREATE TABLE "workspace_privacy_states" (
    "workspace_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'legacy',
    "migrated_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_privacy_states_pkey" PRIMARY KEY ("workspace_id")
);

-- AddForeignKey
ALTER TABLE "workspace_privacy_states" ADD CONSTRAINT "workspace_privacy_states_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
