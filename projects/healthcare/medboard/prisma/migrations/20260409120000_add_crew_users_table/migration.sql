-- CreateTable
CREATE TABLE "crew_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "institution" TEXT NOT NULL DEFAULT 'Puskesmas Balowerti Kota Kediri',
    "profession" TEXT NOT NULL DEFAULT 'Dokter',
    "role" TEXT NOT NULL DEFAULT 'DOKTER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" TEXT,

    CONSTRAINT "crew_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crew_users_username_key" ON "crew_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "crew_users_email_key" ON "crew_users"("email");

-- CreateIndex
CREATE INDEX "crew_users_username_idx" ON "crew_users"("username");

-- CreateIndex
CREATE INDEX "crew_users_status_idx" ON "crew_users"("status");
