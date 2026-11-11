// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * RAG Database Type Definitions
 * ICD-10 Code Repository for Clinical Decision Support
 *
 * @module lib/rag/types
 * @version 1.0.0
 */

// =============================================================================
// ICD-10 ENTRY TYPES
// =============================================================================

/**
 * ICD-10 code entry stored in IndexedDB
 * Supports both English and Indonesian descriptions
 * Extended with 144 Penyakit Puskesmas data
 */
export interface ICD10Entry {
  /** ICD-10 code (e.g., "J06.9", "A09", "E11.9") */
  code: string;

  /** English description from WHO ICD-10 */
  name_en: string;

  /** Indonesian description (Bahasa Indonesia) */
  name_id: string;

  /** ICD-10 chapter range (e.g., "J00-J99" for respiratory) */
  chapter: string;

  /** Category code (3-character, e.g., "J06") */
  category: string;

  /** Block range within chapter (e.g., "J00-J06") */
  block: string;

  /** Searchable keywords in Indonesian for symptom matching */
  keywords: string[];

  /** Commonality score at Puskesmas level (0.0-1.0) */
  commonality: number;

  /** Whether this is a billable/leaf code (true) or header (false) */
  is_leaf: boolean;

  // =========================================================================
  // Extended fields from 144 Penyakit Puskesmas (penyakit.json)
  // =========================================================================

  /** KKI disease number (1-144) */
  kki_no?: number;

  /** Body system (e.g., "SISTEM RESPIRASI") */
  body_system?: string;

  /** Clinical definition */
  definisi?: string;

  /** Clinical symptoms for search matching */
  gejala_klinis?: string[];

  /** Red flags for immediate action */
  red_flags?: string[];

  /** Treatment recommendations */
  terapi?: Array<{ obat: string; dosis: string; frek: string }>;

  /** Referral criteria */
  kriteria_rujukan?: string;

  /** Differential diagnoses */
  diagnosis_banding?: string[];

  /** Competency level (e.g., "4A") */
  kompetensi?: string;
}

/**
 * ICD-10 chapter metadata
 */
export interface ICD10Chapter {
  /** Chapter number (I-XXII in Roman numerals) */
  number: string;

  /** Chapter code range (e.g., "A00-B99") */
  range: string;

  /** Chapter title in English */
  title_en: string;

  /** Chapter title in Indonesian */
  title_id: string;
}

// =============================================================================
// SEARCH TYPES
// =============================================================================

/**
 * Search result with relevance scoring
 */
export interface RAGSearchResult {
  /** Matched ICD-10 entry */
  entry: ICD10Entry;

  /** Relevance score (0.0-1.0) */
  relevance_score: number;

  /** How the match was found */
  match_type: RAGMatchType;

  /** Matched keywords (if keyword match) */
  matched_keywords?: string[];
}

/**
 * Types of matches in RAG search
 */
export type RAGMatchType =
  | 'exact_code' // Direct ICD-10 code match
  | 'keyword' // Keyword in symptoms matched
  | 'fuzzy' // Fuzzy string matching
  | 'category' // Category-level match
  | 'semantic'; // Semantic similarity (future)

/**
 * Search query options
 */
export interface RAGSearchOptions {
  /** Maximum number of results to return */
  limit?: number;

  /** Minimum relevance score threshold (0.0-1.0) */
  min_score?: number;

  /** Filter by chapter (e.g., "J00-J99") */
  chapter_filter?: string;

  /** Only return billable codes */
  leaf_only?: boolean;

  /** Boost common Puskesmas diagnoses */
  boost_common?: boolean;

  /** Include category headers in results */
  include_headers?: boolean;
}

/**
 * Default search options
 */
export const DEFAULT_SEARCH_OPTIONS: Required<RAGSearchOptions> = {
  limit: 10,
  min_score: 0.1,
  chapter_filter: '',
  leaf_only: true,
  boost_common: true,
  include_headers: false,
};

