// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { CLINICAL_PATTERNS } from './clinical-patterns';

const findPattern = (id: string) => CLINICAL_PATTERNS.find((p) => p.id === id);

describe('clinical-patterns actionProtocolId mapping', () => {
  describe('category B — direct match to a new protocol', () => {
    it.each([
      ['CP-016', 'PROTO_PE_AORTIC_DISSECTION'],
      ['CP-036', 'PROTO_SAFETY_NET_CLINICAL_CONCERN'],
      ['CP-037', 'PROTO_SAFETY_NET_CLINICAL_CONCERN'],
      ['CP-038', 'PROTO_SAFETY_NET_CLINICAL_CONCERN'],
      ['CP-044', 'PROTO_GERIATRIC_OCCULT_RISK'],
      ['CP-045', 'PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS'],
      ['CP-048', 'PROTO_NEURO_RED_FLAG'],
      ['CP-049', 'PROTO_PE_AORTIC_DISSECTION'],
      ['CP-050', 'PROTO_PE_AORTIC_DISSECTION'],
      ['CP-060', 'PROTO_CAUDA_EQUINA'],
      ['CP-070', 'PROTO_SAFETY_NET_CLINICAL_CONCERN'],
    ])('%s maps to %s', (id, expected) => {
      expect(findPattern(id)?.actionProtocolId).toBe(expected);
    });
  });

  describe('category C — gap-fill to an existing protocol', () => {
    it.each([
      ['CP-003', 'PROTO_SEPSIS'],
      ['CP-008', 'PROTO_SHOCK'],
      ['CP-020', 'PROTO_ACS'],
      ['CP-025', 'PROTO_ANAPHYLAXIS'],
      ['CP-028', 'PROTO_DKA_HHS'],
      ['CP-055', 'PROTO_SHOCK'],
      ['CP-059', 'PROTO_SEPSIS'],
      ['CP-064', 'PROTO_SEPSIS'],
    ])('%s maps to %s', (id, expected) => {
      expect(findPattern(id)?.actionProtocolId).toBe(expected);
    });
  });

  describe('category D — upgrade from generic-old to specific-new', () => {
    it.each([
      ['CP-029', 'PROTO_ASTHMA_COPD_EXACERBATION'],
      ['CP-030', 'PROTO_ASTHMA_COPD_EXACERBATION'],
      ['CP-046', 'PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS'],
      ['CP-047', 'PROTO_DENGUE_SHOCK'],
      ['CP-052', 'PROTO_ASTHMA_COPD_EXACERBATION'],
      ['CP-053', 'PROTO_ASTHMA_COPD_EXACERBATION'],
      ['CP-056', 'PROTO_OBSTETRIC_ABDOMEN_BLEEDING'],
      ['CP-058', 'PROTO_ASTHMA_COPD_EXACERBATION'],
      ['CP-067', 'PROTO_PE_AORTIC_DISSECTION'],
      ['CP-068', 'PROTO_TOX_RESP_DEPRESSION'],
      ['CP-069', 'PROTO_UPPER_AIRWAY_OBSTRUCTION'],
    ])('%s upgrades to %s', (id, expected) => {
      expect(findPattern(id)?.actionProtocolId).toBe(expected);
    });
  });

  describe('explicitly left unmapped (no protocol fits, or too mild for ABCDE escalation)', () => {
    it.each([
      'CP-031',
      'CP-033',
      'CP-034',
      'CP-035',
      'CP-039',
      'CP-040',
      'CP-041',
      'CP-042',
      'CP-062',
      'CP-063',
      'CP-065',
      'CP-066',
    ])('%s has no actionProtocolId', (id) => {
      expect(findPattern(id)?.actionProtocolId).toBeUndefined();
    });
  });
});
