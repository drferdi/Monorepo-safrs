/**
 * BM25 — Okapi Best Matching 25
 *
 * Replaces simple countMatches() token inclusion in pre-filter.
 * BM25 accounts for:
 * - Term frequency saturation (repeated terms don't linearly increase score)
 * - Document length normalization (longer docs don't dominate)
 * - Inverse document frequency (rare terms are more discriminating)
 *
 * Parameters: k1=1.5, b=0.75 (standard values from Robertson et al.)
 */

// ── Types ────────────────────────────────────────────────────────────────────

type BM25Index = {
  documents: BM25Document[]
  avgDocLength: number
  idf: Map<string, number>
  totalDocs: number
}

type BM25Document = {
  id: string
  tokens: string[]
  length: number
  tf: Map<string, number>
}

// ── Constants ────────────────────────────────────────────────────────────────

const K1 = 1.5
const B = 0.75

// ── Index Builder ────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3)
}

function computeTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1)
  }
  return tf
}

export function buildBM25Index(documents: Array<{ id: string; text: string }>): BM25Index {
  const bm25Docs: BM25Document[] = []
  const docFrequency = new Map<string, number>()

  for (const doc of documents) {
    const tokens = tokenize(doc.text)
    const tf = computeTermFrequency(tokens)

    // Count doc frequency per unique term
    for (const term of tf.keys()) {
      docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1)
    }

    bm25Docs.push({ id: doc.id, tokens, length: tokens.length, tf })
  }

  const totalDocs = bm25Docs.length
  const avgDocLength =
    totalDocs > 0 ? bm25Docs.reduce((sum, d) => sum + d.length, 0) / totalDocs : 0

  // Pre-compute IDF for all terms
  const idf = new Map<string, number>()
  for (const [term, df] of docFrequency) {
    // IDF formula: log((N - n + 0.5) / (n + 0.5) + 1)
    idf.set(term, Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1))
  }

  return { documents: bm25Docs, avgDocLength, idf, totalDocs }
}

// ── Query Scoring ────────────────────────────────────────────────────────────

export function scoreBM25(
  index: BM25Index,
  queryTokens: string[]
): Array<{ id: string; score: number }> {
  if (index.totalDocs === 0 || queryTokens.length === 0) return []

  const results: Array<{ id: string; score: number }> = []

  for (const doc of index.documents) {
    let score = 0

    for (const qToken of queryTokens) {
      const idfValue = index.idf.get(qToken) ?? 0
      if (idfValue <= 0) continue

      const tf = doc.tf.get(qToken) ?? 0
      if (tf === 0) continue

      // BM25 formula: IDF * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl/avgdl))
      const numerator = tf * (K1 + 1)
      const denominator = tf + K1 * (1 - B + B * (doc.length / index.avgDocLength))
      score += idfValue * (numerator / denominator)
    }

    if (score > 0) {
      results.push({ id: doc.id, score })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}
