import type { VitalSigns } from '@/lib/cdss/types'

export function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().replace(',', '.')
  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function pickNumber(record: Record<string, unknown> | null, keys: string[]): number | undefined {
  if (!record) {
    return undefined
  }

  for (const key of keys) {
    const parsed = parseNumber(record[key])
    if (parsed !== undefined) {
      return parsed
    }
  }

  return undefined
}

export function pickString(record: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!record) {
    return undefined
  }

  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

// Maps the Assist consult `ttv` (string values) and anthropometrics into CDSS vital signs.
export function buildConsultVitalSigns(
  vitals: Record<string, unknown> | null,
  anthropometrics: Record<string, unknown> | null
): VitalSigns {
  return {
    systolic: pickNumber(vitals, ['sistolik', 'systolic', 'sbp']),
    diastolic: pickNumber(vitals, ['diastolik', 'diastolic', 'dbp']),
    heart_rate: pickNumber(vitals, ['nadi', 'heart_rate', 'hr', 'pulse']),
    spo2: pickNumber(vitals, ['spo2', 'oxygen_saturation']),
    temperature: pickNumber(vitals, ['suhu', 'temperature', 'temp']),
    respiratory_rate: pickNumber(vitals, ['rr', 'respiratory_rate', 'frekuensi_napas']),
    glucose: pickNumber(vitals, ['glucose']),
    weight_kg: pickNumber(anthropometrics, ['weight_kg', 'weight', 'berat_badan']),
    height_cm: pickNumber(anthropometrics, ['height_cm', 'height', 'tinggi_badan']),
    pain_score: pickNumber(vitals, ['pain_score', 'skala_nyeri']),
    avpu: pickString(vitals, ['avpu']) as VitalSigns['avpu'] | undefined,
    supplemental_o2:
      typeof vitals?.supplemental_o2 === 'boolean' ? vitals.supplemental_o2 : undefined,
    has_copd: typeof vitals?.has_copd === 'boolean' ? vitals.has_copd : undefined,
  }
}
