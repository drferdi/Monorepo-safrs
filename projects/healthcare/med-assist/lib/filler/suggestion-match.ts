const compact = (value: string): string => value.toLowerCase().replace(/\s+/g, '');

/**
 * Index of the menu item that is exactly the value (case and spaces ignored), or -1. Used where
 * a near item is a different entry, e.g. the ePuskesmas signa "3X1/2" for "3x1".
 */
export function pickExactSuggestion(itemTexts: string[], value: string): number {
  const target = compact(value);
  return target ? itemTexts.findIndex((text) => compact(text) === target) : -1;
}
