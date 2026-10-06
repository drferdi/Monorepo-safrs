// AI review of a Sentrapedia contribution before Chief decides (DeepSeek chat, JSON answer).
import {
  AI_VERDICT_LABELS,
  CONTRIBUTION_FIELD_LABELS,
  type AiReview,
  type AiVerdict,
  type Contribution,
} from '@/lib/sentrapedia/contribution'

const SYSTEM_PROMPT = `Anda adalah peninjau konten medis Sentrapedia, referensi klinis untuk dokter layanan primer di Puskesmas Indonesia.
Nilai usulan kontribusi berdasarkan: akurasi klinis menurut pedoman terkini (Permenkes, PNPK, organisasi profesi, WHO), keamanan (dosis, kontraindikasi), konsistensi dengan teks saat ini, kekuatan sumber referensi, dan ada tidaknya data pasien yang dapat dikenali.
Jawab hanya dengan JSON: {"verdict": "layak" | "perlu_perbaikan" | "tidak_layak", "summary": "ringkasan paling banyak dua kalimat dalam bahasa Indonesia", "concerns": ["catatan singkat", ...]}`

const VERDICTS = Object.keys(AI_VERDICT_LABELS) as AiVerdict[]

function unavailable(reason: string): AiReview {
  return { available: false, reason, reviewedAt: new Date().toISOString() }
}

function parseAnswer(content: string): AiReview | null {
  const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const json = clean.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const answer = parsed as Record<string, unknown>
  const verdict = VERDICTS.find((value) => value === answer.verdict)
  const summary = typeof answer.summary === 'string' ? answer.summary.trim() : ''
  if (!verdict || !summary) return null
  const concerns = Array.isArray(answer.concerns)
    ? answer.concerns.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((item) => item.trim())
    : []
  return { available: true, verdict, summary, concerns, reviewedAt: new Date().toISOString() }
}

export async function reviewContribution(
  contribution: Contribution,
  currentText: string,
  options: { apiKey?: string; fetchImpl?: typeof fetch } = {}
): Promise<AiReview> {
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY ?? ''
  if (!apiKey) return unavailable('Tinjauan AI belum tersedia di server ini.')
  const fetchImpl = options.fetchImpl ?? fetch

  const userPrompt = [
    `Penyakit: ${contribution.diseaseName}`,
    `Bagian: ${CONTRIBUTION_FIELD_LABELS[contribution.field]}`,
    `Teks saat ini:\n${currentText || '(kosong)'}`,
    `Usulan kontributor:\n${contribution.proposedText}`,
    `Sumber referensi: ${contribution.reference}`,
    contribution.note ? `Catatan kontributor: ${contribution.note}` : '',
    'Berikan penilaian dalam format json.',
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const response = await fetchImpl('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) return unavailable(`Tinjauan AI gagal (HTTP ${response.status}).`)
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return parseAnswer(data.choices?.[0]?.message?.content ?? '') ?? unavailable('Jawaban AI tidak terbaca.')
  } catch {
    return unavailable('Tinjauan AI tidak dapat dihubungi.')
  }
}
