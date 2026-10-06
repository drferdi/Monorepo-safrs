// AI picks the best codes among the search results (Chief 2026-10-07: "dari banyaknya diagnosis yang
// muncul AI membantu mencarikan mana yang terbaik"). DeepSeek chat sees only the typed text, with
// long numbers removed, and the candidate list; any code outside that list is dropped, so the AI
// cannot invent a code. The doctor still chooses.

export interface IcdCandidate {
  code: string
  name: string
}

export interface IcdPick extends IcdCandidate {
  reason: string
}

export type IcdPickResult = { available: true; picks: IcdPick[] } | { available: false; reason: string }

const MAX_CANDIDATES = 30
const MAX_PICKS = 3

const SYSTEM_PROMPT = `Anda membantu dokter layanan primer (Puskesmas, Indonesia) memilih kode ICD-10 versi 2010 untuk PCare/ePuskesmas.
Dari daftar kandidat, pilih paling banyak tiga kode yang paling tepat untuk teks dokter, terbaik lebih dulu.
Aturan: hanya kode yang ada di daftar; utamakan subkode yang paling spesifik yang didukung teks; pilih subkode .9 (tidak spesifik) bila teks tidak menyebut rincian; jangan memilih kode sebab luar (V01-Y98) sebagai diagnosis utama.
Jawab hanya dengan JSON: {"picks": [{"code": "kode dari daftar", "reason": "alasan singkat satu kalimat dalam bahasa Indonesia"}]}`

const unavailable = (reason: string): IcdPickResult => ({ available: false, reason })

/** Long digit runs (NIK, BPJS number, phone) never leave the server. */
export function redactQuery(query: string): string {
  return query.replace(/\d[\d\s-]{4,}\d/g, '[angka dihapus]').slice(0, 200).trim()
}

function parsePicks(content: string, byCode: Map<string, IcdCandidate>): IcdPick[] | null {
  const json = content.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || !('picks' in parsed) || !Array.isArray(parsed.picks)) return null
  const picks: IcdPick[] = []
  for (const item of parsed.picks) {
    if (!item || typeof item !== 'object') continue
    const code = 'code' in item && typeof item.code === 'string' ? item.code.trim().toUpperCase() : ''
    const reason = 'reason' in item && typeof item.reason === 'string' ? item.reason.trim() : ''
    const candidate = byCode.get(code)
    if (!candidate || picks.some((pick) => pick.code === code)) continue
    picks.push({ ...candidate, reason })
    if (picks.length === MAX_PICKS) break
  }
  return picks
}

export async function pickBestIcd(
  query: string,
  candidates: ReadonlyArray<IcdCandidate>,
  options: { apiKey?: string; fetchImpl?: typeof fetch } = {}
): Promise<IcdPickResult> {
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY ?? ''
  if (!apiKey) return unavailable('Saran AI belum tersedia di server ini.')
  const shortlist = candidates.slice(0, MAX_CANDIDATES)
  if (shortlist.length === 0) return unavailable('Belum ada kandidat kode untuk dipilih.')
  const byCode = new Map(shortlist.map((candidate) => [candidate.code.toUpperCase(), candidate]))
  const fetchImpl = options.fetchImpl ?? fetch

  const userPrompt = [
    `Teks dokter: ${redactQuery(query)}`,
    `Kandidat:\n${shortlist.map((candidate) => `${candidate.code}: ${candidate.name}`).join('\n')}`,
    'Berikan jawaban dalam format json.',
  ].join('\n\n')

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
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return unavailable(`Saran AI gagal (HTTP ${response.status}).`)
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const picks = parsePicks(data.choices?.[0]?.message?.content ?? '', byCode)
    if (!picks) return unavailable('Jawaban AI tidak terbaca.')
    if (picks.length === 0) return unavailable('AI tidak menemukan kode yang cocok di daftar ini.')
    return { available: true, picks }
  } catch {
    return unavailable('Saran AI tidak dapat dihubungi.')
  }
}
