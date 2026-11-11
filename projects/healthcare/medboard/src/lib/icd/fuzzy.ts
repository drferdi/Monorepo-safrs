// Typo-tolerant diagnosis search (Chief 2026-10-07: "salah tulisan namun mirip dapat di arahkan ke
// nama diagnosis"). Every typed word is matched to the vocabulary of diagnosis names by edit
// distance; a diagnosis matches when all typed words do. Plain names rank before narrower ones.

export interface FuzzyMatch {
  code: string
  title: string
  score: number
}

export interface FuzzyResult {
  matches: FuzzyMatch[]
  /** The query rewritten with the words it was redirected to, or null when nothing was changed. */
  corrected: string | null
}

interface IndexedEntry {
  code: string
  title: string
  /** Word lists of the catalogue title and any Indonesian names. */
  names: string[][]
}

export interface FuzzyIndex {
  entries: IndexedEntry[]
  vocab: Map<string, number[]>
}

const GENERIC = new Set(['unspecified', 'nos'])
const STOPWORDS = new Set(['of', 'the', 'and', 'with', 'without', 'due', 'to', 'in', 'or', 'by', 'dan', 'yang', 'dengan', 'di'])

function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 2 && !STOPWORDS.has(word))
}

// Mistakes allowed for a word of this length: none for short words, so "flu" never becomes "flux".
function allowed(length: number): number {
  if (length <= 3) return 0
  return length <= 7 ? 1 : 2
}

/** Damerau (optimal string alignment) distance; returns limit + 1 once it is sure to exceed limit. */
export function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1
  let before = new Array<number>(b.length + 1).fill(0)
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = new Array<number>(b.length + 1).fill(0)
    current[0] = i
    let rowBest = current[0]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, before[j - 2] + 1)
      current[j] = value
      rowBest = Math.min(rowBest, value)
    }
    if (rowBest > limit) return limit + 1
    before = previous
    previous = current
  }
  return Math.min(previous[b.length], limit + 1)
}

export function buildFuzzyIndex(
  catalog: ReadonlyArray<{ code: string; title: string }>,
  localNames: ReadonlyArray<{ code: string; name: string }> = []
): FuzzyIndex {
  const extra = new Map<string, string[][]>()
  for (const { code, name } of localNames) {
    const list = extra.get(code) ?? []
    list.push(words(name))
    extra.set(code, list)
  }
  const entries = catalog.map(({ code, title }) => ({ code, title, names: [words(title), ...(extra.get(code) ?? [])] }))
  const vocab = new Map<string, number[]>()
  entries.forEach((entry, i) => {
    for (const word of new Set(entry.names.flat())) {
      const list = vocab.get(word)
      if (list) list.push(i)
      else vocab.set(word, [i])
    }
  })
  return { entries, vocab }
}

// Vocabulary words a typed word may stand for, with their cost: 0 exact, 0.25 the start of a longer
// word ("pneumonia" in "pneumoniae"), otherwise the number of mistakes.
function wordCosts(index: FuzzyIndex, typed: string): Map<string, number> {
  const costs = new Map<string, number>()
  if (index.vocab.has(typed)) costs.set(typed, 0)
  const limit = allowed(typed.length)
  for (const word of index.vocab.keys()) {
    if (word === typed) continue
    if (typed.length >= 4 && word.startsWith(typed)) {
      costs.set(word, 0.25)
      continue
    }
    if (limit === 0) continue
    const distance = editDistance(typed, word, limit)
    if (distance <= limit) costs.set(word, distance)
  }
  return costs
}

export function fuzzySearch(index: FuzzyIndex, query: string, limit: number): FuzzyResult {
  const typed = words(query)
  if (typed.length === 0) return { matches: [], corrected: null }

  const perWord = typed.map((word) => wordCosts(index, word))
  if (perWord.some((costs) => costs.size === 0)) return { matches: [], corrected: null }

  // A typed word with no exact or prefix match is redirected to its closest word, the most common on ties.
  let changed = false
  const correctedWords = typed.map((word, i) => {
    const costs = perWord[i]
    if ([...costs.values()].some((cost) => cost < 1)) return word
    changed = true
    return [...costs.entries()].sort(
      (a, b) => a[1] - b[1] || (index.vocab.get(b[0])?.length ?? 0) - (index.vocab.get(a[0])?.length ?? 0)
    )[0][0]
  })

  const hitSets = perWord.map((costs) => {
    const hits = new Set<number>()
    for (const word of costs.keys()) for (const i of index.vocab.get(word) ?? []) hits.add(i)
    return hits
  })
  const candidates = [...hitSets[0]].filter((i) => hitSets.every((hits) => hits.has(i)))

  const ranked: Array<FuzzyMatch & { leads: boolean; length: number }> = []
  for (const i of candidates) {
    const entry = index.entries[i]
    let best: { score: number; leads: boolean; length: number } | null = null
    for (const name of entry.names) {
      let score = 0
      for (const costs of perWord) {
        const cost = Math.min(...name.map((word) => costs.get(word) ?? Infinity))
        score += cost
      }
      if (!Number.isFinite(score)) continue
      // The name starts with what the first typed word stands for, typos included.
      const leads = name.length > 0 && perWord[0].has(name[0])
      // "Unspecified" adds no detail: with nothing more typed, the unspecified code is the right one.
      const length = name.filter((word) => !GENERIC.has(word)).length
      const candidate = { score, leads, length }
      if (
        !best ||
        candidate.score < best.score ||
        (candidate.score === best.score && Number(candidate.leads) > Number(best.leads)) ||
        (candidate.score === best.score && candidate.leads === best.leads && candidate.length < best.length)
      ) {
        best = candidate
      }
    }
    if (best) ranked.push({ code: entry.code, title: entry.title, ...best })
  }

  ranked.sort(
    (a, b) =>
      a.score - b.score || Number(b.leads) - Number(a.leads) || a.length - b.length || a.code.localeCompare(b.code)
  )
  return {
    matches: ranked.slice(0, limit).map(({ code, title, score }) => ({ code, title, score })),
    corrected: changed ? correctedWords.join(' ') : null,
  }
}
