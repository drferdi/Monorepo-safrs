/**
 * Symptom Suggest — Autocomplete keluhan dari KB penyakit
 * Client-safe (tidak import server-only).
 * Data di-pass dari server atau di-fetch via API.
 */

export interface SymptomSuggestion {
  text: string
  source: string // nama penyakit asal
}

export function suggestSymptoms(query: string, symptoms: string[], topN = 8): SymptomSuggestion[] {
  if (!query.trim() || query.length < 2) return []

  const q = query.toLowerCase()
  const seen = new Set<string>()
  const results: SymptomSuggestion[] = []

  for (const s of symptoms) {
    const lower = s.toLowerCase()
    if (lower.includes(q) && !seen.has(lower)) {
      seen.add(lower)
      results.push({ text: s, source: '' })
      if (results.length >= topN) break
    }
  }

  return results
}
