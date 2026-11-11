// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { formatRecommendationLines } from './recommendation-formatter';

describe('formatRecommendationLines', () => {
  it('formats plain sentences as sequentially-numbered items', () => {
    const result = formatRecommendationLines([
      'Lifestyle counseling (DASH diet, exercise, salt <5g/day)',
      'Start pharmacotherapy (per FKTP algorithm)',
      'Target: <140/90 mmHg (or <130/80 if DM/CKD)',
      'Follow-up 2-4 weeks',
    ]);

    expect(result).toEqual([
      { kind: 'item', index: 1, text: 'Lifestyle counseling (DASH diet, exercise, salt <5g/day)' },
      { kind: 'item', index: 2, text: 'Start pharmacotherapy (per FKTP algorithm)' },
      { kind: 'item', index: 3, text: 'Target: <140/90 mmHg (or <130/80 if DM/CKD)' },
      { kind: 'item', index: 4, text: 'Follow-up 2-4 weeks' },
    ]);
  });

  it('skips blank spacer lines', () => {
    const result = formatRecommendationLines(['First step', '', 'Second step']);

    expect(result).toEqual([
      { kind: 'item', index: 1, text: 'First step' },
      { kind: 'item', index: 2, text: 'Second step' },
    ]);
  });

  it('renders a section-marker line (━━━ ... ━━━) as a section header and resets numbering after it', () => {
    const result = formatRecommendationLines([
      'Before section',
      '━━━ ORDER SET (IGD) ━━━',
      '1. Captopril 12.5 mg SL — NOW',
      '2. Monitor TD q15 menit',
    ]);

    expect(result).toEqual([
      { kind: 'item', index: 1, text: 'Before section' },
      { kind: 'section', text: 'ORDER SET (IGD)' },
      { kind: 'item', index: 1, text: 'Captopril 12.5 mg SL — NOW' },
      { kind: 'item', index: 2, text: 'Monitor TD q15 menit' },
    ]);
  });

  it('renders an indented line as a note (no numbered index)', () => {
    const result = formatRecommendationLines([
      '3. Reassess TD pada +30 min:',
      '   DBP 95 sudah ≤100: SKIP repeat Captopril',
    ]);

    expect(result).toEqual([
      { kind: 'item', index: 1, text: 'Reassess TD pada +30 min:' },
      { kind: 'note', text: 'DBP 95 sudah ≤100: SKIP repeat Captopril' },
    ]);
  });

  it('returns an empty array for an empty or all-blank recommendations array', () => {
    expect(formatRecommendationLines([])).toEqual([]);
    expect(formatRecommendationLines(['', '   '])).toEqual([]);
  });
});
