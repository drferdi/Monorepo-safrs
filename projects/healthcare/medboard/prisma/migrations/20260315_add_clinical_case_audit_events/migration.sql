ALTER TABLE "clinical_reports"
ADD COLUMN "source_appointment_id" TEXT,
ADD COLUMN "source_consult_id" TEXT,
ADD COLUMN "source_origin" TEXT;

CREATE INDEX "clinical_reports_source_appointment_id_idx"
ON "clinical_reports"("source_appointment_id");

CREATE INDEX "clinical_reports_source_consult_id_idx"
ON "clinical_reports"("source_consult_id");

CREATE TABLE "clinical_case_audit_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_name" TEXT,
    "appointment_id" TEXT,
    "consult_id" TEXT,
    "report_id" TEXT,
    "source_origin" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_case_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clinical_case_audit_events_event_type_idx"
ON "clinical_case_audit_events"("event_type");

CREATE INDEX "clinical_case_audit_events_appointment_id_idx"
ON "clinical_case_audit_events"("appointment_id");

CREATE INDEX "clinical_case_audit_events_consult_id_idx"
ON "clinical_case_audit_events"("consult_id");

CREATE INDEX "clinical_case_audit_events_report_id_idx"
ON "clinical_case_audit_events"("report_id");

CREATE INDEX "clinical_case_audit_events_created_at_idx"
ON "clinical_case_audit_events"("created_at");
