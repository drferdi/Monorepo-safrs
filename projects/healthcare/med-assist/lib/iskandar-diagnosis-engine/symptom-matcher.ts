// Designed and constructed by Drferdi.
import { createLogger } from '@/utils/logger';

/**
 * Iskandar Diagnosis Engine V1 — Symptom Matcher (Deterministic)
 * IDF-weighted + Coverage + Jaccard scoring against 159-disease KB
 *
 * Pure function, NO API calls. Runs in <100ms for 159 diseases.
 * Adapted for Chrome Extension context (fetch-based loading).
 *
 * @module lib/iskandar-diagnosis-engine/symptom-matcher
 */

// =============================================================================
// TYPES
// =============================================================================

export interface MatcherInput {
  keluhanUtama: string;
  keluhanTambahan?: string;
  usia?: number;
  jenisKelamin?: 'L' | 'P';
}

export interface MatchedCandidate {
  diseaseId: string;
  nama: string;
  icd10: string;
  kompetensi: string;
  bodySystem: string;
  matchScore: number;
  rawMatchScore: number;
  matchedSymptoms: string[];
  totalSymptoms: number;
  redFlags: string[];
  terpiData: Array<{ obat: string; dosis: string; frek: string }>;
  kriteria_rujukan: string;
  definisi: string;
  diagnosisBanding: string[];
  advancedGuideline?: unknown;
}

interface PenyakitEntry {
  id: string;
  nama: string;
  icd10: string;
  source: string;
  kompetensi: string;
  body_system: string;
  definisi: string;
  gejala_klinis: string[];
  pemeriksaan_fisik: string[];
  diagnosis_banding: string[];
  komplikasi: string[];
  red_flags: string[];
  terapi: Array<{ obat: string; dosis: string; frek: string }>;
  kriteria_rujukan: string;
  advanced_guideline?: unknown;
}

interface PenyakitDatabase {
  _metadata: { version: string; total_diseases: number };
  penyakit: PenyakitEntry[];
}

const matcherLog = createLogger('DiagnosisMatcher', 'global');

// =============================================================================
// SINGLETON CACHE
// =============================================================================

let cachedDB: PenyakitDatabase | null = null;
let cachedIDF: Map<string, number> | null = null;

const INDONESIAN_STOPWORDS = new Set([
  'yang',
  'dan',
  'di',
  'ke',
  'dari',
  'pada',
  'untuk',
  'dengan',
  'adalah',
  'ini',
  'itu',
  'atau',
  'juga',
  'tidak',
  'ada',
  'akan',
  'bisa',
  'sudah',
  'telah',
  'sedang',
  'masih',
  'belum',
  'hanya',
  'saja',
  'lebih',
  'sangat',
  'seperti',
  'oleh',
  'karena',
  'sering',
  'dapat',
  'dalam',
  'secara',
  'antara',
  'tanpa',
  'melalui',
  'tentang',
  'setelah',
  'sebelum',
  'selama',
  'hingga',
  'sampai',
  'sejak',
  'mungkin',
  'biasanya',
  'kadang',
  'pernah',
  'sering',
  'dimulai',
  'riwayat',
  'pasien',
  'penting',
  'ditanyakan',
  'keluhan',
  'gejala',
  'tanda',
  'berupa',
  'disertai',
  'timbul',
  'terjadi',
  'dirasakan',
  'utama',
  'lainnya',
  'klinis',
  'tersebut',
  'umumnya',
]);

// =============================================================================
// DATA LOADING
// =============================================================================

