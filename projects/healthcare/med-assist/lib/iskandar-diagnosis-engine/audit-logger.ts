// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * CDSS Audit Logger
 * Append-only logging for clinical decision support audit trail
 *
 * @module lib/iskandar-diagnosis-engine/audit-logger
 * @version 1.0.0
 *
 * IMPORTANT: This module is critical for clinical governance.
 * All CDSS interactions MUST be logged for accountability.
 * Logs are retained for 10 years per Sentra governance.
 */

// =============================================================================
// AUDIT TYPES
// =============================================================================

/**
 * Audit action types
 */
export type AuditAction =
  | 'diagnosis_requested'
  | 'suggestion_displayed'
  | 'shadow_comparison_recorded'
  | 'suggestion_selected'
  | 'suggestion_rejected'
  | 'red_flag_shown'
  | 'red_flag_acknowledged'
  | 'engine_error'
  | 'api_timeout'
  | 'fallback_used';

/**
 * Audit entry structure
 */
export interface AuditEntry {
  /** Entry ID (UUID) */
  id: string;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** Hashed session/encounter ID (no PII) */
  session_hash: string;

  /** Action type */
  action: AuditAction;

  /** Hash of anonymized input (no PII) */
  input_hash: string;

  /** Output summary */
  output_summary: {
    suggestion_count: number;
    top_icd_codes: string[];
    red_flag_count: number;
    confidence_range: [number, number] | null;
  };

  /** Model version used */
  model_version: string;

  /** Processing latency in milliseconds */
  latency_ms: number;

  /** Validation status */
  validation_status: 'PASS' | 'WARN' | 'FAIL';

  /** Additional metadata */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Audit log storage structure
 */
interface AuditLogStorage {
  entries: AuditEntry[];
  last_updated: string;
  entry_count: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'sentra:cdss:audit';
const MAX_ENTRIES = 1000; // FIFO eviction after this

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Simple hash function (non-cryptographic, for audit trail only)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// =============================================================================
// AUDIT LOGGER CLASS
// =============================================================================

/**
 * CDSS Audit Logger
 * Singleton pattern for consistent logging
 */
class CDSSAuditLogger {
  private cache: AuditEntry[] = [];
  private initialized = false;

  /**
   * Initialize logger and load existing entries
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const result = await browser.storage.local.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY] as AuditLogStorage | undefined;

      if (stored && Array.isArray(stored.entries)) {
        this.cache = stored.entries;
      }

      this.initialized = true;
      console.warn(`[AuditLogger] Initialized with ${this.cache.length} entries`);
    } catch (error) {
      console.error('[AuditLogger] Failed to initialize:', error);
      this.cache = [];
      this.initialized = true;
    }
  }

  /**
   * Log a CDSS action
   */
  async log(
    action: AuditAction,
    data: {
      session_id: string;
      input_context?: string;
      suggestions?: Array<{ icd10_code: string; confidence: number }>;
      red_flag_count?: number;
      model_version?: string;
      latency_ms?: number;
      validation_status?: 'PASS' | 'WARN' | 'FAIL';
      metadata?: Record<string, string | number | boolean>;
    }
  ): Promise<void> {
    await this.init();

    const entry: AuditEntry = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      session_hash: simpleHash(data.session_id),
      action,
      input_hash: data.input_context ? simpleHash(data.input_context) : '',
      output_summary: {
        suggestion_count: data.suggestions?.length || 0,
        top_icd_codes: data.suggestions?.slice(0, 5).map((s) => s.icd10_code) || [],
        red_flag_count: data.red_flag_count || 0,
        confidence_range:
          data.suggestions && data.suggestions.length > 0
            ? [
                Math.min(...data.suggestions.map((s) => s.confidence)),
                Math.max(...data.suggestions.map((s) => s.confidence)),
              ]
            : null,
      },
      model_version: data.model_version || 'unknown',
      latency_ms: data.latency_ms || 0,
      validation_status: data.validation_status || 'PASS',
      metadata: data.metadata,
    };

    // Append to cache
    this.cache.push(entry);

    // FIFO eviction if over limit
    if (this.cache.length > MAX_ENTRIES) {
      this.cache = this.cache.slice(-MAX_ENTRIES);
    }

    // Persist to storage
    await this.persist();

    console.warn(`[AuditLogger] Logged: ${action} (${entry.id.substring(0, 8)}...)`);
  }

  /**
   * Persist cache to storage
   */
  private async persist(): Promise<void> {
    try {
      const storage: AuditLogStorage = {
        entries: this.cache,
        last_updated: new Date().toISOString(),
        entry_count: this.cache.length,
      };

      await browser.storage.local.set({ [STORAGE_KEY]: storage });
    } catch (error) {
      console.error('[AuditLogger] Failed to persist:', error);
    }
  }

  /**
   * Get recent entries
   */
  async getRecentEntries(count = 50): Promise<AuditEntry[]> {
    await this.init();
    return this.cache.slice(-count).reverse();
  }

  /**
   * Get entries by session
   */
  async getBySession(sessionHash: string): Promise<AuditEntry[]> {
    await this.init();
    return this.cache.filter((e) => e.session_hash === sessionHash);
  }

