// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * ICD-10 Data Loader
 * Seeds IndexedDB from 144 Penyakit Puskesmas (penyakit.json)
 *
 * @module lib/rag/icd10-loader
 * @version 2.0.0
 *
 * Data Source: PPK IDI 2013 + 144 Diagnosis KKI
 */

import { icd10DB } from './icd10-db';
import type {
  ICD10Entry,
  LoaderProgress,
  LoaderProgressCallback,
  PenyakitDatabase,
  PenyakitRawData,
} from './types';
import { SYMPTOM_KEYWORDS } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Path to 144 Penyakit Puskesmas dataset
 * Source: PPK IDI 2013 + 144 Diagnosis KKI
 */
const PENYAKIT_DATA_PATH = '/data/penyakit.json';

/**
 * Minimum expected entries for validation
 * Puskesmas handles 144 common diseases (Permenkes standard)
 */
const MIN_EXPECTED_ENTRIES = 100;

// =============================================================================
// CHAPTER MAPPINGS
// =============================================================================

/**
 * ICD-10 chapter definitions
 */
const ICD10_CHAPTERS: Record<string, { range: string; title_id: string }> = {
  A: { range: 'A00-B99', title_id: 'Penyakit infeksi dan parasit tertentu' },
  B: { range: 'A00-B99', title_id: 'Penyakit infeksi dan parasit tertentu' },
  C: { range: 'C00-D48', title_id: 'Neoplasma' },
  D: { range: 'C00-D48', title_id: 'Neoplasma / Darah' },
  E: { range: 'E00-E90', title_id: 'Penyakit endokrin, nutrisi, metabolik' },
  F: { range: 'F00-F99', title_id: 'Gangguan mental dan perilaku' },
  G: { range: 'G00-G99', title_id: 'Penyakit sistem saraf' },
  H: { range: 'H00-H59', title_id: 'Penyakit mata / telinga' },
  I: { range: 'I00-I99', title_id: 'Penyakit sistem sirkulasi' },
  J: { range: 'J00-J99', title_id: 'Penyakit sistem pernapasan' },
  K: { range: 'K00-K93', title_id: 'Penyakit sistem pencernaan' },
  L: { range: 'L00-L99', title_id: 'Penyakit kulit dan jaringan subkutan' },
  M: { range: 'M00-M99', title_id: 'Penyakit sistem muskuloskeletal' },
  N: { range: 'N00-N99', title_id: 'Penyakit sistem genitourinaria' },
  O: { range: 'O00-O99', title_id: 'Kehamilan, persalinan, nifas' },
  P: { range: 'P00-P96', title_id: 'Kondisi perinatal' },
  Q: { range: 'Q00-Q99', title_id: 'Malformasi kongenital' },
  R: { range: 'R00-R99', title_id: 'Gejala dan tanda abnormal' },
  S: { range: 'S00-T98', title_id: 'Cedera dan keracunan' },
  T: { range: 'S00-T98', title_id: 'Cedera dan keracunan' },
  V: { range: 'V01-Y98', title_id: 'Penyebab eksternal morbiditas' },
  W: { range: 'V01-Y98', title_id: 'Penyebab eksternal morbiditas' },
  X: { range: 'V01-Y98', title_id: 'Penyebab eksternal morbiditas' },
  Y: { range: 'V01-Y98', title_id: 'Penyebab eksternal morbiditas' },
  Z: { range: 'Z00-Z99', title_id: 'Faktor yang mempengaruhi status kesehatan' },
};

// =============================================================================
// LOADER CLASS
// =============================================================================

/**
 * ICD-10 Data Loader
 * Loads 144 Penyakit Puskesmas from penyakit.json
 */
export class ICD10Loader {
  private progressCallback?: LoaderProgressCallback;

  constructor(onProgress?: LoaderProgressCallback) {
    this.progressCallback = onProgress;
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: LoaderProgress): void {
    this.progressCallback?.(progress);
  }

