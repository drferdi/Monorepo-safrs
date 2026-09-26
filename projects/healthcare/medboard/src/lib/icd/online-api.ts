import 'server-only'

export interface OnlineIcdResult {
  code: string
  name: string
}

const NLM_ENDPOINT = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search'
const CACHE_TTL = 10 * 60 * 1000 // 10 menit
const CACHE_MAX = 500

type CacheEntry = { data: OnlineIcdResult[]; at: number }
const cache = new Map<string, CacheEntry>()

/**
 * Search ICD-10-CM codes via NLM Clinical Tables API (free, no registration).
 * Returns array of { code, name } sorted by relevance.
 */
export async function searchIcdOnline(query: string, maxList = 40): Promise<OnlineIcdResult[]> {
  const key = `${query.trim().toUpperCase()}:${maxList}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data

  const url = `${NLM_ENDPOINT}?terms=${encodeURIComponent(query)}&maxList=${maxList}&df=code,name&sf=code,name`

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`NLM API ${res.status}: ${res.statusText}`)

  // NLM format: [totalCount, [code...], null, [[code, name]...]]
  const payload = (await res.json()) as [number, string[], null, [string, string][]]
  const pairs = payload[3] ?? []
  const data: OnlineIcdResult[] = pairs.map(([code, name]) => ({ code, name }))

  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) cache.delete(firstKey)
  }
  cache.set(key, { data, at: Date.now() })

  return data
}
