import { ICD10_LEGACY_CATALOG } from '../../data/icd10LegacyCatalog.js'
import { DIAGNOSIS_SCHEMA_VERSION, type ICD10Result, type ProposedReferral } from '../../types.js'

export { DIAGNOSIS_SCHEMA_VERSION }

export const DIAGNOSIS_NON_REFERRAL_CODES = [
  'I10',
  'J00',
  'K30',
  'R51',
  'M79.1',
  'A09',
  'J06.9',
  'L20',
  'E11.9',
  'H10.1',
  'N30.0',
  'T78.1',
] as const

const NON_REFERRAL_CODES = new Set<string>(DIAGNOSIS_NON_REFERRAL_CODES)

const ICD10_CM_TO_WHO_CODE = new Map([
  ['I16.0', 'I10'],
  ['I16.1', 'I10'],
  ['I16.9', 'I10'],
])

const ICD10_LABELS = new Map(
  ICD10_LEGACY_CATALOG.map(
    (entry) => [entry.code.trim().toUpperCase(), entry.officialLabel] as const
  )
)

const referralSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    code: { type: 'string', description: 'ICD-10 code only.' },
    description: { type: 'string' },
    kompetensi: { type: 'string', enum: ['3B', '3A'] },
    destination_service: {
      type: 'string',
      description: 'Clinical service receiving the referral.',
    },
    facility_level: {
      type: 'string',
      description: 'Required level or capability of the destination facility.',
    },
    referral_reason: { type: 'string', description: 'Concise reason why referral is required.' },
    required_capability: {
      type: 'string',
      description: 'Diagnostic or treatment capability needed at the destination.',
    },
    urgency: { type: 'string', enum: ['routine', 'urgent', 'emergency'] },
    clinical_reasoning: { type: 'string' },
  },
  required: [
    'code',
    'description',
    'kompetensi',
    'destination_service',
    'facility_level',
    'referral_reason',
    'required_capability',
    'urgency',
    'clinical_reasoning',
  ],
} as const

export const DIAGNOSIS_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'medlink_diagnosis_referral',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        code: { type: 'string', description: 'Primary ICD-10 code only.' },
        description: { type: 'string' },
        category: { type: 'string' },
        urgency: { type: 'string', enum: ['routine', 'urgent', 'emergency'] },
        triage_score: { type: 'integer', minimum: 1, maximum: 10 },
        clinical_notes: { type: 'string' },
        evidence: {
          type: 'object',
          additionalProperties: false,
          properties: {
            red_flags: { type: 'array', items: { type: 'string' } },
            clinical_reasoning: { type: 'string' },
            differential_diagnosis: { type: 'array', items: { type: 'string' } },
          },
          required: ['red_flags', 'clinical_reasoning', 'differential_diagnosis'],
        },
        proposed_referrals: {
          type: 'array',
          minItems: 0,
          maxItems: 3,
          items: referralSchema,
        },
      },
      required: [
        'code',
        'description',
        'category',
        'urgency',
        'triage_score',
        'clinical_notes',
        'evidence',
        'proposed_referrals',
      ],
    },
  },
}

export type InvalidClinicalOutputReason =
  | 'truncated'
  | 'invalid_json'
  | 'invalid_primary'
  | 'invalid_triage'
  | 'invalid_evidence'
  | 'referral_count'
  | 'invalid_referral'
  | 'invalid_icd_code'
  | 'duplicate_referral'
  | 'blacklisted_code'

