// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { ACTION_PROTOCOLS, getActionProtocol } from './action-protocols';

describe('action-protocols regression snapshot (existing 9, must stay untouched)', () => {
  const EXISTING_PROTOCOLS: Array<{ id: string; name: string; stepCount: number }> = [
    { id: 'PROTO_RESP_FAILURE', name: 'Gagal Napas Akut', stepCount: 9 },
    { id: 'PROTO_SHOCK', name: 'Syok', stepCount: 7 },
    { id: 'PROTO_SEPSIS', name: 'Sepsis Berat / Early Sepsis', stepCount: 7 },
    { id: 'PROTO_ANAPHYLAXIS', name: 'Anafilaksis', stepCount: 7 },
    { id: 'PROTO_ACS', name: 'ACS / Infark Miokard', stepCount: 6 },
    { id: 'PROTO_STROKE', name: 'Stroke', stepCount: 7 },
    { id: 'PROTO_DKA_HHS', name: 'DKA / HHS', stepCount: 6 },
    { id: 'PROTO_HYPOGLYCEMIA', name: 'Hipoglikemia Sedang-Berat', stepCount: 7 },
    { id: 'PROTO_CARDIAC_ARREST', name: 'Cardiac Arrest / Nyaris Henti', stepCount: 4 },
  ];

  it.each(EXISTING_PROTOCOLS)(
    '$id keeps its original name and step count',
    ({ id, name, stepCount }) => {
      const protocol = getActionProtocol(id);
      expect(protocol).toBeDefined();
      expect(protocol?.name).toBe(name);
      expect(protocol?.steps).toHaveLength(stepCount);
    }
  );

  it('none of the 9 existing protocols has a contraindications field yet', () => {
    for (const { id } of EXISTING_PROTOCOLS) {
      const protocol = getActionProtocol(id);
      expect(protocol?.contraindications).toBeUndefined();
    }
  });
});

describe('PROTO_HTN_EMERGENCY', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_HTN_EMERGENCY');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_PREECLAMPSIA_ECLAMPSIA', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_PREECLAMPSIA_ECLAMPSIA');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_DENGUE_SHOCK', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_DENGUE_SHOCK');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_ASTHMA_COPD_EXACERBATION', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_ASTHMA_COPD_EXACERBATION');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_UPPER_AIRWAY_OBSTRUCTION', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_UPPER_AIRWAY_OBSTRUCTION');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_PE_AORTIC_DISSECTION', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_PE_AORTIC_DISSECTION');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_NEURO_RED_FLAG', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_NEURO_RED_FLAG');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_CAUDA_EQUINA', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_CAUDA_EQUINA');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_OBSTETRIC_ABDOMEN_BLEEDING', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_OBSTETRIC_ABDOMEN_BLEEDING');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_TOX_RESP_DEPRESSION', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_TOX_RESP_DEPRESSION');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_GERIATRIC_OCCULT_RISK', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_GERIATRIC_OCCULT_RISK');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('PROTO_SAFETY_NET_CLINICAL_CONCERN', () => {
  it('is retrievable with non-empty steps and referralCriteria', () => {
    const protocol = getActionProtocol('PROTO_SAFETY_NET_CLINICAL_CONCERN');
    expect(protocol).toBeDefined();
    expect(protocol?.steps.length).toBeGreaterThan(0);
    expect(protocol?.referralCriteria.length).toBeGreaterThan(0);
    expect(protocol?.contraindications?.length).toBeGreaterThan(0);
  });
});

describe('ACTION_PROTOCOLS total count', () => {
  it('has exactly 22 protocols (9 existing + 13 new)', () => {
    expect(ACTION_PROTOCOLS).toHaveLength(22);
  });

  it('has no duplicate ids', () => {
    const ids = ACTION_PROTOCOLS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
