import { afterEach, describe, expect, it } from 'vitest';

import { scrapeAnamnesa } from './anamnesa';

// PeriksaFisik fields of the ePuskesmas anamnesa page (the same names lib/handlers/page-anamnesa.ts fills).
const anamnesaPage = `
  <div id="form-anamnesa-container">
    <textarea name="keluhan_utama">Sesak napas</textarea>
    <input name="PeriksaFisik[sistole]" value="130" />
    <input name="PeriksaFisik[diastole]" value="85" />
    <input name="PeriksaFisik[detak_nadi]" value="104" />
    <input name="PeriksaFisik[nafas]" value="24" />
    <input name="PeriksaFisik[suhu]" value="37.9" />
    <input name="PeriksaFisik[saturasi]" value="91" />
  </div>
`;

describe('scrapeAnamnesa vital signs', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reads the oxygen saturation from the anamnesa page', async () => {
    document.body.innerHTML = anamnesaPage;

    const result = await scrapeAnamnesa();

    expect(result.vital_signs?.saturasi).toBe(91);
  });
});
