-- AddColumn: visit_history to consult_logs
-- Stores scraped ePuskesmas visit history (TTV + ICD) from Assist for trajectory engine

ALTER TABLE "consult_logs" ADD COLUMN IF NOT EXISTS "visit_history" JSONB;
