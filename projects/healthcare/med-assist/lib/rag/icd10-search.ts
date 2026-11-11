// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * ICD-10 Search Engine
 * Full-text search with relevance scoring
 *
 * @module lib/rag/icd10-search
 * @version 1.0.0
 */

import { icd10DB } from './icd10-db';
import type { ICD10Entry, RAGSearchOptions, RAGSearchResult } from './types';
import {
  DEFAULT_SEARCH_OPTIONS,
  isValidICD10Code,
  PUSKESMAS_COMMON_CODES,
  SYMPTOM_KEYWORDS,
} from './types';

// =============================================================================
// SEARCH ENGINE
// =============================================================================

/**
 * Search ICD-10 codes by query string
 * Supports: direct code, keywords, symptoms, free text
 */
export async function searchICD10(
  query: string,
  options: RAGSearchOptions = {}
): Promise<RAGSearchResult[]> {
  const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return [];
  }

  const results: RAGSearchResult[] = [];

  // Strategy 1: Exact code match
  if (isValidICD10Code(query.toUpperCase())) {
    const exactMatch = await icd10DB.getByCode(query);
    if (exactMatch) {
      results.push({
        entry: exactMatch,
        relevance_score: 1.0,
        match_type: 'exact_code',
      });
    }
  }

  // Strategy 2: Code prefix match
  if (/^[A-Z]\d{0,2}$/i.test(query)) {
    const prefixMatches = await icd10DB.searchByCodePrefix(query, opts.limit);
    prefixMatches.forEach((entry) => {
      if (!results.some((r) => r.entry.code === entry.code)) {
        results.push({
          entry,
          relevance_score: 0.9,
          match_type: 'category',
        });
      }
    });
  }

  // Strategy 3: Symptom keyword expansion
  const expandedCategories = expandSymptomKeywords(normalizedQuery);
  if (expandedCategories.length > 0) {
    const categoryEntries = await fetchCategoryEntries(expandedCategories);
    categoryEntries.forEach((entry) => {
      if (!results.some((r) => r.entry.code === entry.code)) {
        const matchedKeywords = findMatchedKeywords(normalizedQuery, entry);
        results.push({
          entry,
          relevance_score: calculateKeywordScore(normalizedQuery, entry, matchedKeywords),
          match_type: 'keyword',
          matched_keywords: matchedKeywords,
        });
      }
    });
  }

  // Strategy 4: Direct keyword index lookup
  const keywords = extractSearchKeywords(normalizedQuery);
  for (const keyword of keywords) {
    const keywordMatches = await icd10DB.getByKeyword(keyword);
    keywordMatches.forEach((entry) => {
      if (!results.some((r) => r.entry.code === entry.code)) {
        results.push({
          entry,
          relevance_score: calculateKeywordScore(normalizedQuery, entry, [keyword]),
          match_type: 'keyword',
          matched_keywords: [keyword],
        });
      }
    });
  }

  // Strategy 5: Fuzzy text search in descriptions
  if (results.length < opts.limit) {
    const fuzzyResults = await fuzzySearchDescriptions(
      normalizedQuery,
      opts.limit - results.length
    );
    fuzzyResults.forEach((result) => {
      if (!results.some((r) => r.entry.code === result.entry.code)) {
        results.push(result);
      }
    });
  }

  // Apply filters and scoring adjustments
  let filtered = results
    .filter((r) => r.relevance_score >= opts.min_score)
    .filter((r) => !opts.leaf_only || r.entry.is_leaf)
    .filter((r) => !opts.chapter_filter || r.entry.chapter === opts.chapter_filter);

  // Boost common Puskesmas diagnoses
  if (opts.boost_common) {
    filtered = filtered.map((r) => ({
      ...r,
      relevance_score: boostCommonScore(r),
    }));
  }

  // Sort by relevance and limit
  return filtered.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, opts.limit);
}

/**
 * Search specifically for diagnosis suggestions (AI context)
 * Returns entries formatted for RAG prompt context
 */
export async function searchForDiagnosisSuggestions(
  chiefComplaint: string,
  additionalSymptoms?: string,
  limit = 15
): Promise<RAGSearchResult[]> {
  // Combine complaints for better coverage
  const fullQuery = [chiefComplaint, additionalSymptoms].filter(Boolean).join(' ');

  // Search with boosted common diagnoses
  const results = await searchICD10(fullQuery, {
    limit,
    leaf_only: true,
    boost_common: true,
    min_score: 0.2,
  });

  return results;
}

/**
 * Verify if ICD-10 codes exist in database
 * Used for validation layer
 */
export async function verifyICD10Codes(codes: string[]): Promise<{
  valid: string[];
  invalid: string[];
}> {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const code of codes) {
    const exists = await icd10DB.exists(code);
    if (exists) {
      valid.push(code);
    } else {
      invalid.push(code);
    }
  }

  return { valid, invalid };
}

/**
 * Get ICD-10 entries for given codes
 * Used for displaying diagnosis details
 */
