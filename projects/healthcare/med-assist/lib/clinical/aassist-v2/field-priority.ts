/**
 * AASSIST v2 — Field Source Priority Checker
 * Enforces: RME-manual > ASIST-manual > ASIST-autocomplete > fallback_local
 * commit: feat(aassist): implement field source priority — block RME/manual override
 */

export type FieldSource = 'RME-manual' | 'ASIST-manual' | 'ASIST-autocomplete' | 'fallback_local';

const SOURCE_RANK: Record<FieldSource, number> = {
  'RME-manual': 4,
  'ASIST-manual': 3,
  'ASIST-autocomplete': 2,
  fallback_local: 1,
};

/**
 * FieldMeta interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface FieldMeta {
  value: string;
  source: FieldSource;
  timestamp: number;
  locked: boolean;
}

/**
 * Returns true if newSource is allowed to overwrite the current field.
 * Blocks if: field is locked, OR new rank <= existing rank.
 */
export function canOverrideField(current: FieldMeta | undefined, newSource: FieldSource): boolean {
  if (!current || current.value === '') return true;
  if (current.locked) return false;
  return SOURCE_RANK[newSource] > SOURCE_RANK[current.source];
}

/** Create a fresh FieldMeta entry for a newly set value. */
export function makeFieldMeta(value: string, source: FieldSource): FieldMeta {
  return { value, source, timestamp: Date.now(), locked: false };
}

/** Lock a field so it cannot be overridden by any source. */
export function lockField(meta: FieldMeta): FieldMeta {
  return { ...meta, locked: true };
}

// ─── Audit log entry for blocked override attempts ──────────────────────────
export interface OverrideAttemptLog {
  field: string;
  attemptedSource: FieldSource;
  existingSource: FieldSource;
  existingValue: string;
  reason: string;
  timestamp: string;
}

/**
 * buildBlockedOverrideLog
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function buildBlockedOverrideLog(
  field: string,
  attempted: FieldSource,
  existing: FieldMeta
): OverrideAttemptLog {
  return {
    field,
    attemptedSource: attempted,
    existingSource: existing.source,
    existingValue: existing.value,
    reason: `autocomplete attempt skipped because ${existing.source} present`,
    timestamp: new Date().toISOString(),
  };
}
