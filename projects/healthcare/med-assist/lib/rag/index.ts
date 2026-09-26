// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * RAG Module Public API
 * ICD-10 Database and Search for CDSS
 *
 * @module lib/rag
 * @version 1.0.0
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  ICD10Chapter,
  ICD10Entry,
  ICD10RawData,
  LoaderProgress,
  LoaderProgressCallback,
  PenyakitDatabase,
  // Penyakit.json types (144 Penyakit Puskesmas)
  PenyakitRawData,
  RAGDatabaseStats,
  RAGDatabaseStatus,
  RAGMatchType,
  RAGSearchOptions,
  RAGSearchResult,
  TerapiEntry,
} from './types';

export {
  DEFAULT_SEARCH_OPTIONS,
  isICD10Entry,
  isRAGSearchResult,
  isValidICD10Code,
  PUSKESMAS_COMMON_CODES,
  SYMPTOM_KEYWORDS,
} from './types';

// =============================================================================
// DATABASE EXPORTS
// =============================================================================

export { icd10DB, initICD10Database, isICD10DatabaseReady } from './icd10-db';

// =============================================================================
// LOADER EXPORTS
// =============================================================================

export { ensureICD10DataLoaded, ICD10Loader, loadICD10Data, needsDataLoad } from './icd10-loader';

// =============================================================================
// SEARCH EXPORTS
// =============================================================================

export {
  buildDetailedRAGContext,
  buildRAGContext,
  getICD10Details,
  searchForDiagnosisSuggestions,
  searchICD10,
  verifyICD10Codes,
} from './icd10-search';
