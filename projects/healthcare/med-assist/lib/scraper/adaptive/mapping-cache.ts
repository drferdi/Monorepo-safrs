// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * DAS Phase 2: Mapping Cache (Layer 1)
 *
 * Caches successful field mappings for fast retrieval.
 * Reduces API calls and provides offline resilience.
 *
 * @module lib/scraper/adaptive/mapping-cache
 */

import type {
  CacheStats,
  FieldMapping,
  FieldSignature,
  MappingCacheEntry,
  PageType,
} from './types';
import { createLogger } from '@/utils/logger';

const dasLog = createLogger('DAS:Cache', 'content');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_CONFIG = {
  /** Storage key prefix */
  keyPrefix: 'das:cache:',
  /** Cache entry TTL in milliseconds (30 days) */
  ttl: 30 * 24 * 60 * 60 * 1000,
  /** Maximum cache entries */
  maxEntries: 100,
  /** Minimum success rate for cache promotion */
  minSuccessRate: 0.95,
  /** Minimum hits before considering stable */
  minHitsForStable: 5,
};

// ============================================================================
// HASH COMPUTATION
// ============================================================================

/**
 * Compute hash for page + form structure
 *
 * Creates a unique identifier based on:
 * - Page URL (normalized)
 * - Form field structure (names, types)
 */
