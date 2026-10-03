// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * DAS Phase 3: Cache Promoter
 *
 * Promotes successful mappings from learning store to Layer 1 cache.
 * Bridges learning feedback loop with fast cache lookup.
 *
 * @module lib/scraper/adaptive/cache-promoter
 */

import { scanPageFields } from './dom-scanner';
import { cleanupOldEntries, getLearningAnalytics, getPromotionCandidates } from './learning-store';
import { clearCache, computePageHash, getCacheStats, setCachedMapping } from './mapping-cache';
import type { FieldMapping, PageType, PromotionCriteria } from './types';
import { createLogger } from '@/utils/logger';

const dasLog = createLogger('DAS:Promoter', 'content');

// ============================================================================
// PROMOTION EXECUTION
// ============================================================================

/**
 * Result of a promotion operation
 */
export interface PromotionResult {
  /** Number of mappings promoted */
  promoted: number;
  /** Number of mappings skipped (already cached) */
  skipped: number;
  /** Number of mappings failed */
  failed: number;
  /** Details of promoted mappings */
  details: Array<{
    payloadKey: string;
    fieldSelector: string;
    successRate: number;
  }>;
}

/**
 * Execute cache promotion for eligible mappings
 *
 * Scans learning store for mappings that meet promotion criteria
 * and adds them to Layer 1 cache.
 *
 * @param pageType - Page type to promote for
 * @param criteria - Custom promotion criteria
 * @returns Promotion result
 */