// =============================================================================
// DATABASE TYPES
// =============================================================================

/**
 * Database initialization status
 */
export interface RAGDatabaseStatus {
  /** Whether database is initialized and ready */
  ready: boolean;

  /** Total number of ICD-10 codes loaded */
  entry_count: number;

  /** Database version */
  version: number;

  /** Last update timestamp */
  last_updated: string;

  /** Any initialization errors */
  error?: string;
}

/**
 * Database statistics
 */
export interface RAGDatabaseStats {
  /** Total entries */
  total_entries: number;

  /** Billable codes count */
  leaf_codes: number;

  /** Header codes count */
  header_codes: number;

  /** Chapters loaded */
  chapters: number;

  /** Keywords indexed */
  keywords_indexed: number;

  /** Database size in bytes (approximate) */
  size_bytes: number;
}

// =============================================================================
// LOADER TYPES
// =============================================================================

/**
 * Raw ICD-10 data from legacy source JSON
 * @deprecated Use PenyakitRawData instead
 */
export interface ICD10RawData {
  /** ICD-10 code */
  code: string;

  /** Description (may be English or Indonesian) */
  description: string;

  /** English description if available */
  description_en?: string;

  /** Indonesian description if available */
  description_id?: string;

  /** Parent category code */
  parent?: string;

  /** Whether this is a billable code */
  is_billable?: boolean;
}

/**
 * Therapy/medication recommendation from penyakit.json
 */
export interface TerapiEntry {
  obat: string;
  dosis: string;
  frek: string;
}

/**
 * Penyakit (144 Diagnosa Puskesmas) from penyakit.json
 * Source: PPK IDI 2013 + 144 Diagnosis KKI
 */
export interface PenyakitRawData {
  /** Unique ID (e.g., "DIS-001") */
  id: string;

  /** KKI number (1-144) */
  kki_no: number;

  /** Indonesian name */
  nama: string;

  /** English name */
  nama_en: string;

  /** ICD-10 code */
  icd10: string;

  /** Competency level (all are "4A" for Puskesmas) */
  kompetensi: string;

  /** Body system category */
  body_system: string;

  /** Can be referred to higher facility */
  can_refer: boolean;

  /** Clinical definition */
  definisi: string;

  /** Clinical symptoms */
  gejala_klinis: string[];

  /** Physical examination findings */
  pemeriksaan_fisik: string[];

  /** Differential diagnosis */
  diagnosis_banding: string[];

  /** Complications */
  komplikasi: string[];

  /** Red flags for immediate action */
  red_flags: string[];

  /** Treatment recommendations */
  terapi: TerapiEntry[];

  /** Referral criteria */
  kriteria_rujukan: string;

  /** Data source */
  source: string;
}

/**
 * Penyakit.json file structure
 */
export interface PenyakitDatabase {
  _metadata: {
    version: string;
    description: string;
    last_updated: string;
  };
  penyakit: PenyakitRawData[];
}

/**
 * Loader progress callback
 */
export interface LoaderProgress {
  /** Current phase */
  phase: 'fetching' | 'parsing' | 'indexing' | 'complete' | 'error';

  /** Progress percentage (0-100) */
  progress: number;

  /** Current item being processed */
  current_item?: string;

  /** Total items to process */
  total_items?: number;

  /** Error message if phase is 'error' */
  error?: string;
}

/**
 * LoaderProgressCallback type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-02-04
 */

export type LoaderProgressCallback = (progress: LoaderProgress) => void;

// =============================================================================
// PUSKESMAS COMMON DIAGNOSES
// =============================================================================

/**
 * Common diagnoses at Puskesmas level
 * Used to boost relevance scoring
 */
