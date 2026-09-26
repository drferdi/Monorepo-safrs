/**
 * @abyss/guardrails
 * ──────────────────
 * Sentra Healthcare AI — Safety & Compliance Layer
 *
 * CRITICAL: Every AI output must pass through guardrails
 * before reaching clinicians or patients.
 *
 * Usage:
 *   import { validateCDSSOutput, runFullComplianceCheck } from "@abyss/guardrails";
 */

export type {
  ComplianceCategory,
  ComplianceCheck,
  ComplianceCheckResult,
} from './compliance'
export {
  checkAITransparency,
  checkDataPrivacy,
  checkDocumentationCompleteness,
  checkEklaimReadiness,
  runFullComplianceCheck,
} from './compliance'
export type { AuditItem, ValidationResult, Violation, Warning } from './validators'
export {
  validateAnamnesisInput,
  validateCDSSOutput,
  validateDiagnosisAssignment,
} from './validators'
