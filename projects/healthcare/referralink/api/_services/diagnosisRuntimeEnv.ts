export type DiagnosisRuntimeCommand = 'serve' | 'build'

type DiagnosisEnvironment = Record<string, string | undefined>

const DIAGNOSIS_ENV_KEYS = ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL'] as const

export function selectDiagnosisRuntimeEnvironment(
  command: DiagnosisRuntimeCommand,
  inherited: DiagnosisEnvironment,
  local: DiagnosisEnvironment
) {
  const selected: DiagnosisEnvironment = {}

  for (const key of DIAGNOSIS_ENV_KEYS) {
    const inheritedValue = inherited[key]?.trim()
    const localValue = local[key]?.trim()
    const value = command === 'serve' && localValue ? localValue : inheritedValue
    if (value) selected[key] = value
  }

  return selected
}
