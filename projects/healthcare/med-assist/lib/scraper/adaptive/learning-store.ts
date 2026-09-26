// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * DAS Phase 3: Learning Store (Layer 4)
 *
 * IndexedDB-based learning feedback loop for improving mapping accuracy.
 * Tracks fill outcomes and promotes successful mappings to cache.
 *
 * @module lib/scraper/adaptive/learning-store
 */

import type {
  FillOutcome,
  LearningAnalytics,
  LearningEntry,
  LearningStoreConfig,
  MappingStats,
  PageType,
  PromotionCriteria,
} from './types';
import { DEFAULT_LEARNING_CONFIG, DEFAULT_PROMOTION_CRITERIA } from './types';

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let db: IDBDatabase | null = null;
let config: LearningStoreConfig = DEFAULT_LEARNING_CONFIG;

const STORE_NAME = 'learningEntries';
const STATS_STORE = 'mappingStats';

/**
 * Initialize the IndexedDB database
 */
export async function initLearningStore(
  customConfig?: Partial<LearningStoreConfig>
): Promise<void> {
  if (customConfig) {
    config = { ...DEFAULT_LEARNING_CONFIG, ...customConfig };
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(config.dbName, config.dbVersion);

    request.onerror = () => {
      console.error('[DAS:Learning] DB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.warn('[DAS:Learning] Database initialized');
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Learning entries store
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('pageHash', 'pageHash', { unique: false });
        store.createIndex('payloadKey', 'payloadKey', { unique: false });
        store.createIndex('outcome', 'outcome', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('mapping', ['payloadKey', 'fieldSelector'], { unique: false });
      }

      // Aggregated stats store
      if (!database.objectStoreNames.contains(STATS_STORE)) {
        const statsStore = database.createObjectStore(STATS_STORE, {
          keyPath: ['payloadKey', 'fieldSelector'],
        });
        statsStore.createIndex('successRate', 'successRate', { unique: false });
      }

      console.warn('[DAS:Learning] Database schema created');
    };
  });
}

/**
 * Ensure database is initialized
 */
async function ensureDb(): Promise<IDBDatabase> {
  if (!db) {
    await initLearningStore();
  }
  if (!db) {
    throw new Error('Failed to initialize learning database');
  }
  return db;
}

// ============================================================================
// LEARNING ENTRY OPERATIONS
// ============================================================================

/**
 * Generate unique ID for learning entry
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current session ID (persists for browser session)
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('das:sessionId');
  if (!sessionId) {
    sessionId = `s-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    sessionStorage.setItem('das:sessionId', sessionId);
  }
  return sessionId;
}

/**
 * Record a learning entry
 *
 * @param entry - Partial entry (id and timestamp auto-generated)
 */