  /**
   * Load data from bundled penyakit.json file
   */
  async loadFromBundle(): Promise<number> {
    this.reportProgress({
      phase: 'fetching',
      progress: 0,
    });

    try {
      // Fetch bundled JSON
      const response = await fetch(PENYAKIT_DATA_PATH);

      if (!response.ok) {
        throw new Error(`Failed to fetch penyakit data: ${response.status}`);
      }

      this.reportProgress({
        phase: 'parsing',
        progress: 20,
      });

      const database: PenyakitDatabase = await response.json();

      // Validate structure
      if (!database.penyakit || !Array.isArray(database.penyakit)) {
        throw new Error('Invalid penyakit.json: missing penyakit array');
      }

      if (database.penyakit.length < MIN_EXPECTED_ENTRIES) {
        throw new Error(
          `Invalid data: expected ${MIN_EXPECTED_ENTRIES}+ entries, got ${database.penyakit.length}`
        );
      }

      this.reportProgress({
        phase: 'indexing',
        progress: 40,
        total_items: database.penyakit.length,
      });

      // Transform and index
      const entries = this.transformPenyakitData(database.penyakit);

      this.reportProgress({
        phase: 'indexing',
        progress: 60,
        total_items: entries.length,
      });

      // Bulk insert
      const inserted = await icd10DB.bulkPut(entries);

      // Update metadata
      await icd10DB.setMetadata('last_updated', new Date().toISOString());
      await icd10DB.setMetadata('source', 'penyakit-144');
      await icd10DB.setMetadata('entry_count', String(inserted));
      await icd10DB.setMetadata('version', database._metadata?.version || '1.0.0');

      this.reportProgress({
        phase: 'complete',
        progress: 100,
        total_items: inserted,
      });

      console.warn(`[ICD10-Loader] Loaded ${inserted} entries from 144 Penyakit Puskesmas`);

      return inserted;
    } catch (error) {
      this.reportProgress({
        phase: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Load data from raw penyakit array (for testing)
   */
  async loadFromArray(rawData: PenyakitRawData[]): Promise<number> {
    this.reportProgress({
      phase: 'parsing',
      progress: 10,
      total_items: rawData.length,
    });

    const entries = this.transformPenyakitData(rawData);

    this.reportProgress({
      phase: 'indexing',
      progress: 50,
      total_items: entries.length,
    });

    const inserted = await icd10DB.bulkPut(entries);

    await icd10DB.setMetadata('last_updated', new Date().toISOString());
    await icd10DB.setMetadata('source', 'array');
    await icd10DB.setMetadata('entry_count', String(inserted));

    this.reportProgress({
      phase: 'complete',
      progress: 100,
      total_items: inserted,
    });

    return inserted;
  }

  /**
   * Transform penyakit array to ICD10Entry array
   */
  private transformPenyakitData(penyakitList: PenyakitRawData[]): ICD10Entry[] {
    return penyakitList.map((penyakit, index) => {
      if (index % 50 === 0) {
        this.reportProgress({
          phase: 'indexing',
          progress: 40 + Math.floor((index / penyakitList.length) * 20),
          current_item: penyakit.icd10,
          total_items: penyakitList.length,
        });
      }

      return this.transformPenyakitEntry(penyakit);
    });
  }

  /**
   * Transform single penyakit entry to ICD10Entry
   */
  private transformPenyakitEntry(penyakit: PenyakitRawData): ICD10Entry {
    const code = penyakit.icd10.toUpperCase().trim();
    const category = code.substring(0, 3);
    const firstChar = code.charAt(0);
    const chapterInfo = ICD10_CHAPTERS[firstChar] || { range: 'Unknown', title_id: 'Unknown' };

    // Extract keywords from multiple sources
    const keywords = this.extractKeywordsFromPenyakit(penyakit);

    return {
      // Core ICD-10 fields
      code,
      name_en: penyakit.nama_en || '',
      name_id: penyakit.nama || '',
      chapter: chapterInfo.range,
      category,
      block: this.getBlock(category),
      keywords,
      commonality: 0.8, // All 144 are common at Puskesmas
      is_leaf: true, // All 144 are billable codes

      // Extended fields from penyakit.json
      kki_no: penyakit.kki_no,
      body_system: penyakit.body_system,
      definisi: penyakit.definisi,
      gejala_klinis: penyakit.gejala_klinis,
      red_flags: penyakit.red_flags,
      terapi: penyakit.terapi,
      kriteria_rujukan: penyakit.kriteria_rujukan,
      diagnosis_banding: penyakit.diagnosis_banding,
      kompetensi: penyakit.kompetensi,
    };
  }

  /**
   * Extract keywords from penyakit entry
   * Sources: nama, gejala_klinis, definisi, body_system
   */
  private extractKeywordsFromPenyakit(penyakit: PenyakitRawData): string[] {
    const keywords: Set<string> = new Set();

    // 1. Keywords from Indonesian name
    this.extractWordsFromText(penyakit.nama).forEach((w) => keywords.add(w));

    // 2. Keywords from gejala_klinis (symptoms) — IMPORTANT!
    if (penyakit.gejala_klinis && Array.isArray(penyakit.gejala_klinis)) {
      for (const gejala of penyakit.gejala_klinis) {
        this.extractWordsFromText(gejala).forEach((w) => keywords.add(w));
      }
    }

    // 3. Keywords from definisi (definition)
    if (penyakit.definisi) {
      this.extractWordsFromText(penyakit.definisi).forEach((w) => keywords.add(w));
    }

    // 4. Body system as keyword
    if (penyakit.body_system) {
      keywords.add(penyakit.body_system.toLowerCase());
    }

    // 5. Add symptom keywords based on code mapping
    const code = penyakit.icd10.toUpperCase();
    const category = code.substring(0, 3);

    for (const [symptom, categories] of Object.entries(SYMPTOM_KEYWORDS)) {
      if (categories.includes(category) || categories.includes(code)) {
        keywords.add(symptom.toLowerCase());
      }
    }

    // 6. Add diagnosis_banding keywords
    if (penyakit.diagnosis_banding && Array.isArray(penyakit.diagnosis_banding)) {
      for (const diag of penyakit.diagnosis_banding) {
        this.extractWordsFromText(diag).forEach((w) => keywords.add(w));
      }
    }

    return Array.from(keywords);
  }

  /**
   * Extract meaningful words from text
   */
  private extractWordsFromText(text: string): string[] {
    if (!text) return [];

    // Normalize and split
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    // Remove common stop words
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'with',
      'not',
      'nos',
      'other',
      'unspecified',
      'yang',
      'dan',
      'atau',
      'tidak',
      'lainnya',
      'pada',
      'untuk',
      'dari',
      'adalah',
      'ini',
      'itu',
      'dapat',
      'akan',
      'oleh',
      'karena',
      'dengan',
      'seperti',
      'jika',
      'bila',
      'maka',
      'serta',
      'juga',
      'harus',
      'bisa',
    ]);

    return words.filter((w) => !stopWords.has(w));
  }

  /**
   * Get block range for a category
   */
  private getBlock(category: string): string {
    const firstChar = category.charAt(0);
    const num = Number.parseInt(category.substring(1), 10);

    if (isNaN(num)) return `${firstChar}00-${firstChar}99`;

    const blockStart = Math.floor(num / 10) * 10;
    const blockEnd = blockStart + 9;

    return `${firstChar}${String(blockStart).padStart(2, '0')}-${firstChar}${String(blockEnd).padStart(2, '0')}`;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Load ICD-10 data from bundle with progress callback
 */
export async function loadICD10Data(onProgress?: LoaderProgressCallback): Promise<number> {
  const loader = new ICD10Loader(onProgress);
  return loader.loadFromBundle();
}

/**
 * Check if database needs loading
 */
export async function needsDataLoad(): Promise<boolean> {
  const status = await icd10DB.getStatus();
  return !status.ready || status.entry_count < MIN_EXPECTED_ENTRIES;
}

/**
 * Initialize database with data if needed
 */
export async function ensureICD10DataLoaded(onProgress?: LoaderProgressCallback): Promise<void> {
  const needs = await needsDataLoad();

  if (needs) {
    console.warn('[ICD10-Loader] Database needs loading, starting...');
    await loadICD10Data(onProgress);
  } else {
    console.warn('[ICD10-Loader] Database already loaded (144 Penyakit Puskesmas)');
  }
}
