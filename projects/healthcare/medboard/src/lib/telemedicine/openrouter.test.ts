import assert from 'node:assert/strict'
import test from 'node:test'

import { summarizeConsult, transcribeSpeech } from './openrouter'

type Call = { url: string; body: Record<string, unknown> }

function fakeFetch(content: string, calls: Call[], status = 200): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) as Record<string, unknown> })
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status })
  }) as typeof fetch
}

test('without a key the transcript says it is not available, and nothing is sent', async () => {
  const calls: Call[] = []
  const result = await transcribeSpeech('AAAA', { apiKey: '', fetchImpl: fakeFetch('x', calls) })
  assert.equal(result.ok, false)
  assert.equal(calls.length, 0)
})

test('speech goes to OpenRouter as wav input_audio on a free model with a free fallback', async () => {
  const calls: Call[] = []
  const result = await transcribeSpeech('UklGRg==', { apiKey: 'k', fetchImpl: fakeFetch(' Batuk tiga hari. ', calls) })
  assert.deepEqual(result, { ok: true, text: 'Batuk tiga hari.' })
  assert.equal(calls[0]?.url, 'https://openrouter.ai/api/v1/chat/completions')
  const body = calls[0]?.body
  assert.ok(String(body?.model).endsWith(':free'))
  assert.ok(Array.isArray(body?.models) && body.models.every((id) => String(id).endsWith(':free')))
  assert.match(JSON.stringify(body?.messages), /"type":"input_audio","input_audio":\{"data":"UklGRg==","format":"wav"\}/)
})

test('a provider error is reported, not thrown', async () => {
  const result = await transcribeSpeech('UklGRg==', { apiKey: 'k', fetchImpl: fakeFetch('', [], 429) })
  assert.equal(result.ok, false)
  assert.match(result.ok ? '' : result.error, /429/)
})

test('the summary asks a free model for JSON and returns the ePuskesmas pages', async () => {
  const calls: Call[] = []
  const answer = JSON.stringify({ anamnesa: { keluhan_utama: 'Batuk' } })
  const result = await summarizeConsult(
    [{ speaker: 'pasien', text: 'Batuk', at: '2026-10-07T10:00:00.000Z' }],
    () => true,
    { apiKey: 'k', fetchImpl: fakeFetch(answer, calls) }
  )
  assert.equal(result.ok, true)
  assert.equal(result.ok && result.summary.anamnesa.keluhan_utama, 'Batuk')
  assert.deepEqual(calls[0]?.body.response_format, { type: 'json_object' })
  assert.ok(String(calls[0]?.body.model).endsWith(':free'))
})
