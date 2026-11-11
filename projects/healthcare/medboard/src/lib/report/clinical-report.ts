
export interface ClinicalReportPatient {
  noRM: string
  nama: string
  umur: string
  jenisKelamin: 'L' | 'P'
  alamat: string
}

export interface ClinicalReportAnamnesa {
  keluhanUtama: string
  rps: string
  rpd: string
  rpk: string
  alergi: string
}

export interface ClinicalReportPhysicalExam {
  tdSistolik: string
  tdDiastolik: string
  nadi: string
  suhu: string
  napas: string
  spo2: string
  bb: string
  tb: string
  keadaanUmum: string
  kesadaran: string
  pemeriksaanLain: string
}

export interface ClinicalReportAssessment {
  diagnosisKerja: string
  icd10: string
  diagnosisBanding: string
  prognosis: string
}

export interface ClinicalReportPlan {
  terapi: string
  tindakan: string
  edukasi: string
  tindakLanjut: string
}

export interface ClinicalReportClosing {
  dokter: string
  perawat: string
  tanggalPemeriksaan: string
  jamPemeriksaan: string
}

export interface ClinicalReportAuditTrail {
  phase?: string
  trialMode?: boolean
  savedForAudit?: boolean
  generatedAt?: string
  diagnosisSource?: string
  careMode?: string
  referralDiagnoses?: string[]
  manualMedicationEntries?: unknown[]
  aiMedicationRecommendations?: unknown[]
  selectedAIMedications?: unknown[]
  [key: string]: unknown
}

export interface ClinicalReportSourceRefs {
  appointmentId?: string
  consultId?: string
  origin?: string
  actorUserId?: string
  actorName?: string
}

