import { describe, expect, it } from 'vitest';

import { getVitalScreeningProfile } from './vital-screening-thresholds';

describe('getVitalScreeningProfile', () => {
  it('uses pediatric thresholds for school-age children', () => {
    const profile = getVitalScreeningProfile(6);

    expect(profile.isPediatric).toBe(true);
    expect(profile.label).toBe('Anak 6-12 tahun');
    expect(profile.hypotensionSbpFloor).toBe(82);
    expect(profile.bradycardiaThreshold).toBe(70);
    expect(profile.tachycardiaThreshold).toBe(130);
    expect(profile.bradypneaThreshold).toBe(14);
    expect(profile.severeHypertensionSbp).toBe(140);
  });

  it('uses adolescent thresholds before adult cutover', () => {
    const profile = getVitalScreeningProfile(15);

    expect(profile.isPediatric).toBe(true);
    expect(profile.label).toBe('Remaja 13-17 tahun');
    expect(profile.hypotensionSbpFloor).toBe(90);
    expect(profile.bradycardiaThreshold).toBe(60);
    expect(profile.tachypneaThreshold).toBe(24);
    expect(profile.severeHypertensionDbp).toBe(100);
  });

  it('uses adult thresholds at 18 years and above', () => {
    const profile = getVitalScreeningProfile(30);

    expect(profile.isPediatric).toBe(false);
    expect(profile.isOlderAdult).toBe(false);
    expect(profile.label).toBe('Dewasa');
    expect(profile.cohort).toBe('adult');
    expect(profile.bradycardiaThreshold).toBe(50);
    expect(profile.tachycardiaThreshold).toBe(130);
    expect(profile.severeHypertensionSbp).toBe(160);
    expect(profile.severeHypertensionDbp).toBe(100);
  });

  it('clamps non-finite age to infant-like floor', () => {
    const profile = getVitalScreeningProfile(Number.NaN);

    expect(profile.cohort).toBe('infant');
    expect(profile.hypotensionSbpFloor).toBe(70);
  });

  it('switches to adult cohort at exactly 18 years', () => {
    const profile = getVitalScreeningProfile(18);

    expect(profile.cohort).toBe('adult');
    expect(profile.isPediatric).toBe(false);
  });

  it('uses older adult profile from 65 years and carries geriatric screening notes', () => {
    const profile = getVitalScreeningProfile(72);

    expect(profile.isPediatric).toBe(false);
    expect(profile.isOlderAdult).toBe(true);
    expect(profile.cohort).toBe('older_adult');
    expect(profile.label).toBe('Usia Tua (>=65 tahun)');
    expect(profile.geriatricSingleFeverThreshold).toBe(37.8);
    expect(profile.geriatricRepeatFeverThreshold).toBe(37.2);
    expect(profile.geriatricTemperatureNote).toContain('tidak adanya demam');
    expect(profile.geriatricOrthostaticNote).toContain('hipotensi ortostatik');
  });
});
