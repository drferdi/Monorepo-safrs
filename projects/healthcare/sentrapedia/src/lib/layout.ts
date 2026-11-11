// Breakpoints the components read in JS. globals.css repeats them in its media queries; tests/layout-constants.test.ts keeps both equal.
export const mobileMaxWidthPx = 760;
export const compactMaxWidthPx = 1200;
export const mobileQuery = `(max-width: ${mobileMaxWidthPx}px)`;
export const compactQuery = `(max-width: ${compactMaxWidthPx}px)`;