  /**
   * Get entries by date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<AuditEntry[]> {
    await this.init();

    return this.cache.filter((e) => {
      const entryDate = new Date(e.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total_entries: number;
    actions_breakdown: Record<AuditAction, number>;
    validation_breakdown: Record<string, number>;
    avg_latency_ms: number;
    date_range: { oldest: string; newest: string } | null;
  }> {
    await this.init();

    const actionsBreakdown: Record<string, number> = {};
    const validationBreakdown: Record<string, number> = {};
    let totalLatency = 0;

    for (const entry of this.cache) {
      actionsBreakdown[entry.action] = (actionsBreakdown[entry.action] || 0) + 1;
      validationBreakdown[entry.validation_status] =
        (validationBreakdown[entry.validation_status] || 0) + 1;
      totalLatency += entry.latency_ms;
    }

    return {
      total_entries: this.cache.length,
      actions_breakdown: actionsBreakdown as Record<AuditAction, number>,
      validation_breakdown: validationBreakdown,
      avg_latency_ms: this.cache.length > 0 ? Math.round(totalLatency / this.cache.length) : 0,
      date_range:
        this.cache.length > 0
          ? {
              oldest: this.cache[0].timestamp,
              newest: this.cache[this.cache.length - 1].timestamp,
            }
          : null,
    };
  }

  /**
   * Export entries to JSON string (for archival)
   */
  async export(startDate?: Date, endDate?: Date): Promise<string> {
    await this.init();

    let entries = this.cache;

    if (startDate && endDate) {
      entries = entries.filter((e) => {
        const entryDate = new Date(e.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    return JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        entry_count: entries.length,
        entries,
      },
      null,
      2
    );
  }

  /**
   * Clear old entries (for maintenance)
   * Keeps entries from the last N days
   */
  async clearOldEntries(keepDays: number): Promise<number> {
    await this.init();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    const originalCount = this.cache.length;
    this.cache = this.cache.filter((e) => new Date(e.timestamp) >= cutoffDate);

    const removed = originalCount - this.cache.length;

    if (removed > 0) {
      await this.persist();
      console.warn(`[AuditLogger] Cleared ${removed} old entries`);
    }

    return removed;
  }

  /**
   * Get entry count
   */
  async getEntryCount(): Promise<number> {
    await this.init();
    return this.cache.length;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const auditLogger = new CDSSAuditLogger();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Log diagnosis request
 */
export async function logDiagnosisRequest(data: {
  session_id: string;
  input_context: string;
  model_version: string;
}): Promise<void> {
  await auditLogger.log('diagnosis_requested', data);
}

/**
 * Log suggestion displayed
 */
export async function logSuggestionDisplayed(data: {
  session_id: string;
  suggestions: Array<{ icd10_code: string; confidence: number }>;
  red_flag_count: number;
  model_version: string;
  latency_ms: number;
  validation_status: 'PASS' | 'WARN' | 'FAIL';
  metadata?: Record<string, string | number | boolean>;
}): Promise<void> {
  await auditLogger.log('suggestion_displayed', data);
}

/**
 * Log de-identified shadow comparison telemetry for diagnosis V2
 */
export async function logShadowComparison(data: {
  session_id: string;
  suggestions: Array<{ icd10_code: string; confidence: number }>;
  model_version: string;
  metadata: Record<string, string | number | boolean>;
}): Promise<void> {
  await auditLogger.log('shadow_comparison_recorded', {
    session_id: data.session_id,
    suggestions: data.suggestions,
    model_version: data.model_version,
    metadata: data.metadata,
  });
}

/**
 * Log suggestion selected by doctor
 */
export async function logSuggestionSelected(data: {
  session_id: string;
  selected_icd: string;
  selected_confidence: number;
}): Promise<void> {
  await auditLogger.log('suggestion_selected', {
    session_id: data.session_id,
    suggestions: [{ icd10_code: data.selected_icd, confidence: data.selected_confidence }],
    metadata: { selected_icd: data.selected_icd },
  });
}

/**
 * Log red flag shown
 */
export async function logRedFlagShown(data: {
  session_id: string;
  red_flag_id: string;
  red_flag_condition: string;
}): Promise<void> {
  await auditLogger.log('red_flag_shown', {
    session_id: data.session_id,
    red_flag_count: 1,
    metadata: {
      red_flag_id: data.red_flag_id,
      condition: data.red_flag_condition,
    },
  });
}

/**
 * Log engine error
 */
export async function logEngineError(data: {
  session_id: string;
  error_message: string;
  error_code?: string;
}): Promise<void> {
  await auditLogger.log('engine_error', {
    session_id: data.session_id,
    validation_status: 'FAIL',
    metadata: {
      error: data.error_message,
      code: data.error_code || 'UNKNOWN',
    },
  });
}

/**
 * Log fallback used
 */
export async function logFallbackUsed(data: { session_id: string; reason: string }): Promise<void> {
  await auditLogger.log('fallback_used', {
    session_id: data.session_id,
    model_version: 'local-fallback',
    metadata: { reason: data.reason },
  });
}

// Types already exported with their definitions above