export function computePageHash(pageUrl: string, fields: FieldSignature[]): string {
  // Normalize URL (remove query params, hash)
  const url = new URL(pageUrl);
  const normalizedPath = url.pathname.toLowerCase();

  // Create field signature string (sorted for consistency)
  const fieldSig = fields
    .map((f) => `${f.attributes.name || f.id}:${f.fieldType}`)
    .sort()
    .join('|');

  // Simple hash function
  const str = `${normalizedPath}::${fieldSig}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `h${Math.abs(hash).toString(36)}`;
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get cached mapping for a page
 *
 * @param pageHash - Hash of page + form structure
 * @returns Cache entry or null if not found/expired
 */
export async function getCachedMapping(pageHash: string): Promise<MappingCacheEntry | null> {
  try {
    const key = `${CACHE_CONFIG.keyPrefix}${pageHash}`;
    const result = await browser.storage.local.get(key);
    const entry = result[key] as MappingCacheEntry | undefined;

    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      // Remove expired entry
      await browser.storage.local.remove(key);
      return null;
    }

    // Increment hit count
    entry.hitCount += 1;
    await browser.storage.local.set({ [key]: entry });

    return entry;
  } catch (error) {
    dasLog.error('[DAS:Cache] Get error:', error);
    return null;
  }
}

/**
 * Store mapping in cache
 *
 * @param pageHash - Hash of page + form structure
 * @param pageType - Type of medical form
 * @param mappings - Field mappings to cache
 */
export async function setCachedMapping(
  pageHash: string,
  pageType: PageType,
  mappings: FieldMapping[]
): Promise<void> {
  try {
    const key = `${CACHE_CONFIG.keyPrefix}${pageHash}`;

    // Convert FieldMapping to cacheable format (don't store full targetField)
    const cacheableMappings = mappings.map((m) => ({
      payloadKey: m.payloadKey,
      fieldSelector: m.targetField.selector,
      confidence: m.confidence,
    }));

    const entry: MappingCacheEntry = {
      pageHash,
      pageType,
      mappings: cacheableMappings,
      timestamp: Date.now(),
      successRate: 1.0, // Start optimistic
      hitCount: 0,
      expiresAt: Date.now() + CACHE_CONFIG.ttl,
    };

    await browser.storage.local.set({ [key]: entry });

    // Cleanup old entries if needed
    await cleanupOldEntries();
  } catch (error) {
    dasLog.error('[DAS:Cache] Set error:', error);
  }
}

/**
 * Update cache entry with fill result (success/failure)
 *
 * @param pageHash - Hash of page
 * @param success - Whether fill was successful
 */
export async function updateCacheResult(pageHash: string, success: boolean): Promise<void> {
  try {
    const key = `${CACHE_CONFIG.keyPrefix}${pageHash}`;
    const result = await browser.storage.local.get(key);
    const entry = result[key] as MappingCacheEntry | undefined;

    if (!entry) return;

    // Update success rate (exponential moving average)
    const alpha = 0.2; // Weight for new result
    entry.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * entry.successRate;

    // Remove if success rate drops too low
    if (
      entry.hitCount >= CACHE_CONFIG.minHitsForStable &&
      entry.successRate < CACHE_CONFIG.minSuccessRate
    ) {
      await browser.storage.local.remove(key);
      dasLog.debug(`[DAS:Cache] Removed low-success entry: ${pageHash}`);
      return;
    }

    await browser.storage.local.set({ [key]: entry });
  } catch (error) {
    dasLog.error('[DAS:Cache] Update error:', error);
  }
}

/**
 * Clear all DAS cache entries
 */
export async function clearCache(): Promise<void> {
  try {
    const all = await browser.storage.local.get(null);
    const keysToRemove = Object.keys(all).filter((k) => k.startsWith(CACHE_CONFIG.keyPrefix));

    if (keysToRemove.length > 0) {
      await browser.storage.local.remove(keysToRemove);
    }

    dasLog.debug(`[DAS:Cache] Cleared ${keysToRemove.length} entries`);
  } catch (error) {
    dasLog.error('[DAS:Cache] Clear error:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const all = await browser.storage.local.get(null);
    const entries = Object.entries(all).filter(([k]) => k.startsWith(CACHE_CONFIG.keyPrefix));

    let totalHits = 0;
    let oldestEntry = Date.now();

    for (const [, value] of entries) {
      const entry = value as MappingCacheEntry;
      totalHits += entry.hitCount;
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
    }

    // Estimate storage used
    const storageUsed = JSON.stringify(Object.fromEntries(entries)).length;

    return {
      totalEntries: entries.length,
      hits: totalHits,
      misses: 0, // Can't track misses without counter
      hitRate: entries.length > 0 ? (totalHits / (totalHits + entries.length)) * 100 : 0,
      oldestEntry: entries.length > 0 ? oldestEntry : 0,
      storageUsed,
    };
  } catch (error) {
    dasLog.error('[DAS:Cache] Stats error:', error);
    return {
      totalEntries: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      oldestEntry: 0,
      storageUsed: 0,
    };
  }
}

// ============================================================================
// INTERNAL UTILITIES
// ============================================================================

/**
 * Remove old entries if cache exceeds max size
 */
async function cleanupOldEntries(): Promise<void> {
  try {
    const all = await browser.storage.local.get(null);
    const entries = Object.entries(all)
      .filter(([k]) => k.startsWith(CACHE_CONFIG.keyPrefix))
      .map(([key, value]) => ({
        key,
        entry: value as MappingCacheEntry,
      }))
      .sort((a, b) => a.entry.timestamp - b.entry.timestamp);

    // Remove oldest entries if over limit
    const toRemove = entries.length - CACHE_CONFIG.maxEntries;
    if (toRemove > 0) {
      const keysToRemove = entries.slice(0, toRemove).map((e) => e.key);
      await browser.storage.local.remove(keysToRemove);
      dasLog.debug(`[DAS:Cache] Cleaned up ${toRemove} old entries`);
    }
  } catch (error) {
    dasLog.error('[DAS:Cache] Cleanup error:', error);
  }
}

/**
 * Restore mappings from cache entry to full FieldMapping format
 *
 * @param cacheEntry - Cached mapping entry
 * @param fields - Current page fields (for restoration)
 * @returns Restored FieldMapping array
 */
export function restoreMappingsFromCache(
  cacheEntry: MappingCacheEntry,
  fields: FieldSignature[]
): FieldMapping[] {
  const fieldBySelector = new Map(fields.map((f) => [f.selector, f]));
  const mappings: FieldMapping[] = [];

  for (const cached of cacheEntry.mappings) {
    const targetField = fieldBySelector.get(cached.fieldSelector);
    if (targetField) {
      mappings.push({
        payloadKey: cached.payloadKey,
        targetField,
        confidence: cached.confidence,
        reasoning: 'Restored from cache',
        action:
          cached.confidence >= 0.95
            ? 'AUTO_FILL'
            : cached.confidence >= 0.8
              ? 'CAUTIOUS_FILL'
              : 'HUMAN_REQUIRED',
      });
    }
  }

  return mappings;
}
