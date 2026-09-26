CREATE TABLE "clinical_reports" (
    "id" TEXT NOT NULL,
    "nomor" INTEGER NOT NULL,
    "doctor_name" TEXT,
    "patient_mrn" TEXT,
    "patient_name" TEXT,
    "diagnosis_kerja" TEXT,
    "audit_trail" JSONB NOT NULL,
    "pasien" JSONB NOT NULL,
    "anamnesa" JSONB NOT NULL,
    "pemeriksaan_fisik" JSONB NOT NULL,
    "asesmen" JSONB NOT NULL,
    "tata_laksana" JSONB NOT NULL,
    "penutup" JSONB NOT NULL,
    "pdf_storage_path" TEXT,
    "pdf_generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinical_reports_nomor_key" ON "clinical_reports"("nomor");
CREATE INDEX "clinical_reports_created_at_idx" ON "clinical_reports"("created_at");
CREATE INDEX "clinical_reports_doctor_name_idx" ON "clinical_reports"("doctor_name");
CREATE INDEX "clinical_reports_patient_mrn_idx" ON "clinical_reports"("patient_mrn");
