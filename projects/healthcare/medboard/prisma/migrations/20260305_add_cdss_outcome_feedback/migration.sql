-- Architected and built by Avvcenna+.
-- CreateTable
CREATE TABLE "cdss_outcome_feedback" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_hash" TEXT NOT NULL,
    "selected_icd" TEXT NOT NULL,
    "selected_confidence" DOUBLE PRECISION NOT NULL,
    "final_icd" TEXT NOT NULL,
    "outcome_confirmed" BOOLEAN,
    "follow_up_note" TEXT,
    "doctor_user_id" TEXT,
    "override_reason" TEXT,
    "days_to_follow_up" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "cdss_outcome_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cdss_outcome_feedback_session_hash_idx" ON "cdss_outcome_feedback"("session_hash");

-- CreateIndex
CREATE INDEX "cdss_outcome_feedback_timestamp_idx" ON "cdss_outcome_feedback"("timestamp");

-- CreateIndex
CREATE INDEX "cdss_outcome_feedback_final_icd_idx" ON "cdss_outcome_feedback"("final_icd");

-- CreateIndex
CREATE INDEX "cdss_outcome_feedback_outcome_confirmed_idx" ON "cdss_outcome_feedback"("outcome_confirmed");
