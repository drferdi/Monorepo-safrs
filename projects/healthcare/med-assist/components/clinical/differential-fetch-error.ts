// Designed and constructed by Drferdi.

export const LOCAL_DIAGNOSIS_FALLBACK_MESSAGE =
  'Diagnosis spesifik belum dapat ditetapkan karena hasil canonical/CDSS tidak tersedia atau bukti klinis belum cukup.';

/**
 * Single visible dx source = engine suggestions (H6).
 * Never surface a canonical-fallback conflict banner when the engine list is usable.
 */
export function resolveDifferentialListErrorMessage(engineSuggestionCount: number): string {
  if (engineSuggestionCount > 0) return '';
  return LOCAL_DIAGNOSIS_FALLBACK_MESSAGE;
}
