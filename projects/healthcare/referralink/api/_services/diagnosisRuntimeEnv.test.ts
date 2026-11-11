import assert from 'node:assert/strict'

import { selectDiagnosisRuntimeEnvironment } from './diagnosisRuntimeEnv.js'

const inherited = {
  OPENAI_API_KEY: 'stale-parent-key',
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  OPENAI_MODEL: 'gpt-5.6-terra',
}
const local = {
  OPENAI_API_KEY: 'local-gateway-key',
  OPENAI_BASE_URL: 'https://openrouter.ai/api/v1',
  OPENAI_MODEL: 'openai/gpt-5.6-luna',
}

assert.deepEqual(selectDiagnosisRuntimeEnvironment('serve', inherited, local), local)
assert.deepEqual(selectDiagnosisRuntimeEnvironment('build', inherited, local), inherited)
assert.deepEqual(
  selectDiagnosisRuntimeEnvironment('serve', inherited, { OPENAI_MODEL: '  ' }),
  inherited
)

console.log('diagnosis runtime environment precedence tests passed')
