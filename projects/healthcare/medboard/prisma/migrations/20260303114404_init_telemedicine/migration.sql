-- Architected and built by Avvcenna+.
-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ConsultationType" AS ENUM ('VIDEO', 'AUDIO', 'CHAT');

-- CreateEnum
CREATE TYPE "SessionParticipantRole" AS ENUM ('DOCTOR', 'NURSE', 'PATIENT', 'OBSERVER');

-- CreateTable
CREATE TABLE "telemedicine_appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdByStaffId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "consultationType" "ConsultationType" NOT NULL DEFAULT 'VIDEO',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "bpjsNomorSEP" TEXT,
    "pCareNoKunjungan" TEXT,
    "diagnosaICD10" TEXT,
    "diagnosaInaCBGs" TEXT,
    "keluhanUtama" TEXT,
    "riwayatPenyakit" TEXT,
    "anamnesis" TEXT,
    "pemeriksaan" TEXT,
    "diagnosis" TEXT,
    "tatalaksana" TEXT,
    "resepDigital" JSONB,
    "rujukan" BOOLEAN NOT NULL DEFAULT false,
    "rujukanTujuan" TEXT,
    "livekitRoomName" TEXT,
    "livekitRoomId" TEXT,
    "satusehatEncounterId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "telemedicine_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemedicine_sessions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "roomSid" TEXT,
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recordingUrl" TEXT,
    "recordingConsent" BOOLEAN NOT NULL DEFAULT false,
    "actualStartAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "actualDurationSeconds" INTEGER,
    "avgNetworkQuality" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telemedicine_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemedicine_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SessionParticipantRole" NOT NULL,
    "livekitIdentity" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "telemedicine_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemedicine_attachments" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "encryptionKeyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "telemedicine_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemedicine_audit_logs" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemedicine_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telemedicine_appointments_livekitRoomName_key" ON "telemedicine_appointments"("livekitRoomName");

-- CreateIndex
CREATE INDEX "telemedicine_appointments_patientId_idx" ON "telemedicine_appointments"("patientId");

-- CreateIndex
CREATE INDEX "telemedicine_appointments_doctorId_idx" ON "telemedicine_appointments"("doctorId");

-- CreateIndex
CREATE INDEX "telemedicine_appointments_scheduledAt_idx" ON "telemedicine_appointments"("scheduledAt");

-- CreateIndex
CREATE INDEX "telemedicine_appointments_status_idx" ON "telemedicine_appointments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "telemedicine_sessions_appointmentId_key" ON "telemedicine_sessions"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "telemedicine_sessions_roomName_key" ON "telemedicine_sessions"("roomName");

-- CreateIndex
CREATE INDEX "telemedicine_participants_sessionId_idx" ON "telemedicine_participants"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "telemedicine_participants_sessionId_userId_key" ON "telemedicine_participants"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "telemedicine_attachments_appointmentId_idx" ON "telemedicine_attachments"("appointmentId");

-- CreateIndex
CREATE INDEX "telemedicine_audit_logs_appointmentId_idx" ON "telemedicine_audit_logs"("appointmentId");

-- CreateIndex
CREATE INDEX "telemedicine_audit_logs_userId_idx" ON "telemedicine_audit_logs"("userId");

-- AddForeignKey
ALTER TABLE "telemedicine_sessions" ADD CONSTRAINT "telemedicine_sessions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "telemedicine_appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemedicine_participants" ADD CONSTRAINT "telemedicine_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "telemedicine_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemedicine_attachments" ADD CONSTRAINT "telemedicine_attachments_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "telemedicine_appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemedicine_audit_logs" ADD CONSTRAINT "telemedicine_audit_logs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "telemedicine_appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
