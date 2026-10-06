import assert from 'node:assert/strict'
import test from 'node:test'

import { pickBestIcd } from './ai-pick'

const candidates = [
  { code: 'J18.9', name: 'Pneumonia, unspecified' },
  { code: 'J12.9', name: 'Viral pneumonia, unspecified' },
  { code: 'B01.2', name: 'Varicella pneumonia' },
]

function fakeDeepSeek(content: string, seen: { body?: string } = {}): typeof fetch {
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    seen.body = typeof init?.body === 'string' ? init.body : ''
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
  }) as typeof fetch
}

test('the AI picks only among the candidate codes; an invented code is dropped', async () => {
  const answer = JSON.stringify({
    picks: [
      { code: 'J15.9', reason: 'karangan' },
      { code: 'J12.9', reason: 'Demam dan batuk setelah flu mengarah ke virus.' },
      { code: 'J18.9', reason: 'Bila penyebab tidak diketahui.' },
    ],
  })
  const result = await pickBestIcd('pneumonia setelah flu', candidates, { apiKey: 'k', fetchImpl: fakeDeepSeek(answer) })
  assert.equal(result.available, true)
  if (!result.available) return
  assert.deepEqual(result.picks.map((p) => p.code), ['J12.9', 'J18.9'])
  assert.equal(result.picks[0].name, 'Viral pneumonia, unspecified')
})

test('no identity leaves the server: long numbers (NIK, BPJS, phone) are removed before the AI sees the text', async () => {
  const seen: { body?: string } = {}
  await pickBestIcd('pasien 3201234567890123 hp 081234567890 pneumonia', candidates, {
    apiKey: 'k',
    fetchImpl: fakeDeepSeek('{"picks":[]}', seen),
  })
  assert.ok(seen.body)
  assert.doesNotMatch(seen.body ?? '', /3201234567890123|081234567890/)
})

test('without a key, or when DeepSeek fails, the doctor gets a plain "not available" instead of an error', async () => {
  assert.equal((await pickBestIcd('pneumonia', candidates, { apiKey: '' })).available, false)
  const broken = (async () => {
    throw new Error('offline')
  }) as typeof fetch
  assert.equal((await pickBestIcd('pneumonia', candidates, { apiKey: 'k', fetchImpl: broken })).available, false)
  assert.equal((await pickBestIcd('pneumonia', candidates, { apiKey: 'k', fetchImpl: fakeDeepSeek('bukan json') })).available, false)
})
