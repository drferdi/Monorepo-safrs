// Designed and constructed by Drferdi.
/**
 * CP-066 "Infeksi jaringan dalam pada DM — risiko gangren" harus butuh bukti
 * LUKA terinfeksi, bukan sekadar kata demam/pilek. Regresi nyata: pasien DM
 * dengan keluhan "batuk pilek sesak" memicu alert gangren + Gate 2.
 */
import { describe, expect, it } from 'vitest';

import { CLINICAL_PATTERNS } from './clinical-patterns';
import { buildClinicalSnapshot, type SnapshotFormState } from './clinical-snapshot';
import { evaluatePatterns } from './pattern-engine';

const makeState = (overrides: Partial<SnapshotFormState> = {}): SnapshotFormState => ({
  sbp: '120',
  dbp: '80',
  hr: '88',
  rr: '18',
  temp: '37.4',
  spo2: '98',
  glucose: '',
  symptomText: '',
  allergies: [],
  pregnancyStatus: null,
  avpu: 'A',
  supplemental_o2: false,
  pain_score: '',
  ...overrides,
});

function cp066AlertFor(symptomText: string) {
  const baseSnapshot = buildClinicalSnapshot(makeState({ symptomText }), { patientAge: 50 });
  const snapshot = {
    ...baseSnapshot,
    history: {
      ...baseSnapshot.history,
      knownDM: true,
    },
  };
  const matches = evaluatePatterns(snapshot, CLINICAL_PATTERNS, [], {
    tierFilter: ['A', 'B', 'C'],
  });
  return matches.find((match) => match.pattern.id === 'CP-066');
}

describe('CP-066 — infeksi jaringan dalam pada DM', () => {
  it('TIDAK terpicu oleh keluhan demam/batuk-pilek tanpa luka, meski riwayat DM', () => {
    expect(cp066AlertFor('batuk pilek sesak, demam ringan')).toBeUndefined();
  });

  it('TIDAK terpicu oleh bahasa infeksi generik tanpa bukti luka/jaringan lunak', () => {
    expect(
      cp066AlertFor('infeksi saluran napas, demam menggigil, radang tenggorokan, batuk berdahak')
    ).toBeUndefined();
  });

  it('TIDAK terpicu bila bukti luka dinyatakan tidak ada', () => {
    expect(cp066AlertFor('demam ringan, tetapi tidak ada luka bernanah')).toBeUndefined();
  });

  it('terpicu bila ada luka terinfeksi pada pasien DM', () => {
    expect(cp066AlertFor('luka di kaki bernanah, demam ringan')).toBeDefined();
  });

  it.each(['gangren kaki diabetik', 'ulkus diabetikum bernanah', 'luka kaki kehitaman nekrosis'])(
    'terpicu oleh bukti eksplisit luka/gangren: %s',
    (symptomText) => {
      expect(cp066AlertFor(symptomText)).toBeDefined();
    }
  );
});
