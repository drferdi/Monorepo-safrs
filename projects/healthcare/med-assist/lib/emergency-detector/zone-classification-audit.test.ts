import { describe, expect, it } from 'vitest';

import { buildAlerts, type ScreeningAlert } from '@/components/clinical/TTVInferenceUI';
import { CLINICAL_PATTERNS } from '@/lib/emergency-detector/clinical-patterns';
import { computeTriageVerdict } from '@/lib/emergency-detector/triage-verdict';

function findPattern(id: string) {
  const pattern = CLINICAL_PATTERNS.find((p) => p.id === id);
  if (!pattern) throw new Error(`Pattern ${id} not found in CLINICAL_PATTERNS`);
  return pattern;
}

function zoneForPattern(id: string): 'merah' | 'kuning' {
  const pattern = findPattern(id);
  const syntheticAlert: ScreeningAlert = {
    id: `synthetic-${pattern.id}`,
    type: pattern.gate,
    severity: pattern.severity,
    title: pattern.title,
    gate: pattern.gate,
    reasoning: '',
    recommendations: [],
  };
  const zone = computeTriageVerdict([syntheticAlert], true).zone;
  if (zone !== 'merah' && zone !== 'kuning') {
    throw new Error(`Unexpected zone ${zone} for single non-empty alert`);
  }
  return zone;
}

const makeState = (
  overrides: Partial<Parameters<typeof buildAlerts>[0]> = {}
): Parameters<typeof buildAlerts>[0] => ({
  sbp: '',
  dbp: '',
  hr: '',
  rr: '',
  temp: '',
  spo2: '',
  glucose: '',
  symptomText: '',
  allergies: [],
  pregnancyStatus: null,
  disabilityType: '',
  obesityConfirmation: '',
  autosenPreset: 'adl',
  avpu: 'A',
  supplemental_o2: false,
  pain_score: '',
  ...overrides,
});

function zoneForLegacyType(
  type: string,
  state: Parameters<typeof buildAlerts>[0],
  patient: Parameters<typeof buildAlerts>[1] = { patientAge: 45 }
) {
  const alerts = buildAlerts(state, patient);
  const alert = alerts.find((a) => a.type === type);
  if (!alert) throw new Error(`No alert of type ${type} fired for the given state`);
  return computeTriageVerdict([alert], true).zone;
}

describe('zone-classification audit — Pattern-Engine v2 (CP-*) — MERAH', () => {
  it.each([
    'CP-002',
    'CP-006',
    'CP-007',
    'CP-010',
    'CP-011',
    'CP-012',
    'CP-014',
    'CP-015',
    'CP-017',
    'CP-018',
    'CP-019',
    'CP-021',
    'CP-022',
    'CP-023',
    'CP-024',
    'CP-026',
    'CP-027',
    'CP-030',
    'CP-032',
    'CP-036',
    'CP-045',
    'CP-046',
    'CP-047',
    'CP-048',
    'CP-054',
    'CP-055',
    'CP-056',
    'CP-057',
    'CP-060',
    'CP-061',
    'CP-062',
    'CP-064',
    'CP-067',
    'CP-069',
    'CP-070',
  ])('%s resolves to zone merah', (id) => {
    expect(zoneForPattern(id)).toBe('merah');
  });
});

describe('zone-classification audit — Pattern-Engine v2 (CP-*) — KUNING', () => {
  it.each([
    'CP-001',
    'CP-003',
    'CP-004',
    'CP-005',
    'CP-008',
    'CP-009',
    'CP-013',
    'CP-016',
    'CP-020',
    'CP-025',
    'CP-028',
    'CP-029',
    'CP-031',
    'CP-033',
    'CP-034',
    'CP-035',
    'CP-037',
    'CP-039',
    'CP-040',
    'CP-041',
    'CP-042',
    'CP-044',
    'CP-049',
    'CP-050',
    'CP-051',
    'CP-052',
    'CP-053',
    'CP-058',
  ])('%s resolves to zone kuning', (id) => {
    expect(zoneForPattern(id)).toBe('kuning');
  });
});

