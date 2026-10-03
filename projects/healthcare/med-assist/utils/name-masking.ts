// Designed and constructed by Drferdi.
/**
 * Name Masking Utility
 *
 * Masks a patient's identity before it leaves the extension (Chief, 2026-10-03: the crew portal
 * may receive the patient's identity with parts of the name hidden, "Ferdi Iskandar" →
 * "F**di I*****ar").
 *
 * @module utils/name-masking
 */

/**
 * Mask one word: its first letter and its last two letters stay, the letters between become
 * asterisks ("Ferdi" → "F**di", "Iskandar" → "I*****ar"). A word of three letters or fewer keeps
 * only its first letter ("Adi" → "A**").
 */
function maskWord(word: string): string {
  if (word.length <= 3) {
    return word.slice(0, 1) + '*'.repeat(word.length - 1);
  }
  return word.slice(0, 1) + '*'.repeat(word.length - 3) + word.slice(-2);
}

/**
 * Mask every word of a patient's name ("Ferdi Iskandar" → "F**di I*****ar").
 *
 * @param fullName - Full patient name
 * @returns Masked name
 */
export function maskPatientName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  return words.map(maskWord).join(' ');
}

/**
 * Mask an identifier number, keeping only its last four characters ("0001234567890" →
 * "*********7890").
 *
 * @param value - Identifier such as a BPJS number
 * @returns Masked identifier
 */
export function maskIdentifier(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return '*'.repeat(trimmed.length);
  return '*'.repeat(trimmed.length - 4) + trimmed.slice(-4);
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
