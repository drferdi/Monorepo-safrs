// Designed and constructed by Drferdi.

/**
 * Shared math utilities for the Iskandar Diagnosis Engine.
 * Deduplicates clamp/round patterns used across 6 engine modules.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