export async function executePromotion(
  pageType?: PageType,
  criteria?: Partial<PromotionCriteria>
): Promise<PromotionResult> {
  const result: PromotionResult = {
    promoted: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  try {
    // Get candidates meeting criteria
    const candidates = await getPromotionCandidates(criteria);

    if (candidates.length === 0) {
      dasLog.debug('[DAS:Promoter] No candidates for promotion');
      return result;
    }

    dasLog.debug(`[DAS:Promoter] Found ${candidates.length} promotion candidates`);

    // Get current page fields for context
    const scanResult = scanPageFields();
    // Use deterministic page hash based on URL and field structure
    const pageHash = computePageHash(window.location.href, scanResult.fields);

    // Group by payload key for batch caching
    const mappingsToCache: FieldMapping[] = [];

    for (const stats of candidates) {
      // Find matching field from current scan
      const matchingField = scanResult.fields.find((f) => f.selector === stats.fieldSelector);

      if (!matchingField) {
        dasLog.debug(`[DAS:Promoter] Field not found: ${stats.fieldSelector}`);
        result.skipped++;
        continue;
      }

      mappingsToCache.push({
        payloadKey: stats.payloadKey,
        targetField: matchingField,
        confidence: stats.avgConfidence,
        reasoning: `Promoted from learning (${Math.round(stats.successRate * 100)}% success rate)`,
        action: stats.avgConfidence >= 0.95 ? 'AUTO_FILL' : 'CAUTIOUS_FILL',
      });

      result.details.push({
        payloadKey: stats.payloadKey,
        fieldSelector: stats.fieldSelector,
        successRate: stats.successRate,
      });

      result.promoted++;
    }

    // Cache the promoted mappings
    if (mappingsToCache.length > 0) {
      await setCachedMapping(pageHash, pageType || 'unknown', mappingsToCache);
    }

    dasLog.debug(`[DAS:Promoter] Promoted ${result.promoted} mappings to cache`);

    return result;
  } catch (error) {
    dasLog.error('[DAS:Promoter] Promotion error:', error);
    result.failed++;
    return result;
  }
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * Get comprehensive DAS system health report
 */
export interface SystemHealthReport {
  /** Cache statistics */
  cache: {
    totalEntries: number;
    hitRate: number;
    storageUsed: number;
  };
  /** Learning statistics */
  learning: {
    totalEntries: number;
    overallSuccessRate: number;
    promotionCandidates: number;
  };
  /** System status */
  status: 'healthy' | 'degraded' | 'critical';
  /** Recommendations */
  recommendations: string[];
}

/**
 * Generate system health report
 */
export async function getSystemHealth(): Promise<SystemHealthReport> {
  const [cacheStats, learningAnalytics] = await Promise.all([
    getCacheStats(),
    getLearningAnalytics(),
  ]);

  const recommendations: string[] = [];
  let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

  // Check cache health
  if (cacheStats.totalEntries === 0) {
    recommendations.push('Cache is empty - consider running promotion');
    status = 'degraded';
  }

  if (cacheStats.hitRate < 50) {
    recommendations.push('Low cache hit rate - more learning data needed');
    status = 'degraded';
  }

  // Check learning health
  if (learningAnalytics.totalEntries === 0) {
    recommendations.push('No learning data - start using DAS to build learning base');
    status = 'degraded';
  }

  if (learningAnalytics.overallSuccessRate < 0.8) {
    recommendations.push('Low success rate - review mapping quality');
    status = status === 'healthy' ? 'degraded' : 'critical';
  }

  if (learningAnalytics.promotionCandidates > 10) {
    recommendations.push(`${learningAnalytics.promotionCandidates} mappings ready for promotion`);
  }

  // Check storage
  const totalStorage = cacheStats.storageUsed + learningAnalytics.estimatedSize;
  if (totalStorage > 5 * 1024 * 1024) {
    // > 5MB
    recommendations.push('Consider running cleanup to free storage');
  }

  return {
    cache: {
      totalEntries: cacheStats.totalEntries,
      hitRate: cacheStats.hitRate,
      storageUsed: cacheStats.storageUsed,
    },
    learning: {
      totalEntries: learningAnalytics.totalEntries,
      overallSuccessRate: learningAnalytics.overallSuccessRate,
      promotionCandidates: learningAnalytics.promotionCandidates,
    },
    status,
    recommendations,
  };
}

// ============================================================================
// MAINTENANCE OPERATIONS
// ============================================================================

/**
 * Run full system maintenance
 *
 * - Cleans up old learning entries
 * - Promotes eligible mappings
 * - Optimizes cache
 */
export async function runMaintenance(): Promise<{
  cleanedEntries: number;
  promotionResult: PromotionResult;
}> {
  dasLog.debug('[DAS:Promoter] Starting maintenance...');

  // Clean up old entries
  const cleanedEntries = await cleanupOldEntries();

  // Run promotion
  const promotionResult = await executePromotion();

  dasLog.debug('[DAS:Promoter] Maintenance complete');

  return {
    cleanedEntries,
    promotionResult,
  };
}

/**
 * Reset DAS system (clear all data)
 *
 * WARNING: This clears all learned mappings and cache
 */
export async function resetDAS(): Promise<void> {
  dasLog.debug('[DAS:Promoter] Resetting entire DAS system...');

  await clearCache();
  // Note: Learning store clear is called separately

  dasLog.debug('[DAS:Promoter] DAS system reset complete');
}

// ============================================================================
// SCHEDULED TASKS
// ============================================================================

let maintenanceInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start scheduled maintenance
 *
 * @param intervalMs - Interval between maintenance runs (default: 1 hour)
 */
export function startScheduledMaintenance(intervalMs: number = 60 * 60 * 1000): void {
  if (maintenanceInterval) {
    dasLog.debug('[DAS:Promoter] Maintenance already scheduled');
    return;
  }

  maintenanceInterval = setInterval(() => {
    runMaintenance().catch((error) => {
      dasLog.error('[DAS:Promoter] Scheduled maintenance error:', error);
    });
  }, intervalMs);

  dasLog.debug(`[DAS:Promoter] Scheduled maintenance every ${intervalMs / 1000}s`);
}

/**
 * Stop scheduled maintenance
 */
export function stopScheduledMaintenance(): void {
  if (maintenanceInterval) {
    clearInterval(maintenanceInterval);
    maintenanceInterval = null;
    dasLog.debug('[DAS:Promoter] Scheduled maintenance stopped');
  }
}