async function loadPenyakitDB(): Promise<PenyakitDatabase> {
  if (cachedDB) return cachedDB;

  const response = await fetch('/data/penyakit.json');
  if (!response.ok) {
    matcherLog.debug('kb_load_result', {
      source: 'symptom-matcher',
      kbLoaded: false,
      kbDiseaseCount: 0,
      mockMode: import.meta.env.VITE_USE_MOCK === 'true',
      status: 'kb_load_error',
    });
    throw new Error(`Failed to load penyakit.json: ${response.status}`);
  }

  const parsed = (await response.json()) as Partial<PenyakitDatabase> & {
    diseases?: PenyakitEntry[];
  };
  const penyakit = Array.isArray(parsed.penyakit)
    ? parsed.penyakit
    : Array.isArray(parsed.diseases)
      ? parsed.diseases
      : null;

  if (
    !parsed._metadata ||
    typeof parsed._metadata.version !== 'string' ||
    !parsed._metadata.version
  ) {
    throw new Error('Invalid penyakit.json: missing _metadata.version');
  }
  if (!penyakit || penyakit.length === 0) {
    throw new Error('Invalid penyakit.json: missing penyakit array');
  }
  const invalidEntry = penyakit.find(
    (item) =>
      !item ||
      typeof item.id !== 'string' ||
      typeof item.nama !== 'string' ||
      typeof item.icd10 !== 'string' ||
      !Array.isArray(item.gejala_klinis) ||
      typeof item.source !== 'string' ||
      item.source.trim().length === 0
  );
  if (invalidEntry) {
    throw new Error(`Invalid penyakit.json entry: ${invalidEntry.id || 'unknown'}`);
  }

  cachedDB = {
    _metadata: parsed._metadata,
    penyakit,
  };
  matcherLog.debug('kb_load_result', {
    source: 'symptom-matcher',
    kbLoaded: true,
    kbDiseaseCount: cachedDB.penyakit.length,
    mockMode: import.meta.env.VITE_USE_MOCK === 'true',
    status: 'ok',
  });
  return cachedDB!;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !INDONESIAN_STOPWORDS.has(t));
}

