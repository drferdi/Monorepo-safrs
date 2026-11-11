import { describe, expect, it } from 'vitest';

import { scanVitalSignsFromRoot } from '@/lib/scraper/vital-signs';

describe('scanVitalSignsFromRoot', () => {
  it('reads all 7 vitals when every RME field is filled', () => {
    document.body.innerHTML = `
      <input id="sistole" value="180" />
      <input id="diastole" value="110" />
      <input id="detak-nadi" value="98" />
      <input name="PeriksaFisik[nafas]" value="22" />
      <input id="suhu" value="39.2" />
      <input id="gula-darah" value="140" />
      <input name="PeriksaFisik[saturasi]" value="96" />
    `;

    expect(scanVitalSignsFromRoot(document)).toEqual({
      sbp: '180',
      dbp: '110',
      hr: '98',
      rr: '22',
      temp: '39.2',
      glucose: '140',
      spo2: '96',
    });
  });

  it('omits fields that are empty or missing from the page', () => {
    document.body.innerHTML = `
      <input id="sistole" value="120" />
      <input id="diastole" value="" />
    `;

    expect(scanVitalSignsFromRoot(document)).toEqual({ sbp: '120' });
  });

  it('returns an empty object when no vital inputs exist on the page', () => {
    document.body.innerHTML = `<div>Halaman kosong</div>`;

    expect(scanVitalSignsFromRoot(document)).toEqual({});
  });

  it('falls back to the alternate name selector when the id is absent', () => {
    document.body.innerHTML = `<input name="PeriksaFisik[sistole]" value="150" />`;

    expect(scanVitalSignsFromRoot(document)).toEqual({ sbp: '150' });
  });
});