export interface ClinicalReport {
  id: string
  nomor: number
  createdAt: string
  pdfAvailable?: boolean
  pdfGeneratedAt?: string | null
  sourceRefs?: ClinicalReportSourceRefs
  auditTrail: ClinicalReportAuditTrail
  pasien: ClinicalReportPatient
  anamnesa: ClinicalReportAnamnesa
  pemeriksaanFisik: ClinicalReportPhysicalExam
  asesmen: ClinicalReportAssessment
  tataLaksana: ClinicalReportPlan
  penutup: ClinicalReportClosing
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function multilineHtml(value: string): string {
  return escapeHtml(value || '—').replace(/\n/g, '<br />')
}

function fieldBlock(label: string, value: string): string {
  return `
    <div class="field">
      <div class="field-label">${escapeHtml(label)}</div>
      <div class="field-value">${multilineHtml(value)}</div>
    </div>
  `
}

export function formatClinicalReportDate(iso: string): string {
  try {
    const date = new Date(iso)
    if (isNaN(date.getTime())) {
      return iso
    }
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function renderClinicalReportHtml(report: ClinicalReport): string {
  const patientRows = [
    ['NO. RM', report.pasien.noRM],
    ['NAMA', report.pasien.nama],
    ['UMUR', report.pasien.umur || '—'],
    ['JK', report.pasien.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'],
    ['ALAMAT', report.pasien.alamat || '—'],
  ]

  const tekananDarah =
    report.pemeriksaanFisik.tdSistolik && report.pemeriksaanFisik.tdDiastolik
      ? `${report.pemeriksaanFisik.tdSistolik}/${report.pemeriksaanFisik.tdDiastolik} mmHg`
      : '—'

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(report.id)} - Laporan Klinis</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "IBM Plex Sans", Arial, sans-serif;
            color: #111827;
            background: #ffffff;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            border-bottom: 2px solid #ea580c;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.04em;
          }
          .muted {
            color: #6b7280;
            font-size: 12px;
            line-height: 1.5;
          }
          .meta {
            text-align: right;
          }
          .meta-title {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.08em;
            color: #c2410c;
          }
          .patient-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 14px;
            padding: 12px 14px;
            background: #fff7ed;
            border: 1px solid #fed7aa;
            margin-bottom: 18px;
          }
          .patient-label, .field-label, .section-label {
            font-size: 10px;
            letter-spacing: 0.12em;
            color: #6b7280;
            text-transform: uppercase;
          }
          .patient-value, .field-value {
            font-size: 13px;
            line-height: 1.5;
            white-space: pre-wrap;
          }
          .section {
            margin-bottom: 18px;
          }
          .section-title {
            font-size: 12px;
            letter-spacing: 0.15em;
            color: #c2410c;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 4px;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .grid-2, .grid-3, .grid-4 {
            display: grid;
            gap: 14px;
          }
          .grid-2 { grid-template-columns: repeat(2, 1fr); }
          .grid-3 { grid-template-columns: repeat(3, 1fr); }
          .grid-4 { grid-template-columns: repeat(4, 1fr); }
          .field { margin-bottom: 8px; }
          .signature-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 32px;
            margin-top: 28px;
            padding-top: 16px;
            border-top: 1px solid #d1d5db;
          }
          .signature {
            text-align: center;
          }
          .signature-line {
            margin-top: 54px;
            padding-top: 8px;
            border-top: 1px solid #9ca3af;
            display: inline-block;
            min-width: 220px;
            font-size: 13px;
          }
          .footer {
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px dashed #d1d5db;
            display: flex;
            justify-content: space-between;
            gap: 16px;
            font-size: 11px;
            letter-spacing: 0.08em;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div>
              <div class="title">UPTD PUSKESMAS PONED BALOWERTI</div>
              <div class="muted">Jl. Balowerti No. 2, Kota Kediri, Jawa Timur</div>
              <div class="muted">Kepala: drg. Endah Retno W.</div>
            </div>
            <div class="meta">
              <div class="meta-title">REKAM MEDIS KUNJUNGAN</div>
              <div class="muted">${escapeHtml(report.id)}</div>
              <div class="muted">${escapeHtml(formatClinicalReportDate(report.createdAt))}</div>
            </div>
          </div>

          <div class="patient-grid">
            ${patientRows
              .map(
                ([label, value]) => `
              <div>
                <div class="patient-label">${escapeHtml(label)}</div>
                <div class="patient-value">${escapeHtml(value)}</div>
              </div>
            `
              )
              .join('')}
          </div>

          <div class="section">
            <div class="section-title">SUBJEKTIF (S) — ANAMNESA</div>
            ${fieldBlock('Keluhan Utama', report.anamnesa.keluhanUtama)}
            ${fieldBlock('Riwayat Penyakit Sekarang', report.anamnesa.rps)}
            <div class="grid-3">
              ${fieldBlock('RPD', report.anamnesa.rpd)}
              ${fieldBlock('RPK', report.anamnesa.rpk)}
              ${fieldBlock('Alergi', report.anamnesa.alergi)}
            </div>
          </div>

          <div class="section">
            <div class="section-title">OBJEKTIF (O) — PEMERIKSAAN FISIK</div>
            <div class="grid-4">
              ${fieldBlock('Tekanan Darah', tekananDarah)}
              ${fieldBlock('Nadi', report.pemeriksaanFisik.nadi ? `${report.pemeriksaanFisik.nadi} x/mnt` : '—')}
              ${fieldBlock('Suhu', report.pemeriksaanFisik.suhu ? `${report.pemeriksaanFisik.suhu} °C` : '—')}
              ${fieldBlock('Napas', report.pemeriksaanFisik.napas ? `${report.pemeriksaanFisik.napas} x/mnt` : '—')}
            </div>
            <div class="grid-4">
              ${fieldBlock('SpO2', report.pemeriksaanFisik.spo2 ? `${report.pemeriksaanFisik.spo2}%` : '—')}
              ${fieldBlock('Berat Badan', report.pemeriksaanFisik.bb ? `${report.pemeriksaanFisik.bb} kg` : '—')}
              ${fieldBlock('Tinggi Badan', report.pemeriksaanFisik.tb ? `${report.pemeriksaanFisik.tb} cm` : '—')}
              ${fieldBlock('Keadaan Umum', report.pemeriksaanFisik.keadaanUmum)}
            </div>
            <div class="grid-2">
              ${fieldBlock('Kesadaran', report.pemeriksaanFisik.kesadaran)}
              ${fieldBlock('Pemeriksaan Fisik Lain', report.pemeriksaanFisik.pemeriksaanLain)}
            </div>
          </div>

          <div class="section">
            <div class="section-title">ASESMEN (A)</div>
            <div class="grid-2">
              ${fieldBlock('Diagnosis Kerja', report.asesmen.diagnosisKerja)}
              ${fieldBlock('Kode ICD-10', report.asesmen.icd10)}
            </div>
            <div class="grid-2">
              ${fieldBlock('Diagnosis Banding', report.asesmen.diagnosisBanding)}
              ${fieldBlock('Prognosis', report.asesmen.prognosis)}
            </div>
          </div>

          <div class="section">
            <div class="section-title">TATA LAKSANA (P)</div>
            <div class="grid-2">
              ${fieldBlock('Terapi / Resep', report.tataLaksana.terapi)}
              ${fieldBlock('Tindakan', report.tataLaksana.tindakan)}
            </div>
            <div class="grid-2">
              ${fieldBlock('Edukasi', report.tataLaksana.edukasi)}
              ${fieldBlock('Rencana Tindak Lanjut', report.tataLaksana.tindakLanjut)}
            </div>
          </div>

          <div class="signature-grid">
            <div class="signature">
              <div class="section-label">Dokter Pemeriksa</div>
              <div class="signature-line">${escapeHtml(report.penutup.dokter || '............................')}</div>
            </div>
            <div class="signature">
              <div class="section-label">Perawat</div>
              <div class="signature-line">${escapeHtml(report.penutup.perawat || '............................')}</div>
            </div>
          </div>

          <div class="footer">
            <span>Dicetak: ${escapeHtml(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }))}</span>
            <span>UPTD Puskesmas Balowerti — Sistem Rekam Medis Digital</span>
          </div>
        </div>
      </body>
    </html>
  `
}

// ──────────────────────────────────────────────────────────────
// ZOD VALIDATION SCHEMAS (Sentra Standard)
// ──────────────────────────────────────────────────────────────

import { z } from 'zod'

export const ClinicalReportPatientSchema = z.object({
  noRM: z.string().min(1, 'No RM wajib diisi'),
  nama: z.string().min(2, 'Nama pasien minimal 2 karakter'),
  umur: z.string().optional(),
  jenisKelamin: z.enum(['L', 'P']),
  alamat: z.string().optional(),
})

export const ClinicalReportAnamnesaSchema = z.object({
  keluhanUtama: z.string().min(5, 'Keluhan utama harus dijelaskan'),
  rps: z.string().optional(),
  rpd: z.string().optional(),
  rpk: z.string().optional(),
  alergi: z.string().optional(),
})

export const ClinicalReportPhysicalExamSchema = z.object({
  tdSistolik: z.string().optional(),
  tdDiastolik: z.string().optional(),
  nadi: z.string().optional(),
  suhu: z.string().optional(),
  napas: z.string().optional(),
  spo2: z.string().optional(),
  bb: z.string().optional(),
  tb: z.string().optional(),
  keadaanUmum: z.string().optional(),
  kesadaran: z.string().optional(),
  pemeriksaanLain: z.string().optional(),
})

export const ClinicalReportAssessmentSchema = z.object({
  diagnosisKerja: z.string().min(3, 'Diagnosis kerja wajib diisi'),
  icd10: z.string().optional(),
  diagnosisBanding: z.string().optional(),
  prognosis: z.string().optional(),
})

export const ClinicalReportPlanSchema = z.object({
  terapi: z.string().optional(),
  tindakan: z.string().optional(),
  edukasi: z.string().optional(),
  tindakLanjut: z.string().optional(),
})

export const ClinicalReportClosingSchema = z.object({
  dokter: z.string().min(3, 'Nama dokter wajib diisi'),
  perawat: z.string().optional(),
  tanggalPemeriksaan: z.string(),
  jamPemeriksaan: z.string().optional(),
})

export const ClinicalReportSchema = z.object({
  id: z.string().optional(),
  nomor: z.number().optional(),
  createdAt: z.string().optional(),
  pdfAvailable: z.boolean().optional(),
  pdfGeneratedAt: z.string().nullable().optional(),
  sourceRefs: z
    .object({
      appointmentId: z.string().optional(),
      consultId: z.string().optional(),
      origin: z.string().optional(),
      actorUserId: z.string().optional(),
      actorName: z.string().optional(),
    })
    .optional(),
  auditTrail: z.record(z.string(), z.unknown()).optional(),
  pasien: ClinicalReportPatientSchema,
  anamnesa: ClinicalReportAnamnesaSchema,
  pemeriksaanFisik: ClinicalReportPhysicalExamSchema,
  asesmen: ClinicalReportAssessmentSchema,
  tataLaksana: ClinicalReportPlanSchema,
  penutup: ClinicalReportClosingSchema,
})

export const ClinicalReportDraftInputSchema = z
  .object({
    pasien: ClinicalReportPatientSchema,
    anamnesa: ClinicalReportAnamnesaSchema,
    pemeriksaanFisik: ClinicalReportPhysicalExamSchema,
    asesmen: ClinicalReportAssessmentSchema,
    tataLaksana: ClinicalReportPlanSchema,
    penutup: ClinicalReportClosingSchema,
    sourceRefs: z
      .object({
        appointmentId: z.string().optional(),
        consultId: z.string().optional(),
        origin: z.string().optional(),
        actorUserId: z.string().optional(),
        actorName: z.string().optional(),
      })
      .optional(),
    auditTrail: z.record(z.string(), z.unknown()).optional(),
  })
  .partial()

export type ClinicalReportDraftInput = z.infer<typeof ClinicalReportDraftInputSchema>
