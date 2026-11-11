-- CreateTable
CREATE TABLE "key_envelopes" (
    "id" UUID NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "sender_device_id" TEXT NOT NULL,
    "recipient_device_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "key_envelopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "key_envelopes_workspace_id_recipient_device_id_created_at_idx" ON "key_envelopes"("workspace_id", "recipient_device_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "key_envelopes_sender_device_id_recipient_device_id_version_key" ON "key_envelopes"("sender_device_id", "recipient_device_id", "version");

-- AddForeignKey
ALTER TABLE "key_envelopes" ADD CONSTRAINT "key_envelopes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_envelopes" ADD CONSTRAINT "key_envelopes_sender_device_id_fkey" FOREIGN KEY ("sender_device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_envelopes" ADD CONSTRAINT "key_envelopes_recipient_device_id_fkey" FOREIGN KEY ("recipient_device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
