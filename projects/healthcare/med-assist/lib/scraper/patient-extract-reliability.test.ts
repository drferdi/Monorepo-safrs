import { describe, expect, it } from 'vitest';

import {
  isReliablePatientExtract,
  PATIENT_EXTRACT_FAILURE_MESSAGE,
} from '@/lib/scraper/patient-extract-reliability';

describe('isReliablePatientExtract', () => {
  it('rejects empty / default OCR payloads (age:0 without identity)', () => {
    expect(
      isReliablePatientExtract({
        name: '',
        rm: '',
        age: 0,
        ageParsed: false,
      })
    ).toBe(false);
  });

  it('rejects name+rm with unparsed age:0 (failed OCR infant false-positive gate)', () => {
    expect(
      isReliablePatientExtract({
        name: 'Tn. Budi',
        rm: 'RM-1',
        age: 0,
        ageParsed: false,
      })
    ).toBe(false);
  });

  it('accepts a real infant when Umur was parsed as 0', () => {
    expect(
      isReliablePatientExtract({
        name: 'By. Siti',
        rm: 'RM-9',
        age: 0,
        ageParsed: true,
      })
    ).toBe(true);
  });

  it('accepts legacy payloads with age > 0 even without ageParsed', () => {
    expect(
      isReliablePatientExtract({
        name: 'Tn. Budi',
        rm: 'RM-77',
        age: 45,
      })
    ).toBe(true);
  });

  it('exports a clinician-facing failure message', () => {
    expect(PATIENT_EXTRACT_FAILURE_MESSAGE).toMatch(/OCR gagal/i);
    expect(PATIENT_EXTRACT_FAILURE_MESSAGE).toMatch(/Triage ditahan/i);
  });
});
