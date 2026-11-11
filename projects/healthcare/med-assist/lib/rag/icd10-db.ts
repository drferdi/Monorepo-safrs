// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * IndexedDB Wrapper for ICD-10 RAG Database
 * Local storage for offline-capable clinical code lookup
 *
 * @module lib/rag/icd10-db
 * @version 1.0.0
 */

import type { ICD10Entry, RAGDatabaseStats, RAGDatabaseStatus } from './types';

import { createLogger } from '~/utils/logger';

const log = createLogger('ICD10-DB', 'background');

// =============================================================================
// CONSTANTS
// =============================================================================

const DB_NAME = 'sentra-icd10-rag';
const DB_VERSION = 1;
const STORE_NAME = 'icd10_entries';
const META_STORE = 'metadata';

// =============================================================================
// DATABASE CLASS
// =============================================================================

/**
 * ICD-10 IndexedDB wrapper
 * Singleton pattern for consistent database access
 */
class ICD10Database {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  /**
   * Initialize the database
   * Creates object stores and indices if not exists
   */
  async init(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[ICD10-DB] Failed to open database:', request.error);
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        log.debug('Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        log.debug('Upgrading database schema...');

        // Create main ICD-10 entries store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'code' });

          // Create indices for fast lookup
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('chapter', 'chapter', { unique: false });
          store.createIndex('is_leaf', 'is_leaf', { unique: false });
          store.createIndex('keywords', 'keywords', { unique: false, multiEntry: true });

          log.debug('Created icd10_entries store with indices');
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
          log.debug('Created metadata store');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInit(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Get a single ICD-10 entry by code
   */
  async getByCode(code: string): Promise<ICD10Entry | null> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(code.toUpperCase());

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get multiple ICD-10 entries by codes
   */
  async getByCodes(codes: string[]): Promise<ICD10Entry[]> {
    const db = await this.ensureInit();
    const results: ICD10Entry[] = [];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      let completed = 0;
      const total = codes.length;

      if (total === 0) {
        resolve([]);
        return;
      }

      codes.forEach((code) => {
        const request = store.get(code.toUpperCase());

        request.onsuccess = () => {
          if (request.result) {
            results.push(request.result);
          }
          completed++;
          if (completed === total) {
            resolve(results);
          }
        };

        request.onerror = () => {
          completed++;
          if (completed === total) {
            resolve(results);
          }
        };
      });

      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get entries by category (3-character code)
   */
  async getByCategory(category: string): Promise<ICD10Entry[]> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('category');
      const request = index.getAll(category.toUpperCase());

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get entries by chapter range
   */
  async getByChapter(chapter: string): Promise<ICD10Entry[]> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('chapter');
      const request = index.getAll(chapter);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get entries by keyword
   */
  async getByKeyword(keyword: string): Promise<ICD10Entry[]> {
    const db = await this.ensureInit();
    const normalizedKeyword = keyword.toLowerCase().trim();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('keywords');
      const request = index.getAll(normalizedKeyword);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all leaf (billable) codes
   */
  async getAllLeafCodes(): Promise<ICD10Entry[]> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('is_leaf');
      // IndexedDB stores booleans as 0/1, use IDBKeyRange.only(1) for true
      const request = index.getAll(IDBKeyRange.only(1));

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Search entries by code prefix
   */
  async searchByCodePrefix(prefix: string, limit = 20): Promise<ICD10Entry[]> {
    const db = await this.ensureInit();
    const upperPrefix = prefix.toUpperCase();
    const results: ICD10Entry[] = [];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      // Use IDBKeyRange for prefix search
      const range = IDBKeyRange.bound(upperPrefix, upperPrefix + '\uffff', false, false);

      const request = store.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add or update a single entry
   */
  async put(entry: ICD10Entry): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Bulk add entries (for initial data load)
   */
  async bulkPut(entries: ICD10Entry[]): Promise<number> {
    const db = await this.ensureInit();
    let successCount = 0;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      entries.forEach((entry) => {
        const request = store.put(entry);
        request.onsuccess = () => {
          successCount++;
        };
      });

      tx.oncomplete = () => {
        log.debug(`Bulk put completed: ${successCount} entries`);
        resolve(successCount);
      };

      tx.onerror = () => {
        console.error('[ICD10-DB] Bulk put failed:', tx.error);
        reject(tx.error);
      };
    });
  }

  /**
   * Clear all entries (for data refresh)
   */
  async clear(): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        log.debug('Store cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get entry count
   */
  async count(): Promise<number> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if code exists
   */
  async exists(code: string): Promise<boolean> {
    const entry = await this.getByCode(code);
    return entry !== null;
  }

  /**
   * Get database status
   */
  async getStatus(): Promise<RAGDatabaseStatus> {
    try {
      await this.ensureInit();
      const count = await this.count();
      const meta = await this.getMetadata('last_updated');

      return {
        ready: true,
        entry_count: count,
        version: DB_VERSION,
        last_updated: meta || new Date().toISOString(),
      };
    } catch (error) {
      return {
        ready: false,
        entry_count: 0,
        version: DB_VERSION,
        last_updated: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<RAGDatabaseStats> {
    const db = await this.ensureInit();

    const [total, leafCodes] = await Promise.all([
      this.count(),
      new Promise<number>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('is_leaf');
        // IndexedDB stores booleans as 0/1, use IDBKeyRange.only(1) for true
        const request = index.count(IDBKeyRange.only(1));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
    ]);

    // Estimate chapters (A-Z unique first characters)
    const chapters = await this.countChapters();

    return {
      total_entries: total,
      leaf_codes: leafCodes,
      header_codes: total - leafCodes,
      chapters,
      keywords_indexed: 0, // Would need separate count
      size_bytes: 0, // Would need storage API
    };
  }

  /**
   * Count unique chapters
   */
  private async countChapters(): Promise<number> {
    const db = await this.ensureInit();
    const chapters = new Set<string>();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('chapter');
      const request = index.openKeyCursor(null, 'nextunique');

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          chapters.add(cursor.key as string);
          cursor.continue();
        } else {
          resolve(chapters.size);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Set metadata value
   */
  async setMetadata(key: string, value: string): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      const store = tx.objectStore(META_STORE);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get metadata value
   */
  async getMetadata(key: string): Promise<string | null> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      this.initPromise = null;
      log.debug('Database closed');
    }
  }

  /**
   * Delete database entirely
   */
  async deleteDatabase(): Promise<void> {
    this.close();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onsuccess = () => {
        log.debug('Database deleted');
        resolve();
      };

      request.onerror = () => {
        console.error('[ICD10-DB] Failed to delete database:', request.error);
        reject(request.error);
      };
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton instance of ICD-10 database
 */
export const icd10DB = new ICD10Database();

/**
 * Initialize database (call once on extension startup)
 */
export async function initICD10Database(): Promise<RAGDatabaseStatus> {
  await icd10DB.init();
  return icd10DB.getStatus();
}

/**
 * Check if database is ready with sufficient data
 * 144 Penyakit Puskesmas is the target dataset
 */
export async function isICD10DatabaseReady(): Promise<boolean> {
  const status = await icd10DB.getStatus();
  // Consider ready if we have at least 100 entries (144 Penyakit Puskesmas)
  return status.ready && status.entry_count >= 100;
}