export const PUSKESMAS_COMMON_CODES: Record<string, number> = {
  // Respiratory infections (very common)
  'J06.9': 0.95, // Acute upper respiratory infection
  J00: 0.9, // Common cold
  'J02.9': 0.85, // Acute pharyngitis
  'J03.9': 0.8, // Acute tonsillitis
  'J18.9': 0.75, // Pneumonia

  // Gastrointestinal (very common)
  A09: 0.95, // Diarrhea and gastroenteritis
  'K29.7': 0.85, // Gastritis
  K30: 0.8, // Dyspepsia

  // Skin conditions
  'L30.9': 0.7, // Dermatitis
  'B35.9': 0.65, // Dermatophytosis (ringworm)

  // Musculoskeletal
  'M54.5': 0.75, // Low back pain
  'M79.3': 0.6, // Panniculitis (myalgia)

  // Hypertension & metabolic
  I10: 0.9, // Essential hypertension
  'E11.9': 0.85, // Type 2 diabetes
  'E78.5': 0.7, // Hyperlipidemia

  // Fever & malaise
  'R50.9': 0.8, // Fever
  R51: 0.75, // Headache

  // Eye conditions
  'H10.9': 0.65, // Conjunctivitis

  // Dental
  'K02.9': 0.7, // Dental caries
  'K04.7': 0.6, // Periapical abscess

  // Pregnancy-related
  'Z34.0': 0.85, // Normal pregnancy supervision
  O80: 0.8, // Single spontaneous delivery
};

// =============================================================================
// KEYWORD MAPPINGS (INDONESIAN)
// =============================================================================

/**
 * Indonesian symptom keywords mapped to ICD-10 categories
 * Used for keyword-based search enhancement
 */
export const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  // Respiratory
  demam: ['J06', 'J18', 'A09', 'R50'],
  batuk: ['J06', 'J18', 'J02', 'J40'],
  pilek: ['J00', 'J06', 'J30'],
  sesak: ['J45', 'J18', 'J44', 'I50'],
  'sakit tenggorokan': ['J02', 'J03', 'J06'],

  // Gastrointestinal
  mual: ['R11', 'K29', 'K30', 'A09'],
  muntah: ['R11', 'A09', 'K29'],
  diare: ['A09', 'K59'],
  mencret: ['A09'],
  'sakit perut': ['R10', 'K29', 'K30'],
  maag: ['K29', 'K30'],

  // Pain
  'sakit kepala': ['R51', 'G43', 'G44'],
  pusing: ['R42', 'H81', 'R51'],
  nyeri: ['R52', 'M54', 'M79'],
  pegal: ['M79', 'M54'],
  linu: ['M79', 'M54'],

  // Skin
  gatal: ['L29', 'L30', 'B35'],
  ruam: ['L30', 'L50', 'B05'],
  bisul: ['L02', 'L08'],
  bentol: ['L50', 'T78'],

  // Cardiovascular
  'nyeri dada': ['I20', 'I21', 'R07'],
  'jantung berdebar': ['R00', 'I49'],
  'darah tinggi': ['I10', 'I11'],

  // Urinary
  'anyang-anyangan': ['N30', 'N39'],
  'kencing berdarah': ['R31', 'N30'],

  // General
  lemas: ['R53', 'E86'],
  'tidak enak badan': ['R53', 'R50'],
  flu: ['J06', 'J11'],
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for ICD10Entry
 */
export function isICD10Entry(obj: unknown): obj is ICD10Entry {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'name_en' in obj &&
    'name_id' in obj &&
    'is_leaf' in obj
  );
}

/**
 * Type guard for RAGSearchResult
 */
export function isRAGSearchResult(obj: unknown): obj is RAGSearchResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'entry' in obj &&
    'relevance_score' in obj &&
    'match_type' in obj &&
    isICD10Entry((obj as RAGSearchResult).entry)
  );
}

/**
 * Validate ICD-10 code format
 * Valid formats: A00, A00.0, A00.00
 */
export function isValidICD10Code(code: string): boolean {
  return /^[A-Z]\d{2}(\.\d{1,2})?$/.test(code);
}