export async function recordLearning(
  entry: Omit<LearningEntry, 'id' | 'timestamp' | 'sessionId'>
): Promise<string> {
  const database = await ensureDb();

  const fullEntry: LearningEntry = {
    ...entry,
    id: generateId(),
    timestamp: Date.now(),
    sessionId: getSessionId(),
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAME, STATS_STORE], 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const request = store.add(fullEntry);

    request.onsuccess = () => {
      // Update aggregated stats
      updateMappingStats(tx, fullEntry);
      resolve(fullEntry.id);
    };

    request.onerror = () => {
      console.error('[DAS:Learning] Record error:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Update aggregated mapping statistics
 */
function updateMappingStats(tx: IDBTransaction, entry: LearningEntry): void {
  const statsStore = tx.objectStore(STATS_STORE);
  const key = [entry.payloadKey, entry.fieldSelector];

  const getRequest = statsStore.get(key);

  getRequest.onsuccess = () => {
    const existing = getRequest.result as MappingStats | undefined;

    const stats: MappingStats = existing || {
      payloadKey: entry.payloadKey,
      fieldSelector: entry.fieldSelector,
      totalAttempts: 0,
      successCount: 0,
      correctedCount: 0,
      failedCount: 0,
      successRate: 0,
      avgConfidence: 0,
      firstSeen: entry.timestamp,
      lastSeen: entry.timestamp,
    };

    // Update counts
    stats.totalAttempts += 1;
    stats.lastSeen = entry.timestamp;

    if (entry.outcome === 'success') {
      stats.successCount += 1;
    } else if (entry.outcome === 'auto_corrected') {
      stats.correctedCount += 1;
    } else if (entry.outcome === 'failed' || entry.outcome === 'rejected') {
      stats.failedCount += 1;
    }

    // Recalculate success rate
    stats.successRate = stats.successCount / stats.totalAttempts;

    // Update average confidence (running average)
    stats.avgConfidence =
      (stats.avgConfidence * (stats.totalAttempts - 1) + entry.confidence) / stats.totalAttempts;

    statsStore.put(stats);
  };
}

/**
 * Get learning entries by criteria
 */
export async function getLearningEntries(options: {
  pageHash?: string;
  payloadKey?: string;
  outcome?: FillOutcome;
  limit?: number;
  offset?: number;
}): Promise<LearningEntry[]> {
  const database = await ensureDb();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    let request: IDBRequest;

    if (options.pageHash) {
      request = store.index('pageHash').getAll(options.pageHash);
    } else if (options.payloadKey) {
      request = store.index('payloadKey').getAll(options.payloadKey);
    } else if (options.outcome) {
      request = store.index('outcome').getAll(options.outcome);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      let results = request.result as LearningEntry[];

      // Apply offset and limit
      if (options.offset) {
        results = results.slice(options.offset);
      }
      if (options.limit) {
        results = results.slice(0, options.limit);
      }

      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// MAPPING STATISTICS
// ============================================================================

/**
 * Get statistics for a specific mapping
 */
export async function getMappingStats(
  payloadKey: string,
  fieldSelector: string
): Promise<MappingStats | null> {
  const database = await ensureDb();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STATS_STORE, 'readonly');
    const store = tx.objectStore(STATS_STORE);

    const request = store.get([payloadKey, fieldSelector]);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all mapping statistics
 */
export async function getAllMappingStats(): Promise<MappingStats[]> {
  const database = await ensureDb();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STATS_STORE, 'readonly');
    const store = tx.objectStore(STATS_STORE);

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// CACHE PROMOTION
// ============================================================================

/**
 * Check if a mapping is eligible for cache promotion
 */
export async function checkPromotionEligibility(
  payloadKey: string,
  fieldSelector: string,
  criteria?: Partial<PromotionCriteria>
): Promise<{ eligible: boolean; reason: string }> {
  const stats = await getMappingStats(payloadKey, fieldSelector);

  if (!stats) {
    return { eligible: false, reason: 'No learning data found' };
  }

  const c = { ...DEFAULT_PROMOTION_CRITERIA, ...criteria };

  // Check minimum attempts
  if (stats.totalAttempts < c.minAttempts) {
    return {
      eligible: false,
      reason: `Insufficient attempts: ${stats.totalAttempts}/${c.minAttempts}`,
    };
  }

  // Check success rate
  if (stats.successRate < c.minSuccessRate) {
    return {
      eligible: false,
      reason: `Low success rate: ${(stats.successRate * 100).toFixed(1)}%`,
    };
  }

  // Check confidence
  if (stats.avgConfidence < c.minConfidence) {
    return {
      eligible: false,
      reason: `Low confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`,
    };
  }

  // Check stability period
  const stabilityPeriod = Date.now() - stats.firstSeen;
  if (stabilityPeriod < c.minStabilityPeriod) {
    const hoursRemaining = Math.ceil((c.minStabilityPeriod - stabilityPeriod) / (60 * 60 * 1000));
    return {
      eligible: false,
      reason: `Stability period not met: ${hoursRemaining}h remaining`,
    };
  }

  return { eligible: true, reason: 'All criteria met' };
}

/**
 * Get all mappings eligible for cache promotion
 */
export async function getPromotionCandidates(
  criteria?: Partial<PromotionCriteria>
): Promise<MappingStats[]> {
  const allStats = await getAllMappingStats();
  const candidates: MappingStats[] = [];

  for (const stats of allStats) {
    const { eligible } = await checkPromotionEligibility(
      stats.payloadKey,
      stats.fieldSelector,
      criteria
    );
    if (eligible) {
      candidates.push(stats);
    }
  }

  return candidates;
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get learning analytics summary
 */
export async function getLearningAnalytics(): Promise<LearningAnalytics> {
  const database = await ensureDb();

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAME, STATS_STORE], 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = async () => {
      const entries = request.result as LearningEntry[];

      // Initialize counters
      const byOutcome: Record<FillOutcome, number> = {
        success: 0,
        auto_corrected: 0,
        failed: 0,
        rejected: 0,
        timeout: 0,
      };

      const byPageType: Record<PageType, number> = {
        anamnesa: 0,
        resep: 0,
        soap: 0,
        diagnosa: 0,
        unknown: 0,
      };

      let oldestEntry = Date.now();
      let newestEntry = 0;

      // Count entries
      for (const entry of entries) {
        byOutcome[entry.outcome] = (byOutcome[entry.outcome] || 0) + 1;
        byPageType[entry.pageType] = (byPageType[entry.pageType] || 0) + 1;

        if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
        if (entry.timestamp > newestEntry) newestEntry = entry.timestamp;
      }

      // Get promotion candidates count
      const candidates = await getPromotionCandidates();

      // Estimate storage size
      const estimatedSize = JSON.stringify(entries).length;

      // Calculate overall success rate
      const totalAttempts = entries.length;
      const successCount = byOutcome.success;
      const overallSuccessRate = totalAttempts > 0 ? successCount / totalAttempts : 0;

      resolve({
        totalEntries: entries.length,
        byOutcome,
        byPageType,
        overallSuccessRate,
        promotionCandidates: candidates.length,
        estimatedSize,
        oldestEntry: entries.length > 0 ? oldestEntry : 0,
        newestEntry: entries.length > 0 ? newestEntry : 0,
      });
    };

    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// MAINTENANCE
// ============================================================================

/**
 * Clean up old entries beyond retention period
 */
export async function cleanupOldEntries(): Promise<number> {
  const database = await ensureDb();
  const cutoff = Date.now() - config.retentionPeriod;

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    const range = IDBKeyRange.upperBound(cutoff);
    const request = index.openCursor(range);

    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        console.warn(`[DAS:Learning] Cleaned up ${deletedCount} old entries`);
        resolve(deletedCount);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all learning data
 */
export async function clearLearningStore(): Promise<void> {
  const database = await ensureDb();

  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAME, STATS_STORE], 'readwrite');

    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(STATS_STORE).clear();

    tx.oncomplete = () => {
      console.warn('[DAS:Learning] All learning data cleared');
      resolve();
    };

    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Close database connection
 */
export function closeLearningStore(): void {
  if (db) {
    db.close();
    db = null;
  }
}