describe('zone-classification audit — legacy buildAlerts() entities — MERAH', () => {
  it('hypotension resolves to merah', () => {
    expect(zoneForLegacyType('hypotension', makeState({ sbp: '85', dbp: '55', hr: '95' }))).toBe(
      'merah'
    );
  });

  it('hypoglycemia (critical, glucose < 54) resolves to merah', () => {
    expect(zoneForLegacyType('hypoglycemia', makeState({ glucose: '40' }))).toBe('merah');
  });

  it('hypoxia (SpO2 critical) resolves to merah', () => {
    expect(zoneForLegacyType('hypoxia', makeState({ spo2: '85' }))).toBe('merah');
  });

  it('code_red_cue resolves to merah', () => {
    expect(
      zoneForLegacyType(
        'code_red_cue',
        makeState({ symptomText: 'nyeri dada dan sesak berat', spo2: '89', rr: '32' })
      )
    ).toBe('merah');
  });

  it('avpu_abnormal (observed AVPU=V) resolves to merah', () => {
    expect(zoneForLegacyType('avpu_abnormal', makeState({ avpu: 'V' }))).toBe('merah');
  });

  it('hypertensive_crisis pediatric-severe-threshold resolves to merah', () => {
    // Toddler (1-3y) severeHypertensionSbp/Dbp = 130/85 (vital-screening-thresholds.ts)
    // — unconditionally critical for pediatric patients, unlike the adult
    // crisis tier (no HMOD-based split for pediatric severe HTN).
    expect(
      zoneForLegacyType('hypertensive_crisis', makeState({ sbp: '135', dbp: '90' }), {
        patientAge: 2,
      })
    ).toBe('merah');
  });
});

describe('zone-classification audit — legacy buildAlerts() entities — KUNING', () => {
  it('urgent_pain resolves to kuning', () => {
    expect(
      zoneForLegacyType('urgent_pain', makeState({ sbp: '120', dbp: '80', pain_score: '8' }))
    ).toBe('kuning');
  });

  it('borderline_hypoxia resolves to kuning', () => {
    expect(zoneForLegacyType('borderline_hypoxia', makeState({ spo2: '93' }))).toBe('kuning');
  });

  it('preeclampsia_watch (mild BP elevation, not severe) resolves to kuning', () => {
    // vital-guardrails.ts requires patient.gender === 'P' for this soft
    // flag — must be passed explicitly, the default patient object in
    // zoneForLegacyType only sets patientAge.
    expect(
      zoneForLegacyType(
        'preeclampsia_watch',
        makeState({ sbp: '145', dbp: '92', pregnancyStatus: true }),
        { patientAge: 28, patientGender: 'P' }
      )
    ).toBe('kuning');
  });

  it('hypertensive_crisis adult crisis-tier (no HMOD data available) resolves to kuning', () => {
    expect(zoneForLegacyType('hypertensive_crisis', makeState({ sbp: '185', dbp: '112' }))).toBe(
      'kuning'
    );
  });

  it('geriatric_low_grade_fever resolves to kuning', () => {
    // This gate only fires for older-adult physiology — patientAge must be
    // explicitly overridden past the default (45) to a geriatric age.
    expect(
      zoneForLegacyType(
        'geriatric_low_grade_fever',
        makeState({
          temp: '37.5',
          rr: '22',
          spo2: '94',
          symptomText: 'Lemas, bingung, dan intake turun sejak kemarin',
        }),
        { patientAge: 76 }
      )
    ).toBe('kuning');
  });

  it('context_note resolves to kuning', () => {
    expect(
      zoneForLegacyType(
        'context_note',
        makeState({ sbp: '130', dbp: '80', obesityConfirmation: 'morbid_obesity' })
      )
    ).toBe('kuning');
  });
});

// Explicitly deferred — flagged during the 2026-07-07 audit as lower
// confidence / genuinely debatable, not changed. See
// docs/specs/2026-07-07-triage-zone-severity-audit-design.md "Explicitly
// deferred" section for the reasoning behind each.
describe.skip('zone-classification audit — deferred, not fixed this round', () => {
  it.each([
    ['CP-038', 'deteriorasi progresif — ambiguous whether warning is too low'],
    ['CP-059', 'neutropenic sepsis — real-world "always urgent" convention vs mild-fever title'],
    ['CP-063', 'aritmia + near-syncope — referral-trigger, not resuscitation-tier'],
    ['CP-065', 'cardiac red flag remaja — referral-trigger, not resuscitation-tier'],
    ['CP-066', 'infeksi jaringan dalam DM — confirmed severe wound evidence required to fire'],
    ['CP-043', 'depresi napas obat — not explicitly zoned by name in Chief spec'],
    ['CP-068', 'overdosis obat borderline — not explicitly zoned by name in Chief spec'],
  ])('%s deferred: %s', () => {
    // Intentionally skipped — see comment above.
  });
});
