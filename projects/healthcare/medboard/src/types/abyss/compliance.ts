/**
 * @abyss/guardrails — Compliance
 * ────────────────────────────────
 * Regulatory compliance checks for Indonesian healthcare AI.
 * Covers data handling, consent, audit requirements,
 * and e-klaim submission validation.
 */

import type { AuditEntry, Encounter, Patient, Referral } from '@abyss/types'

// ─── TYPES ────────────────────────────────────────────────────────

export interface ComplianceCheckResult {
  compliant: boolean
  checks: ComplianceCheck[]
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
}

export interface ComplianceCheck {
  rule: string
  category: ComplianceCategory
  passed: boolean
  message: string
  remediation?: string
}

export type ComplianceCategory =
  | 'data_privacy'
  | 'consent'
  | 'documentation'
  | 'eklaim'
  | 'audit_trail'
  | 'ai_transparency'

// ─── DATA PRIVACY ─────────────────────────────────────────────────

/**
 * Check that patient data meets minimum privacy requirements
 * before being processed or transmitted.
 */
export function checkDataPrivacy(context: {
  hasEncryption: boolean
  dataDestination: 'internal' | 'external' | 'bpjs' | 'referral'
  containsPHI: boolean
}): ComplianceCheck[] {
  const checks: ComplianceCheck[] = []

  if (context.containsPHI && !context.hasEncryption) {
    checks.push({
      rule: 'PRIV-001',
      category: 'data_privacy',
      passed: false,
      message: 'Data pasien (PHI) harus dienkripsi sebelum transmisi',
      remediation: 'Aktifkan enkripsi end-to-end untuk data yang mengandung PHI',
    })
  }

  if (context.dataDestination === 'external') {
    checks.push({
      rule: 'PRIV-002',
      category: 'data_privacy',
      passed: false,
      message: 'Transmisi data ke pihak eksternal memerlukan persetujuan pasien',
      remediation: 'Pastikan consent form telah ditandatangani sebelum transmisi',
    })
  }

  if (checks.length === 0) {
    checks.push({
      rule: 'PRIV-000',
      category: 'data_privacy',
      passed: true,
      message: 'Pemeriksaan privasi data lolos',
    })
  }

  return checks
}

// ─── AI TRANSPARENCY ──────────────────────────────────────────────

/**
 * Ensure AI-assisted decisions include proper transparency markers.
 * Every AI suggestion must be clearly labeled as AI-generated.
 */
export function checkAITransparency(context: {
  hasAIDisclosure: boolean
  aiConfidenceDisplayed: boolean
  clinicianCanOverride: boolean
  auditTrailPresent: boolean
}): ComplianceCheck[] {
  const checks: ComplianceCheck[] = []

  if (!context.hasAIDisclosure) {
    checks.push({
      rule: 'AITX-001',
      category: 'ai_transparency',
      passed: false,
      message: "Hasil AI harus diberi label yang jelas sebagai 'Saran AI'",
      remediation: "Tambahkan badge/label 'Dihasilkan oleh AI' pada setiap output CDSS",
    })
  }

  if (!context.aiConfidenceDisplayed) {
    checks.push({
      rule: 'AITX-002',
      category: 'ai_transparency',
      passed: false,
      message: 'Tingkat keyakinan (confidence) AI harus ditampilkan',
      remediation: 'Tampilkan skor confidence bersama setiap saran diagnosis',
    })
  }

  if (!context.clinicianCanOverride) {
    checks.push({
      rule: 'AITX-003',
      category: 'ai_transparency',
      passed: false,
      message: 'Klinisi HARUS dapat menolak/mengubah saran AI',
      remediation: 'Pastikan tombol override/reject tersedia di setiap saran AI',
    })
  }

  if (!context.auditTrailPresent) {
    checks.push({
      rule: 'AITX-004',
      category: 'ai_transparency',
      passed: false,
      message: 'Jejak audit harus merekam setiap interaksi AI',
      remediation: 'Log setiap saran AI, termasuk apakah diterima atau ditolak oleh klinisi',
    })
  }

  return checks
}

// ─── E-KLAIM VALIDATION ───────────────────────────────────────────

/**
 * Validate encounter data completeness for BPJS e-klaim submission.
 */
