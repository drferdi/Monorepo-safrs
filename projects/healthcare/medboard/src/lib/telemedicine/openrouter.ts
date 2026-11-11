// OpenRouter free models for the MedLink transcript and its ePuskesmas summary (Chief 2026-10-07:
// "gunakan openrouter free"). OpenRouter has no speech-to-text endpoint: speech goes to chat
// completions as input_audio. Free models are limited to 20 requests a minute and 50 a day (1000 a
// day once 10 credits were ever bought), and their providers publish no data policy; see DECISIONS.

import {
  buildSummaryPrompt,
  type EpuskesmasSummary,
  parseSummary,
  SUMMARY_SYSTEM_PROMPT,
  type TranscriptLine,
} from './epuskesmas-summary'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
// First is used; the rest are OpenRouter fallbacks when it is down or rate limited.
const TRANSCRIBE_MODELS = ['thinkingmachines/inkling-small:free', 'thinkingmachines/inkling:free']
const SUMMARY_MODELS = ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free']

const TRANSCRIBE_PROMPT =
  'Tuliskan ucapan berbahasa Indonesia dalam rekaman ini kata demi kata. Jawab hanya dengan teks ucapannya, tanpa keterangan. Bila tidak ada ucapan yang jelas, jawab kosong.'

interface Options {
  apiKey?: string
  fetchImpl?: typeof fetch
}

type Completion = { ok: true; content: string } | { ok: false; error: string }

async function complete(body: Record<string, unknown>, options: Options): Promise<Completion> {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY ?? ''
  if (!apiKey) return { ok: false, error: 'Layanan AI belum tersedia di server ini.' }
  const fetchImpl = options.fetchImpl ?? fetch
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'X-Title': 'MedBoard' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) return { ok: false, error: `Layanan AI menolak permintaan (HTTP ${response.status}).` }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string | null } }> }
    return { ok: true, content: data.choices?.[0]?.message?.content ?? '' }
  } catch {
    return { ok: false, error: 'Layanan AI tidak menjawab.' }
  }
}

/** One utterance (base64 WAV, 16 kHz mono) to text. */
export async function transcribeSpeech(
  wavBase64: string,
  options: Options = {}
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const result = await complete(
    {
      model: TRANSCRIBE_MODELS[0],
      models: TRANSCRIBE_MODELS,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: TRANSCRIBE_PROMPT },
            { type: 'input_audio', input_audio: { data: wavBase64, format: 'wav' } },
          ],
        },
      ],
      temperature: 0,
    },
    options
  )
  return result.ok ? { ok: true, text: result.content.trim() } : result
}

/** The whole transcript to the ePuskesmas pages. */
export async function summarizeConsult(
  lines: ReadonlyArray<TranscriptLine>,
  known: (code: string) => boolean,
  options: Options = {}
): Promise<{ ok: true; summary: EpuskesmasSummary } | { ok: false; error: string }> {
  const result = await complete(
    {
      model: SUMMARY_MODELS[0],
      models: SUMMARY_MODELS,
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: buildSummaryPrompt(lines) },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    },
    options
  )
  if (!result.ok) return result
  const summary = parseSummary(result.content, known)
  return summary ? { ok: true, summary } : { ok: false, error: 'Ringkasan AI tidak terbaca. Coba ringkas lagi.' }
}
