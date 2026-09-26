// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * DAS Phase 2: Semantic Mapper Orchestrator
 *
 * Main entry point for adaptive form field mapping.
 * Coordinates: DOM Scanner → Cache → Local Semantic Mapper → Safety Validation
 *
 * @module lib/scraper/adaptive/semantic-mapper
 */

import { scanPageFields } from './dom-scanner';
import { mapFieldsHeuristic, mapFieldsLocally } from './local-semantic-mapper';
import {
  computePageHash,
  getCachedMapping,
  restoreMappingsFromCache,
  setCachedMapping,
  updateCacheResult,
} from './mapping-cache';
import {
  enforceConfidenceThresholds,
  generateValidationSummary,
  validateMappings,
} from './safety-validator';
import type { MapperOptions, MappingContext, MappingResult, PageType } from './types';

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: Required<MapperOptions> = {
  bypassCache: false,
  minConfidence: 0.8,
  includeUnmapped: true,
  pageType: 'unknown',
};

// ============================================================================
// PAGE TYPE DETECTION
// ============================================================================

/**
 * Detect page type from URL
 */
function detectPageType(url: string): PageType {
  const lowerUrl = url.toLowerCase();

  if (
    lowerUrl.includes('/anamnesa') ||
    lowerUrl.includes('/anamnesis') ||
    lowerUrl.includes('/pemeriksaan')
  ) {
    return 'anamnesa';
  }

  if (lowerUrl.includes('/resep') || lowerUrl.includes('/terapi') || lowerUrl.includes('/obat')) {
    return 'resep';
  }

  if (lowerUrl.includes('/soap') || lowerUrl.includes('/subjektif')) {
    return 'soap';
  }

  if (
    lowerUrl.includes('/diagnosa') ||
    lowerUrl.includes('/diagnosis') ||
    lowerUrl.includes('/icd10') ||
    lowerUrl.includes('/icd-10')
  ) {
    return 'diagnosa';
  }

  return 'unknown';
}

// ============================================================================
// MAIN MAPPER FUNCTION
// ============================================================================

/**
 * Map payload data to form fields using adaptive semantic mapping
 *
 * This is the main entry point for DAS Phase 2.
 *
 * Flow:
 * 1. Scan page fields (DOM Scanner)
 * 2. Check Layer 1 cache
 * 3. If cache miss, call the local semantic mapper
 * 4. Validate mappings (Safety)
 * 5. Store successful mappings in cache
 * 6. Return result
 *
 * @param payload - Data to fill into form
 * @param options - Mapper options
 * @returns Mapping result with field matches and safety info
 */
