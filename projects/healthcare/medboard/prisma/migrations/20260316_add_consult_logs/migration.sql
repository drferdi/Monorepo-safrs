-- CreateTable
CREATE TABLE "consult_logs" (
    "id" TEXT NOT NULL,
    "consult_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "patient_name" TEXT,
    "patient_rm" TEXT,
    "patient_age" INTEGER,
    "patient_gender" TEXT,
    "keluhan_utama" TEXT,
    "ttv" JSONB,
    "risk_factors" JSONB,
    "penyakit_kronis" JSONB,
    "anthropometrics" JSONB,
    "sender_user_id" TEXT,
    "sender_name" TEXT,
    "target_doctor_id" TEXT,
    "accepted_by" TEXT,
    "accepted_at" TIMESTAMP(3),
    "bridge_entry_id" TEXT,
    "transferred_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consult_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consult_logs_consult_id_key" ON "consult_logs"("consult_id");

-- CreateIndex
CREATE INDEX "consult_logs_status_idx" ON "consult_logs"("status");

-- CreateIndex
CREATE INDEX "consult_logs_target_doctor_idx" ON "consult_logs"("target_doctor_id");

-- CreateIndex
CREATE INDEX "consult_logs_patient_rm_idx" ON "consult_logs"("patient_rm");

-- CreateIndex
CREATE INDEX "consult_logs_created_at_idx" ON "consult_logs"("created_at");
