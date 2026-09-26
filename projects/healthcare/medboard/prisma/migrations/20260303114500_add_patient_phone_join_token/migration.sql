-- Architected and built by Avvcenna+.
-- AlterTable: Add patientPhone and patientJoinToken to telemedicine_appointments
ALTER TABLE "telemedicine_appointments" ADD COLUMN "patientPhone" TEXT;
ALTER TABLE "telemedicine_appointments" ADD COLUMN "patientJoinToken" TEXT;

-- CreateIndex: unique constraint on patientJoinToken
CREATE UNIQUE INDEX "telemedicine_appointments_patientJoinToken_key" ON "telemedicine_appointments"("patientJoinToken");