export class InvalidClinicalOutputError extends Error {
  constructor(
    public readonly reason: InvalidClinicalOutputReason,
    public readonly rejectedCode?: string
  ) {
    super(`Invalid clinical output: ${reason}`)
    this.name = 'InvalidClinicalOutputError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

function isBlacklistedCode(value: string) {
  const normalized = normalizeCode(value)
  return Array.from(NON_REFERRAL_CODES).some((code) => normalized.startsWith(code))
}

function findAuthoritativeParentCode(normalized: string) {
  const explicitMapping = ICD10_CM_TO_WHO_CODE.get(normalized)
  if (explicitMapping) return explicitMapping

  const match = normalized.match(/^([A-Z][0-9]{2})\.([0-9]{1,2})$/)
  if (!match) return undefined

  const [, category, suffix] = match
  const candidates = suffix.length === 2 ? [`${category}.${suffix[0]}`, category] : [category]
  return candidates.find((candidate) => ICD10_LABELS.has(candidate))
}

function validateCode(value: string, allowNonReferral = false) {
  const normalized = normalizeCode(value)
  const authoritativeCode = ICD10_LABELS.has(normalized)
    ? normalized
    : findAuthoritativeParentCode(normalized)
  if (!authoritativeCode) {
    const rejectedCode = /^[A-Z][0-9]{2}(?:\.[A-Z0-9]{1,4})?$/.test(normalized)
      ? normalized
      : undefined
    throw new InvalidClinicalOutputError('invalid_icd_code', rejectedCode)
  }
  if (!allowNonReferral && isBlacklistedCode(authoritativeCode)) {
    throw new InvalidClinicalOutputError('blacklisted_code')
  }
  return authoritativeCode
}

function parseReferral(value: unknown): ProposedReferral {
  if (!isRecord(value)) throw new InvalidClinicalOutputError('invalid_referral')

  const requiredStrings = [
    value.code,
    value.description,
    value.destination_service,
    value.facility_level,
    value.referral_reason,
    value.required_capability,
    value.clinical_reasoning,
  ]
  if (!requiredStrings.every(isNonEmptyString)) {
    throw new InvalidClinicalOutputError('invalid_referral')
  }
  const code = validateCode(value.code as string)
  if (value.kompetensi !== '3B' && value.kompetensi !== '3A') {
    throw new InvalidClinicalOutputError('invalid_referral')
  }
  if (value.urgency !== 'routine' && value.urgency !== 'urgent' && value.urgency !== 'emergency') {
    throw new InvalidClinicalOutputError('invalid_referral')
  }
  return {
    code,
    description: ICD10_LABELS.get(code) as string,
    kompetensi: value.kompetensi,
    destination_service: (value.destination_service as string).trim(),
    facility_level: (value.facility_level as string).trim(),
    referral_reason: (value.referral_reason as string).trim(),
    required_capability: (value.required_capability as string).trim(),
    urgency: value.urgency,
    clinical_reasoning: (value.clinical_reasoning as string).trim(),
  }
}

function validateDiagnosisObject(value: unknown): ICD10Result {
  if (!isRecord(value) || !isNonEmptyString(value.code) || !isNonEmptyString(value.description)) {
    throw new InvalidClinicalOutputError('invalid_primary')
  }
  if (!isNonEmptyString(value.category) || !isNonEmptyString(value.clinical_notes)) {
    throw new InvalidClinicalOutputError('invalid_primary')
  }
  if (value.urgency !== 'routine' && value.urgency !== 'urgent' && value.urgency !== 'emergency') {
    throw new InvalidClinicalOutputError('invalid_primary')
  }
  const code = validateCode(value.code, true)
  if (
    !Number.isInteger(value.triage_score) ||
    Number(value.triage_score) < 1 ||
    Number(value.triage_score) > 10
  ) {
    throw new InvalidClinicalOutputError('invalid_triage')
  }

  const evidence = value.evidence
  if (
    !isRecord(evidence) ||
    !isStringArray(evidence.red_flags) ||
    !isNonEmptyString(evidence.clinical_reasoning) ||
    !isStringArray(evidence.differential_diagnosis)
  ) {
    throw new InvalidClinicalOutputError('invalid_evidence')
  }

  if (!Array.isArray(value.proposed_referrals) || value.proposed_referrals.length > 3) {
    throw new InvalidClinicalOutputError('referral_count')
  }
  if (
    value.proposed_referrals.length === 0 &&
    (!isBlacklistedCode(code) ||
      value.urgency !== 'routine' ||
      Number(value.triage_score) > 5 ||
      evidence.red_flags.length > 0)
  ) {
    throw new InvalidClinicalOutputError('referral_count')
  }
  const seenReferralCodes = new Set<string>()
  const proposedReferrals = value.proposed_referrals.map(parseReferral).filter((item) => {
    const code = normalizeCode(item.code)
    if (seenReferralCodes.has(code)) return false
    seenReferralCodes.add(code)
    return true
  })

  return {
    schema_version: DIAGNOSIS_SCHEMA_VERSION,
    code,
    description: ICD10_LABELS.get(code) as string,
    category: value.category.trim(),
    urgency: value.urgency,
    triage_score: value.triage_score as number,
    clinical_notes: value.clinical_notes.trim(),
    evidence: {
      red_flags: [...evidence.red_flags],
      clinical_reasoning: evidence.clinical_reasoning.trim(),
      differential_diagnosis: [...evidence.differential_diagnosis],
    },
    proposed_referrals: proposedReferrals,
  }
}

export function parseDiagnosisOutput(text: string, finishReason?: string | null): ICD10Result {
  if (finishReason === 'length') throw new InvalidClinicalOutputError('truncated')

  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new InvalidClinicalOutputError('invalid_json')
  }
  return validateDiagnosisObject(value)
}

export function isCurrentDiagnosisResult(value: unknown): value is ICD10Result {
  if (!isRecord(value) || value.schema_version !== DIAGNOSIS_SCHEMA_VERSION) return false
  try {
    validateDiagnosisObject(value)
    return true
  } catch {
    return false
  }
}
