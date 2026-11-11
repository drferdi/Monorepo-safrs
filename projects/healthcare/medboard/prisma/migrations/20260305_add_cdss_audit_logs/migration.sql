-- Architected and built by Avvcenna+.
-- CreateTable
CREATE TABLE "cdss_audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_hash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "input_hash" TEXT NOT NULL DEFAULT '',
    "output_summary" JSONB NOT NULL,
    "model_version" TEXT NOT NULL,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "validation_status" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "cdss_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cdss_audit_logs_session_hash_idx" ON "cdss_audit_logs"("session_hash");

-- CreateIndex
CREATE INDEX "cdss_audit_logs_action_idx" ON "cdss_audit_logs"("action");

-- CreateIndex
CREATE INDEX "cdss_audit_logs_validation_status_idx" ON "cdss_audit_logs"("validation_status");

-- CreateIndex
CREATE INDEX "cdss_audit_logs_timestamp_idx" ON "cdss_audit_logs"("timestamp");