export async function mapPayloadToFields(
  payload: Record<string, unknown>,
  options?: MapperOptions
): Promise<MappingResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // 1. Scan page fields
    const scanResult = scanPageFields({ includeHidden: false });
    const { fields } = scanResult;

    if (fields.length === 0) {
      return {
        mappings: [],
        unmapped: Object.keys(payload),
        warnings: ['No form fields found on page'],
        fromCache: false,
        latencyMs: Date.now() - startTime,
      };
    }

    // 2. Compute page hash for cache lookup
    const pageUrl = window.location.href;
    const pageHash = computePageHash(pageUrl, fields);
    const pageType = opts.pageType !== 'unknown' ? opts.pageType : detectPageType(pageUrl);

    // 3. Check cache (unless bypassed)
    if (!opts.bypassCache) {
      const cached = await getCachedMapping(pageHash);

      if (cached) {
        console.warn('[DAS:Mapper] Cache hit:', pageHash);

        // Restore mappings from cache
        const restoredMappings = restoreMappingsFromCache(cached, fields);

        // Filter by payload keys (only map keys that exist in payload)
        const payloadKeys = new Set(Object.keys(payload));
        const relevantMappings = restoredMappings.filter((m) => payloadKeys.has(m.payloadKey));

        // Find unmapped keys
        const mappedKeys = new Set(relevantMappings.map((m) => m.payloadKey));
        const unmapped = Object.keys(payload).filter((k) => !mappedKeys.has(k));

        // Apply safety thresholds
        const safeMappings = enforceConfidenceThresholds(relevantMappings);

        return {
          mappings: safeMappings,
          unmapped: opts.includeUnmapped ? unmapped : [],
          warnings: [],
          fromCache: true,
          latencyMs: Date.now() - startTime,
        };
      }
    }

    // 4. Build mapping context
    const context: MappingContext = {
      pageType,
      pageUrl,
    };

    // 5. Call the local semantic mapper for mapping
    console.warn('[DAS:Mapper] Cache miss, calling local mapper...');
    let result: MappingResult;

    try {
      result = await mapFieldsLocally(payload, fields, context);
    } catch {
      console.warn('[DAS:Mapper] Local mapper failed, using heuristic fallback');
      result = mapFieldsHeuristic(payload, fields);
    }

    // 6. Apply safety validation
    const safeMappings = enforceConfidenceThresholds(result.mappings);
    const validation = validateMappings(safeMappings);

    console.warn('[DAS:Mapper] Validation:', generateValidationSummary(validation));

    // 7. Filter by confidence threshold
    const qualifiedMappings = safeMappings.filter((m) => m.confidence >= opts.minConfidence);

    // 8. Store successful mappings in cache (only high-confidence ones)
    const cacheableMappings = qualifiedMappings.filter((m) => m.confidence >= 0.9);

    if (cacheableMappings.length > 0 && !opts.bypassCache) {
      await setCachedMapping(pageHash, pageType, cacheableMappings);
      console.warn('[DAS:Mapper] Cached', cacheableMappings.length, 'mappings');
    }

    // 9. Combine warnings
    const allWarnings = [...result.warnings, ...validation.warnings];

    return {
      mappings: qualifiedMappings,
      unmapped: opts.includeUnmapped ? result.unmapped : [],
      warnings: allWarnings,
      fromCache: false,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[DAS:Mapper] Error:', error);

    return {
      mappings: [],
      unmapped: Object.keys(payload),
      warnings: [`Mapper error: ${error instanceof Error ? error.message : 'Unknown'}`],
      fromCache: false,
      latencyMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick map with default options
 */
export async function quickMap(payload: Record<string, unknown>): Promise<MappingResult> {
  return mapPayloadToFields(payload);
}

/**
 * Map with cache bypass (force fresh local mapping)
 */
export async function mapFresh(payload: Record<string, unknown>): Promise<MappingResult> {
  return mapPayloadToFields(payload, { bypassCache: true });
}

/**
 * Update cache after fill result
 *
 * Call this after executing fill to improve cache accuracy
 */
export async function reportFillResult(success: boolean): Promise<void> {
  const scanResult = scanPageFields();
  const pageHash = computePageHash(window.location.href, scanResult.fields);
  await updateCacheResult(pageHash, success);
}

// ============================================================================
// DIAGNOSTIC FUNCTIONS
// ============================================================================

/**
 * Get mapping preview without executing
 *
 * Useful for UI to show user what will be filled
 */
export async function previewMapping(payload: Record<string, unknown>): Promise<{
  totalFields: number;
  matchedFields: number;
  unmatchedKeys: string[];
  mappings: Array<{
    key: string;
    field: string;
    confidence: number;
    action: string;
  }>;
}> {
  const result = await mapPayloadToFields(payload);

  return {
    totalFields: result.mappings.length + result.unmapped.length,
    matchedFields: result.mappings.length,
    unmatchedKeys: result.unmapped,
    mappings: result.mappings.map((m) => ({
      key: m.payloadKey,
      field: m.targetField.label || m.targetField.attributes.name || m.targetField.id,
      confidence: Math.round(m.confidence * 100),
      action: m.action,
    })),
  };
}