export function checkEklaimReadiness(encounter: Encounter): ComplianceCheck[] {
  const checks: ComplianceCheck[] = []

  if (!encounter.diagnoses || encounter.diagnoses.length === 0) {
    checks.push({
      rule: 'EKL-001',
      category: 'eklaim',
      passed: false,
      message: 'Minimal satu diagnosis diperlukan untuk e-klaim',
      remediation: 'Tambahkan diagnosis primer sebelum submit e-klaim',
    })
  }

  const primaryDx = encounter.diagnoses.find(d => d.type === 'primary')
  if (!primaryDx) {
    checks.push({
      rule: 'EKL-002',
      category: 'eklaim',
      passed: false,
      message: 'Diagnosis primer belum ditetapkan',
      remediation: "Tandai salah satu diagnosis sebagai 'primary'",
    })
  }

  if (primaryDx && !/^[A-Z]\d{2}(\.\d{1,4})?$/.test(primaryDx.icd10Code)) {
    checks.push({
      rule: 'EKL-003',
      category: 'eklaim',
      passed: false,
      message: 'Format kode ICD-10 diagnosis primer tidak valid',
      remediation: 'Perbaiki format kode ICD-10 (contoh: J18.9)',
    })
  }

  if (!encounter.vitals) {
    checks.push({
      rule: 'EKL-004',
      category: 'eklaim',
      passed: false,
      message: 'Tanda vital belum dicatat',
      remediation: 'Lengkapi pencatatan tanda vital pasien',
    })
  }

  if (encounter.status !== 'completed') {
    checks.push({
      rule: 'EKL-005',
      category: 'eklaim',
      passed: false,
      message: "Encounter belum berstatus 'completed'",
      remediation: 'Selesaikan encounter sebelum submit e-klaim',
    })
  }

  if (checks.every(c => c.passed !== false)) {
    checks.push({
      rule: 'EKL-000',
      category: 'eklaim',
      passed: true,
      message: 'Data encounter siap untuk e-klaim',
    })
  }

  return checks
}

// ─── DOCUMENTATION COMPLETENESS ───────────────────────────────────

/**
 * Check minimum documentation requirements for an encounter.
 */
export function checkDocumentationCompleteness(encounter: Encounter): ComplianceCheck[] {
  const checks: ComplianceCheck[] = []

  if (!encounter.anamnesis) {
    checks.push({
      rule: 'DOC-001',
      category: 'documentation',
      passed: false,
      message: 'Anamnesis belum dicatat',
      remediation: 'Lengkapi anamnesis sebelum menutup encounter',
    })
  }

  if (!encounter.vitals) {
    checks.push({
      rule: 'DOC-002',
      category: 'documentation',
      passed: false,
      message: 'Tanda vital belum dicatat',
    })
  }

  if (encounter.diagnoses.length === 0) {
    checks.push({
      rule: 'DOC-003',
      category: 'documentation',
      passed: false,
      message: 'Belum ada diagnosis yang dicatat',
    })
  }

  return checks
}

// ─── AGGREGATE COMPLIANCE CHECK ───────────────────────────────────

/**
 * Run all compliance checks for an encounter and return overall result.
 */
export function runFullComplianceCheck(
  encounter: Encounter,
  aiContext?: {
    hasAIDisclosure: boolean
    aiConfidenceDisplayed: boolean
    clinicianCanOverride: boolean
    auditTrailPresent: boolean
  }
): ComplianceCheckResult {
  const allChecks: ComplianceCheck[] = [
    ...checkDocumentationCompleteness(encounter),
    ...checkEklaimReadiness(encounter),
  ]

  if (aiContext) {
    allChecks.push(...checkAITransparency(aiContext))
  }

  const failedChecks = allChecks.filter(c => !c.passed)
  const hasEklaimFailure = failedChecks.some(c => c.category === 'eklaim')
  const hasAIFailure = failedChecks.some(c => c.category === 'ai_transparency')

  let overallRisk: ComplianceCheckResult['overallRisk'] = 'low'
  if (failedChecks.length > 0) overallRisk = 'medium'
  if (hasEklaimFailure) overallRisk = 'high'
  if (hasAIFailure && hasEklaimFailure) overallRisk = 'critical'

  return {
    compliant: failedChecks.length === 0,
    checks: allChecks,
    overallRisk,
  }
}