export async function getICD10Details(codes: string[]): Promise<ICD10Entry[]> {
  return icd10DB.getByCodes(codes);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Expand symptom keywords to ICD-10 categories
 */
function expandSymptomKeywords(query: string): string[] {
  const categories: Set<string> = new Set();

  for (const [symptom, cats] of Object.entries(SYMPTOM_KEYWORDS)) {
    if (query.includes(symptom)) {
      cats.forEach((c) => categories.add(c));
    }
  }

  // Also check individual words
  const words = query.split(/\s+/);
  for (const word of words) {
    for (const [symptom, cats] of Object.entries(SYMPTOM_KEYWORDS)) {
      if (symptom.includes(word) || word.includes(symptom)) {
        cats.forEach((c) => categories.add(c));
      }
    }
  }

  return Array.from(categories);
}

/**
 * Fetch entries for multiple categories
 */
async function fetchCategoryEntries(categories: string[]): Promise<ICD10Entry[]> {
  const entries: ICD10Entry[] = [];

  for (const category of categories) {
    if (category.length === 3) {
      // Full category code
      const categoryEntries = await icd10DB.getByCategory(category);
      entries.push(...categoryEntries);
    } else {
      // Code prefix
      const prefixEntries = await icd10DB.searchByCodePrefix(category, 10);
      entries.push(...prefixEntries);
    }
  }

  return entries;
}

/**
 * Extract search keywords from query
 */
function extractSearchKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

/**
 * Find matched keywords between query and entry
 */
function findMatchedKeywords(query: string, entry: ICD10Entry): string[] {
  const queryWords = new Set(extractSearchKeywords(query));
  return entry.keywords.filter((k) => queryWords.has(k));
}

/**
 * Calculate keyword-based relevance score
 */
function calculateKeywordScore(
  query: string,
  entry: ICD10Entry,
  matchedKeywords: string[]
): number {
  const queryWords = extractSearchKeywords(query);

  if (queryWords.length === 0) return 0.1;

  // Base score from keyword matches
  const keywordScore = matchedKeywords.length / Math.max(queryWords.length, 1);

  // Boost for description matches
  const descScore = calculateDescriptionMatch(query, entry);

  // Combine scores
  return Math.min(0.95, keywordScore * 0.6 + descScore * 0.4);
}

/**
 * Calculate description match score
 */
function calculateDescriptionMatch(query: string, entry: ICD10Entry): number {
  const queryLower = query.toLowerCase();
  const nameLower = (entry.name_id + ' ' + entry.name_en).toLowerCase();

  // Check for substring matches
  const words = extractSearchKeywords(queryLower);
  let matches = 0;

  for (const word of words) {
    if (nameLower.includes(word)) {
      matches++;
    }
  }

  return words.length > 0 ? matches / words.length : 0;
}

/**
 * Boost score for common Puskesmas diagnoses
 */
function boostCommonScore(result: RAGSearchResult): number {
  const commonBoost = PUSKESMAS_COMMON_CODES[result.entry.code] || 0;
  // Add up to 0.15 bonus for common codes
  return Math.min(1.0, result.relevance_score + commonBoost * 0.15);
}

/**
 * Fuzzy search in descriptions (fallback)
 */
async function fuzzySearchDescriptions(query: string, limit: number): Promise<RAGSearchResult[]> {
  // For now, use prefix search on common chapters
  // Future: implement proper fuzzy matching
  const results: RAGSearchResult[] = [];

  // Search in common chapters for Puskesmas
  const commonChapters = ['J00-J99', 'A00-B99', 'K00-K93', 'R00-R99'];

  for (const chapter of commonChapters) {
    if (results.length >= limit) break;

    const entries = await icd10DB.getByChapter(chapter);

    for (const entry of entries) {
      if (results.length >= limit) break;

      const descLower = (entry.name_id + ' ' + entry.name_en).toLowerCase();
      const queryLower = query.toLowerCase();

      // Simple contains check
      if (
        descLower.includes(queryLower) ||
        queryLower.split(' ').some((w) => descLower.includes(w))
      ) {
        results.push({
          entry,
          relevance_score: 0.3, // Lower score for fuzzy matches
          match_type: 'fuzzy',
        });
      }
    }
  }

  return results;
}

// =============================================================================
// RAG CONTEXT BUILDER
// =============================================================================

/**
 * Build RAG context string for AI prompt
 * Formats search results for LLM consumption
 */
export function buildRAGContext(results: RAGSearchResult[]): string {
  if (results.length === 0) {
    return 'Tidak ada kode ICD-10 yang ditemukan dalam database.';
  }

  const lines = results.map((r, i) => {
    const entry = r.entry;
    return `${i + 1}. ${entry.code} - ${entry.name_id} (${entry.name_en})`;
  });

  return `Kode ICD-10 yang relevan dari database:\n${lines.join('\n')}`;
}

/**
 * Build detailed RAG context with keywords
 */
export function buildDetailedRAGContext(results: RAGSearchResult[]): string {
  if (results.length === 0) {
    return 'Tidak ada kode ICD-10 yang ditemukan dalam database.';
  }

  const lines = results.map((r, i) => {
    const entry = r.entry;
    const keywords = entry.keywords.slice(0, 5).join(', ');
    const confidence = (r.relevance_score * 100).toFixed(0);

    return [
      `${i + 1}. Kode: ${entry.code}`,
      `   Nama: ${entry.name_id}`,
      `   English: ${entry.name_en}`,
      `   Keywords: ${keywords}`,
      `   Relevance: ${confidence}%`,
    ].join('\n');
  });

  return `Kode ICD-10 yang relevan dari database lokal:\n\n${lines.join('\n\n')}`;
}
