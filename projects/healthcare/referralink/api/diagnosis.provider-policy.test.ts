import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildDiagnosisProviderRequest,
  buildDiagnosisRetryInstruction,
  resolveOpenAIConfig,
} from './diagnosis.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const serverSource = fs.readFileSync(path.join(currentDir, 'diagnosis.ts'), 'utf8')
const clientSource = fs.readFileSync(
  path.join(currentDir, '..', 'services', 'diagnosisApiClient.ts'),
  'utf8'
)

assert.match(serverSource, /env\.OPENAI_API_KEY/)
assert.match(serverSource, /gpt-5\.6-luna/)
assert.match(serverSource, /env\.OPENAI_BASE_URL/)
assert.match(serverSource, /env\.OPENAI_MODEL/)
assert.match(clientSource, /OPENAI_GPT_56_LUNA/)
assert.doesNotMatch(
  serverSource,
  /GEMINI_API_KEY|generativelanguage\.googleapis\.com|gemini-2\.5-flash/
)
assert.doesNotMatch(clientSource, /GEMINI_25_FLASH/)
assert.match(
  serverSource,
  /proposed_referrals = \[\].*daftar low-risk no-referral.*triage <= 5.*tanpa red flag/s
)
assert.doesNotMatch(serverSource, /Success - Code/)

assert.deepEqual(
  resolveOpenAIConfig({
    OPENAI_API_KEY: 'gateway-key',
    OPENAI_BASE_URL: 'https://openrouter.ai/api/v1',
    OPENAI_MODEL: 'openai/gpt-5.6-luna',
  }),
  {
    apiKey: 'gateway-key',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-5.6-luna',
  }
)

assert.throws(
  () => resolveOpenAIConfig({ OPENAI_API_KEY: 'gateway-key' }),
  /OPENAI_BASE_URL is not configured/
)

assert.throws(
  () =>
    resolveOpenAIConfig({
      OPENAI_API_KEY: 'gateway-key',
      OPENAI_BASE_URL: 'not-a-url',
      OPENAI_MODEL: 'gpt-5.6-terra',
    }),
  /OPENAI_BASE_URL must be an approved HTTPS endpoint/
)

assert.throws(
  () =>
    resolveOpenAIConfig({
      OPENAI_API_KEY: 'gateway-key',
      OPENAI_BASE_URL: 'https://unapproved.example/v1',
      OPENAI_MODEL: 'gpt-5.6-terra',
    }),
  /OPENAI_BASE_URL must be an approved HTTPS endpoint/
)

assert.throws(
  () =>
    resolveOpenAIConfig({
      OPENAI_API_KEY: 'gateway-key',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_MODEL: 'unreviewed-model',
    }),
  /OPENAI_MODEL does not match the approved provider endpoint/
)

assert.match(
  buildDiagnosisRetryInstruction({
    reason: 'invalid_icd_code',
    rejectedCode: 'I16.0',
  }),
  /I16\.0.*WHO ICD-10 2010.*ICD-10-CM/s
)

assert.deepEqual(buildDiagnosisProviderRequest('openrouter.ai'), {
  service_tier: 'priority',
  provider: {
    sort: 'throughput',
    preferred_max_latency: { p90: 3 },
  },
})
assert.deepEqual(buildDiagnosisProviderRequest('api.openai.com'), {
  service_tier: 'priority',
})

assert.throws(
  () =>
    resolveOpenAIConfig({
      OPENAI_API_KEY: 'gateway-key',
      OPENAI_BASE_URL: 'https://openrouter.ai/api/v1',
    }),
  /OPENAI_MODEL is not configured/
)

assert.throws(
  () =>
    resolveOpenAIConfig({
      OPENAI_API_KEY: 'gateway-key',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      OPENAI_MODEL: 'openai/gpt-5.6-luna',
    }),
  /OPENAI_MODEL does not match the approved provider endpoint/
)

console.log('diagnosis OpenAI provider policy tests passed')
