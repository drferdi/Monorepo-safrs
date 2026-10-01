import { describe, expect, it } from 'vitest';

import { pickExactSuggestion } from './suggestion-match';

// The ePuskesmas signa list (read live, 2026-10-01) offers "3X1", "3X1/3", "3X1,5", "3X1/2" for
// "3x1"; only the one that is exactly the signa may be chosen, never the first that contains it.
describe('pickExactSuggestion', () => {
  it('picks the item that is exactly the value, ignoring case and spaces', () => {
    expect(pickExactSuggestion(['3X1/2', '3X1,5', '3X1'], '3x1')).toBe(2);
    expect(pickExactSuggestion(['3 x 1/3', '3 x 1'], '3x1')).toBe(1);
  });

  it('picks nothing when no item is exactly the value', () => {
    expect(pickExactSuggestion(['3X1/3', '3X1,5', '3X1/2'], '3x1')).toBe(-1);
    expect(pickExactSuggestion([], '3x1')).toBe(-1);
  });
});
