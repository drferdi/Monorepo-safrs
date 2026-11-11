-- AlterTable
ALTER TABLE "clinical_reports" ADD COLUMN     "author_username" TEXT;

-- CreateTable
CREATE TABLE "crew_activity_days" (
    "username" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "last_beat_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crew_activity_days_pkey" PRIMARY KEY ("username","day")
);

-- CreateIndex
CREATE INDEX "clinical_reports_author_username_idx" ON "clinical_reports"("author_username");


-- Backfill (Chief 2026-10-07): credit an old report only when its doctor name belongs to exactly
-- one active crew user; ambiguous or unknown names stay NULL and count for nobody.
UPDATE "clinical_reports" AS r
SET "author_username" = u."username"
FROM "crew_users" AS u
WHERE r."author_username" IS NULL
  AND r."doctor_name" = u."displayName"
  AND u."status" <> 'DELETED'
  AND (
    SELECT COUNT(*) FROM "crew_users" AS d
    WHERE d."displayName" = r."doctor_name" AND d."status" <> 'DELETED'
  ) = 1;