function buildIDF(diseases: PenyakitEntry[]): Map<string, number> {
  if (cachedIDF) return cachedIDF;

  const docFreq = new Map<string, number>();
  const N = diseases.length;

  for (const p of diseases) {
    const tokens = new Set(p.gejala_klinis.flatMap((g) => tokenize(g)));
    for (const t of tokens) {
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
  }

  cachedIDF = new Map<string, number>();
  for (const [token, df] of docFreq) {
    cachedIDF.set(token, Math.log((N + 1) / (df + 1)) + 1);
  }
  return cachedIDF;
}

// =============================================================================
// SCORING
// =============================================================================

function scoreDisease(
  inputTokens: Set<string>,
  disease: PenyakitEntry,
  idf: Map<string, number>
): { combined: number; matched: string[] } {
  const diseaseTokens = new Set(disease.gejala_klinis.flatMap((g) => tokenize(g)));
  if (diseaseTokens.size === 0) return { combined: 0, matched: [] };

  // Intersection
  const intersection = new Set([...inputTokens].filter((t) => diseaseTokens.has(t)));
  const matched = [...intersection];
  if (intersection.size === 0) return { combined: 0, matched: [] };

  // IDF-weighted score
  let inputWeight = 0;
  let matchWeight = 0;
  for (const t of inputTokens) {
    inputWeight += idf.get(t) || 1;
  }
  for (const t of intersection) {
    matchWeight += idf.get(t) || 1;
  }
  const idfScore = inputWeight > 0 ? matchWeight / inputWeight : 0;

  // Coverage score: how much of the disease's symptoms are matched
  const coverageScore = intersection.size / diseaseTokens.size;

  // Jaccard similarity
  const union = new Set([...inputTokens, ...diseaseTokens]);
  const jaccardScore = intersection.size / union.size;

  // Combined: IDF(50%) + Coverage(30%) + Jaccard(20%)
  const combined = idfScore * 0.5 + coverageScore * 0.3 + jaccardScore * 0.2;

  return { combined: Math.min(1, combined), matched };
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Match patient symptoms against 159-disease KB.
 * Returns top candidates sorted by match score.
 */
export async function matchSymptoms(input: MatcherInput, topN = 10): Promise<MatchedCandidate[]> {
  const db = await loadPenyakitDB();
  const idf = buildIDF(db.penyakit);

  // Combine keluhan into tokens
  const text = `${input.keluhanUtama} ${input.keluhanTambahan || ''}`;
  const inputTokens = new Set(tokenize(text));

  if (inputTokens.size === 0) return [];

  // Score all diseases
  const candidates: MatchedCandidate[] = [];

  for (const p of db.penyakit) {
    const { combined, matched } = scoreDisease(inputTokens, p, idf);
    if (combined < 0.05) continue; // Minimum threshold

    candidates.push({
      diseaseId: p.id,
      nama: p.nama,
      icd10: p.icd10,
      kompetensi: p.kompetensi,
      bodySystem: p.body_system,
      matchScore: combined,
      rawMatchScore: combined,
      matchedSymptoms: matched,
      totalSymptoms: p.gejala_klinis.length,
      redFlags: p.red_flags || [],
      terpiData: p.terapi || [],
      kriteria_rujukan: p.kriteria_rujukan || '',
      definisi: p.definisi || '',
      diagnosisBanding: p.diagnosis_banding || [],
      advancedGuideline: p.advanced_guideline,
    });
  }

  // Sort descending
  candidates.sort((a, b) => b.matchScore - a.matchScore);
  return candidates.slice(0, topN);
}

/**
 * Get total disease count in KB (for audit/status)
 */
export async function getKBDiseaseCount(): Promise<number> {
  const db = await loadPenyakitDB();
  return db.penyakit.length;
}

/**
 * Clear cached data (for testing)
 */

function formatKbIcdCode(icd10: string): string {
  const trimmed = icd10.trim().toUpperCase();
  if (/^[A-Z][0-9]{2}$/.test(trimmed)) return `${trimmed}.0`;
  if (/^[A-Z][0-9]{3,4}$/.test(trimmed)) return `${trimmed.slice(0, 3)}.${trimmed.slice(3)}`;
  return trimmed;
}

/**
 * Search KB penyakit by partial disease name (manual doctor diagnosis entry).
 */
export async function searchPenyakitByName(
  query: string,
  limit = 5
): Promise<Array<{ icd_x: string; nama: string }>> {
  const db = await loadPenyakitDB();
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) return [];

  return db.penyakit
    .filter((entry) => entry.nama.toLowerCase().includes(normalizedQuery))
    .slice(0, limit)
    .map((entry) => ({
      icd_x: formatKbIcdCode(entry.icd10),
      nama: entry.nama,
    }));
}
/**
 * Look up a full KB disease entry by ICD-10 code (for downstream reasoning that
 * needs `kompetensi` / `kriteria_rujukan` / `red_flags`, which are not carried
 * on `DiagnosisSuggestion`). Falls back to a 3-character category match.
 */
export async function getPenyakitByIcd(
  icd: string
): Promise<Pick<
  PenyakitEntry,
  | 'id'
  | 'nama'
  | 'icd10'
  | 'kompetensi'
  | 'red_flags'
  | 'kriteria_rujukan'
  | 'gejala_klinis'
  | 'diagnosis_banding'
> | null> {
  const db = await loadPenyakitDB();
  const target = icd.trim().toUpperCase().replace(/\./g, '');
  if (!target) return null;

  const normalize = (value: string): string => value.trim().toUpperCase().replace(/\./g, '');

  const exact = db.penyakit.find((entry) => normalize(entry.icd10) === target);
  const match =
    exact ?? db.penyakit.find((entry) => normalize(entry.icd10).startsWith(target.slice(0, 3)));
  if (!match) return null;

  return {
    id: match.id,
    nama: match.nama,
    icd10: match.icd10,
    kompetensi: match.kompetensi,
    red_flags: match.red_flags ?? [],
    kriteria_rujukan: match.kriteria_rujukan ?? '',
    gejala_klinis: match.gejala_klinis ?? [],
    diagnosis_banding: match.diagnosis_banding ?? [],
  };
}

export function clearMatcherCache(): void {
  cachedDB = null;
  cachedIDF = null;
}
