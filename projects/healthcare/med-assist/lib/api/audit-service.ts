// Designed and constructed by Drferdi.
/**
 * The "Black Box" - Immutable Audit Trail Service
 *
 * Purpose: Secure, tamper-evident logging of all clinical decisions.
 * Mechanism: Cryptographic chaining (Blockchain-lite). Entry N includes Hash of N-1.
 *
 * @module lib/api/audit-service
 */

import { storage } from '@wxt-dev/storage';

// ============================================================================
// TYPES
// ============================================================================

export type AuditActor = 'SYSTEM_ISKANDAR_DIAGNOSIS_ENGINE' | 'USER_DOCTOR' | 'SYSTEM_INTERNAL';

/**
 * AuditEntry interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO-8601
  actor: AuditActor;
  action: string;
  context: unknown; // Input data snapshot
  outcome: unknown; // Output/Recommendation snapshot
  previousHash: string; // Hash of the previous entry (integrity link)
  hash: string; // Hash of THIS entry
}

/**
 * AuditLogConfig interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface AuditLogConfig {
  storageKey: `local:${string}` | `session:${string}` | `sync:${string}` | `managed:${string}`;
  maxEntries: number;
}

// ============================================================================
// SERVICE
// ============================================================================

class AuditService {
  private config: AuditLogConfig = {
    storageKey: 'local:sentra_audit_log',
    maxEntries: 1000, // Rolling log for MVP
  };

  private memoryCache: AuditEntry[] = [];
  private initialized: boolean = false;

  /**
   * Initialize the audit service
   * Loads existing chain from storage to memory
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await storage.getItem<AuditEntry[]>(this.config.storageKey);
      this.memoryCache = stored || [];

      // Verify integrity on load (optional, but good for "Vision Integrity")
      const isIntegrityIntact = await this.verifyChainIntegrity();
      if (!isIntegrityIntact) {
        console.error('🚨 AUDIT TRAIL COMPROMISED: Integrity check failed on load.');
        // In a real system, we would alert the user or lock the system.
        // For now, we log the breach.
        this.log({
          actor: 'SYSTEM_INTERNAL',
          action: 'INTEGRITY_CHECK_FAILED',
          context: { error: 'Chain validation failed on startup' },
          outcome: 'Audit service tainted',
        });
      }

      this.initialized = true;
      console.warn(`[AuditService] Initialized. ${this.memoryCache.length} entries loaded.`);
    } catch (e) {
      console.error('[AuditService] Failed to initialize:', e);
      this.memoryCache = []; // Start fresh on critical failure (or safe mode)
    }
  }

  /**
   * Log a clinical event
   * @param entry - The event details (minus integrity fields)
   */
  async log(
    entry: Omit<AuditEntry, 'id' | 'timestamp' | 'previousHash' | 'hash'>
  ): Promise<AuditEntry> {
    if (!this.initialized) await this.init();

    const timestamp = new Date().toISOString();
    const id = crypto.randomUUID();
    const previousEntry = this.memoryCache[this.memoryCache.length - 1];
    const previousHash = previousEntry ? previousEntry.hash : 'GENESIS_BLOCK';

    // Construct the payload to hash
    const rawData = {
      id,
      timestamp,
      actor: entry.actor,
      action: entry.action,
      context: entry.context,
      outcome: entry.outcome,
      previousHash,
    };

    // Calculate SHA-256 hash (The "Seal")
    const hash = await this.calculateHash(rawData);

    const fullEntry: AuditEntry = {
      ...rawData,
      hash,
    };

    // Commit to chain
    this.memoryCache.push(fullEntry);

    // Prune if needed (keeping the chain intact is hard with rolling logs,
    // for MVP we just drop oldest, but in reality we'd archive them)
    if (this.memoryCache.length > this.config.maxEntries) {
      // Warning: This technically breaks the genesis link of the visible chain.
      // For visual validation it's fine, but true blockchain needs archiving.
      this.memoryCache.shift();
    }

    // Persist async
    this.persist();

    return fullEntry;
  }

  /**
   * Get the entire immutable log
   */
  async getLog(): Promise<AuditEntry[]> {
    if (!this.initialized) await this.init();
    return [...this.memoryCache];
  }

  /**
   * Verify the cryptographic integrity of the entire chain
   * @returns true if valid, false if tampered
   */
  async verifyChainIntegrity(): Promise<boolean> {
    if (this.memoryCache.length === 0) return true;

    for (let i = 0; i < this.memoryCache.length; i++) {
      const entry = this.memoryCache[i];

      // 1. Peer-Link Check: entry.previousHash must match prev.hash
      if (i > 0) {
        const prev = this.memoryCache[i - 1];
        if (entry.previousHash !== prev.hash) {
          console.error(`integrity fail at index ${i}: Link broken`);
          return false;
        }
      } else {
        // Genesis check (optional logic here)
      }

      // 2. Self-Consistency Check: Re-hash data and compare with entry.hash
      const rawData = {
        id: entry.id,
        timestamp: entry.timestamp,
        actor: entry.actor,
        action: entry.action,
        context: entry.context,
        outcome: entry.outcome,
        previousHash: entry.previousHash,
      };
      const recalculated = await this.calculateHash(rawData);

      if (recalculated !== entry.hash) {
        console.error(`integrity fail at index ${i}: Hash mismatch`);
        return false;
      }
    }

    return true;
  }

  /**
   * Clear the log (Dev utility only - should be protected in production)
   */
  async clear(): Promise<void> {
    this.memoryCache = [];
    await storage.removeItem(this.config.storageKey);
    await this.log({
      actor: 'SYSTEM_INTERNAL',
      action: 'AUDIT_LOG_CLEARED',
      context: { reason: 'User requested clear / Dev Reset' },
      outcome: 'Genesis block reset',
    });
  }

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  private async persist(): Promise<void> {
    try {
      await storage.setItem(this.config.storageKey, this.memoryCache);
    } catch (e) {
      console.error('[AuditService] Failed to persist log:', e);
    }
  }

  private async calculateHash(data: unknown): Promise<string> {
    const json = JSON.stringify(data);
    const msgBuffer = new TextEncoder().encode(json);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

// Export Singleton
export const auditService = new AuditService();
