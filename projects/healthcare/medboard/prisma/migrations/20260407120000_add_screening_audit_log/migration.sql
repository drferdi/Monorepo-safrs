-- Screening audit trail for ASSIST → doctor consult deliveries (pilot CDSS)

CREATE TABLE "screening_audit_logs" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "assist_id" TEXT NOT NULL,
    "consult_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "screening_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "screening_status" TEXT NOT NULL,
    "risk_level" TEXT,
    "score" INTEGER,
    "result_summary" TEXT,
    "delivery_status" TEXT NOT NULL,
    "delivery_timestamp" TIMESTAMP(3) NOT NULL,
    "acknowledged_by_doctor" BOOLEAN NOT NULL DEFAULT false,
    "ack_timestamp" TIMESTAMP(3),
    "app_version" TEXT,
    "sender_user_id" TEXT,
    "meta_json" JSONB,
    "immutable_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "screening_audit_logs_event_id_key" ON "screening_audit_logs"("event_id");

CREATE INDEX "screening_audit_logs_doctor_id_idx" ON "screening_audit_logs"("doctor_id");

CREATE INDEX "screening_audit_logs_facility_id_idx" ON "screening_audit_logs"("facility_id");

CREATE INDEX "screening_audit_logs_created_at_idx" ON "screening_audit_logs"("created_at" DESC);

CREATE INDEX "screening_audit_logs_delivery_status_screening_status_idx" ON "screening_audit_logs"("delivery_status", "screening_status");
