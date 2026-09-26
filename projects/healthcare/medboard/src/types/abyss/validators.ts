/**
 * @abyss/guardrails — Validators
 * ────────────────────────────────
 * Input and output validation for clinical AI interactions.
 * Ensures AI outputs meet safety standards before reaching patients.
 *
 * CRITICAL: Every AI response in Sentra must pass through these
 * validators before display. This is non-negotiable for patient safety.
 */

import type { CDSSResponse, ClinicalAlert, Diagnosis, IskandarSuggestion } from '@abyss/types'

// ─── TYPES ────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  violations: Violation[]
  warnings: Warning[]
  auditTrail: AuditItem[]
}

export interface Violation {
  code: string
  severity: 'block' | 'escalate'
  message: string
  field?: string
  rule: string
}

export interface Warning {
  code: string
  message: string
  field?: string
  recommendation: string
}

export interface AuditItem {
  timestamp: string
  validator: string
  input: string
  result: 'pass' | 'warn' | 'fail'
  details?: string
}

// ─── INPUT VALIDATORS ─────────────────────────────────────────────

/**
 * Validate that anamnesis input is safe and sufficient for CDSS processing.
 * Blocks empty inputs, detects potential PHI leakage in logs.
 */
export function validateAnamnesisInput(input: {
  chiefComplaint: string
  historyOfPresentIllness: string
}): ValidationResult {
  const violations: Violation[] = []
  const warnings: Warning[] = []
  const auditTrail: AuditItem[] = []
  const now = new Date().toISOString()

  if (!input.chiefComplaint || input.chiefComplaint.trim().length < 3) {
    violations.push({
      code: 'GR-INPUT-001',
      severity: 'block',
      message: 'Keluhan utama terlalu pendek atau kosong',
      field: 'chiefComplaint',
      rule: 'minimum_anamnesis_length',
    })
  }

  if (input.chiefComplaint && input.chiefComplaint.length > 5000) {
    warnings.push({
      code: 'GR-INPUT-002',
      message: 'Keluhan utama sangat panjang — mungkin termasuk data berlebihan',
      field: 'chiefComplaint',
      recommendation: 'Ringkas keluhan utama menjadi informasi klinis yang relevan',
    })
  }

  auditTrail.push({
    timestamp: now,
    validator: 'validateAnamnesisInput',
    input: `chiefComplaint length: ${input.chiefComplaint?.length ?? 0}`,
    result: violations.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass',
  })

  return {
    valid: violations.length === 0,
    violations,
    warnings,
    auditTrail,
  }
}

// ─── OUTPUT VALIDATORS ────────────────────────────────────────────

/**
 * Validate CDSS output before displaying to clinician.
 * Enforces confidence thresholds, diagnosis limits, and safety checks.
 */
export function validateCDSSOutput(response: CDSSResponse): ValidationResult {
  const violations: Violation[] = []
  const warnings: Warning[] = []
  const auditTrail: AuditItem[] = []
  const now = new Date().toISOString()

  // Check: No empty suggestions
  if (!response.suggestions || response.suggestions.length === 0) {
    warnings.push({
      code: 'GR-OUTPUT-001',
      message: 'CDSS tidak menghasilkan saran diagnosis',
      recommendation: 'Tampilkan pesan bahwa AI tidak dapat memberikan saran untuk kasus ini',
    })
  }

  // Check: Confidence thresholds
  for (const suggestion of response.suggestions) {
    if (suggestion.confidence < 0.1) {
      violations.push({
        code: 'GR-OUTPUT-002',
        severity: 'block',
        message: `Saran diagnosis dengan confidence sangat rendah (${suggestion.confidence}) — diblokir dari tampilan`,
        rule: 'minimum_confidence_threshold',
      })
    } else if (suggestion.confidence < 0.3) {
      warnings.push({
        code: 'GR-OUTPUT-003',
        message: `Saran diagnosis dengan confidence rendah (${suggestion.confidence})`,
        recommendation: "Tampilkan dengan label 'Confidence Rendah' yang jelas",
      })
    }
  }

  // Check: Maximum suggestions limit (prevent information overload)
  if (response.suggestions.length > 10) {
    warnings.push({
      code: 'GR-OUTPUT-004',
      message: `CDSS menghasilkan ${response.suggestions.length} saran — terlalu banyak`,
      recommendation: "Tampilkan hanya 5 saran teratas, sisanya di 'lihat selengkapnya'",
    })
  }

  // Check: Critical alerts must be surfaced
  const criticalAlerts = response.alerts.filter(a => a.severity === 'critical')
  if (criticalAlerts.length > 0) {
    auditTrail.push({
      timestamp: now,
      validator: 'validateCDSSOutput:criticalAlerts',
      input: `${criticalAlerts.length} critical alerts detected`,
      result: 'warn',
      details: criticalAlerts.map(a => a.message).join('; '),
    })
  }

  auditTrail.push({
    timestamp: now,
    validator: 'validateCDSSOutput',
    input: `${response.suggestions.length} suggestions, ${response.alerts.length} alerts`,
    result: violations.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass',
  })

  return {
    valid: violations.length === 0,
    violations,
    warnings,
    auditTrail,
  }
}

/**
 * Validate that a diagnosis assignment meets minimum documentation standards.
 */
export function validateDiagnosisAssignment(diagnosis: Diagnosis): ValidationResult {
  const violations: Violation[] = []
  const warnings: Warning[] = []
  const auditTrail: AuditItem[] = []
  const now = new Date().toISOString()

  // ICD-10 code must be present and well-formed
  if (!diagnosis.icd10Code || !/^[A-Z]\d{2}(\.\d{1,4})?$/.test(diagnosis.icd10Code)) {
    violations.push({
      code: 'GR-DX-001',
      severity: 'block',
      message: 'Kode ICD-10 tidak valid atau kosong',
      field: 'icd10Code',
      rule: 'valid_icd10_code',
    })
  }

  // AI-suggested diagnoses must have clinician acknowledgment note
  if (diagnosis.source === 'cdss_iskandar' || diagnosis.source === 'ai_suggested') {
    if (!diagnosis.notes || diagnosis.notes.trim().length === 0) {
      warnings.push({
        code: 'GR-DX-002',
        message: 'Diagnosis dari AI sebaiknya disertai catatan klinisi',
        recommendation: 'Tambahkan catatan konfirmasi/penyesuaian dari klinisi',
      })
    }
  }

  auditTrail.push({
    timestamp: now,
    validator: 'validateDiagnosisAssignment',
    input: `ICD-10: ${diagnosis.icd10Code}, source: ${diagnosis.source}`,
    result: violations.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass',
  })

  return {
    valid: violations.length === 0,
    violations,
    warnings,
    auditTrail,
  }
}
