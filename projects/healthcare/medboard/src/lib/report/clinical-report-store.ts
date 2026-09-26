import 'server-only'

import { join } from 'node:path'

import type { ClinicalReport as ClinicalReportRow, Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import type {
  ClinicalReport,
  ClinicalReportAuditTrail,
  ClinicalReportDraftInput,
} from './clinical-report'

export const REPORTS_PDF_DIR = join(process.cwd(), 'runtime', 'clinical-reports-pdf')

function mapClinicalReportRow(row: ClinicalReportRow): ClinicalReport {
  return {
    id: row.id,
    nomor: row.nomor,
    createdAt: row.createdAt.toISOString(),
    pdfAvailable: Boolean(row.pdfStoragePath),
    pdfGeneratedAt: row.pdfGeneratedAt?.toISOString() ?? null,
    sourceRefs: {
      appointmentId: row.sourceAppointmentId ?? undefined,
      consultId: row.sourceConsultId ?? undefined,
      origin: row.sourceOrigin ?? undefined,
    },
    auditTrail: row.auditTrail as ClinicalReportAuditTrail,
    pasien: row.pasien as unknown as ClinicalReport['pasien'],
    anamnesa: row.anamnesa as unknown as ClinicalReport['anamnesa'],
    pemeriksaanFisik: row.pemeriksaanFisik as unknown as ClinicalReport['pemeriksaanFisik'],
    asesmen: row.asesmen as unknown as ClinicalReport['asesmen'],
    tataLaksana: row.tataLaksana as unknown as ClinicalReport['tataLaksana'],
    penutup: row.penutup as unknown as ClinicalReport['penutup'],
  }
}

async function getNextReportNumber(): Promise<number> {
  const aggregate = await prisma.clinicalReport.aggregate({
    _max: { nomor: true },
  })
  return (aggregate._max.nomor ?? 0) + 1
}

function buildReportId(nomor: number): string {
  const year = new Date().getFullYear()
  return `LAP-${year}-${String(nomor).padStart(4, '0')}`
}

export async function findClinicalReportById(id: string): Promise<ClinicalReport | null> {
  const row = await prisma.clinicalReport.findUnique({ where: { id } })
  return row ? mapClinicalReportRow(row) : null
}

export async function listClinicalReports(options: {
  dokter?: string | null
  limit?: number | null
}): Promise<{ reports: ClinicalReport[]; nextNumber: number }> {
  const rows = await prisma.clinicalReport.findMany({
    where: options.dokter ? { doctorName: options.dokter } : undefined,
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? undefined,
  })

  const nextNumber = await getNextReportNumber()

  return {
    reports: rows.map(mapClinicalReportRow),
    nextNumber,
  }
}

export async function saveClinicalReport(
  input: ClinicalReportDraftInput
): Promise<ClinicalReport> {
  const nomor = await getNextReportNumber()
  const id = buildReportId(nomor)

  const row = await prisma.clinicalReport.create({
    data: {
      id,
      nomor,
      doctorName: input.penutup?.dokter ?? null,
      patientMrn: input.pasien?.noRM ?? null,
      patientName: input.pasien?.nama ?? null,
      diagnosisKerja: input.asesmen?.diagnosisKerja ?? null,
      auditTrail: (input.auditTrail ?? {}) as Prisma.InputJsonValue,
      pasien: (input.pasien ?? {}) as Prisma.InputJsonValue,
      anamnesa: (input.anamnesa ?? {}) as Prisma.InputJsonValue,
      pemeriksaanFisik: (input.pemeriksaanFisik ?? {}) as Prisma.InputJsonValue,
      asesmen: (input.asesmen ?? {}) as Prisma.InputJsonValue,
      tataLaksana: (input.tataLaksana ?? {}) as Prisma.InputJsonValue,
      penutup: (input.penutup ?? {}) as Prisma.InputJsonValue,
      sourceAppointmentId: input.sourceRefs?.appointmentId ?? null,
      sourceConsultId: input.sourceRefs?.consultId ?? null,
      sourceOrigin: input.sourceRefs?.origin ?? null,
    },
  })

  return mapClinicalReportRow(row)
}

export async function markClinicalReportPdfGenerated(
  id: string,
  pdfStoragePath: string
): Promise<void> {
  await prisma.clinicalReport.update({
    where: { id },
    data: {
      pdfStoragePath,
      pdfGeneratedAt: new Date(),
    },
  })
}

export async function deleteClinicalReport(id: string): Promise<boolean> {
  try {
    await prisma.clinicalReport.delete({ where: { id } })
    return true
  } catch {
    return false
  }
}
