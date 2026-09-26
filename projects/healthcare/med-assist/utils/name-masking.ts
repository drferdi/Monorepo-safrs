// Designed and constructed by Drferdi.
/**
 * Name Masking Utility
 *
 * Privacy-compliant name masking for patient data display
 * Masks 3-4 characters per word while preserving readability
 *
 * @module utils/name-masking
 */

/**
 * Mask a single word with asterisks - Maximum privacy (2-3 chars visible only)
 * - Words ≤3 chars: show first 2 chars (e.g., "Adi" → "Ad*")
 * - Words 4-6 chars: show first 2 chars, mask rest (e.g., "Ahmad" → "Ah***")
 * - Words ≥7 chars: show first 3 chars, mask rest (e.g., "Suryadi" → "Sur****")
 *
 * @param word - Word to mask
 * @returns Masked word
 */
function maskWord(word: string): string {
  if (word.length <= 3) {
    // Very short word: show first 2 chars
    return word.slice(0, 2) + '*'.repeat(Math.max(0, word.length - 2));
  } else if (word.length <= 6) {
    // Short-medium word: show first 2 chars, mask rest
    const visible = word.slice(0, 2);
    const masked = '*'.repeat(word.length - 2);
    return visible + masked;
  } else {
    // Long word: show first 3 chars, mask rest
    const visible = word.slice(0, 3);
    const masked = '*'.repeat(word.length - 3);
    return visible + masked;
  }
}

/**
 * Mask patient name for privacy compliance (Maximum Privacy Mode)
 *
 * Examples:
 * - "Ahmad Suryadi" → "Ah*** Sur****"
 * - "Siti Nurhaliza" → "Si** Nur*******"
 * - "Adi Wijaya" → "Ad* Wi****"
 *
 * @param fullName - Full patient name
 * @returns Masked name
 */
export function maskPatientName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  return words.map(maskWord).join(' ');
}

/**
 * Get patient initials
 *
 * @param fullName - Full patient name
 * @returns Initials (e.g., "Ahmad Suryadi" → "AS")
 */
export function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  return words.map((w) => w[0].toUpperCase()).join('');
}

/**
 * Format patient display name with options
 *
 * @param fullName - Full patient name
 * @param options - Display options
 * @returns Formatted name
 */
export function formatPatientName(
  fullName: string,
  options: {
    masked?: boolean;
    initialsOnly?: boolean;
  } = {}
): string {
  if (options.initialsOnly) {
    return getInitials(fullName);
  }

  if (options.masked) {
    return maskPatientName(fullName);
  }

  return fullName;
}

// ============================================================================
// EXAMPLES & TESTS
// ============================================================================

/**
 * Example usage (Maximum Privacy Mode):
 *
 * maskPatientName("Ahmad Suryadi") → "Ah*** Sur****"
 * maskPatientName("Siti Nurhaliza") → "Si** Nur*******"
 * maskPatientName("Adi") → "Ad*"
 * maskPatientName("Muhammad Abdullah") → "Muh***** Abd*****"
 *
 * getInitials("Ahmad Suryadi") → "AS"
 * getInitials("Siti Nurhaliza") → "SN"
 */
