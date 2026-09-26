-- CreateTable
CREATE TABLE "crew_passkeys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT,
    "device_type" TEXT NOT NULL,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "crew_passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crew_passkeys_credential_id_key" ON "crew_passkeys"("credential_id");

-- CreateIndex
CREATE INDEX "crew_passkeys_user_id_idx" ON "crew_passkeys"("user_id");

-- AddForeignKey
ALTER TABLE "crew_passkeys" ADD CONSTRAINT "crew_passkeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "crew_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
