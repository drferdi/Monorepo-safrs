import { describe, expect, it } from 'vitest';

import { extractVisitFromRoot } from '@/lib/scraper/extractors';

const LIVE_RIWAYAT_HTML = `
  <div class="modal-content">
    <table>
      <tr>
        <td>Keluhan Utama</td>
        <td>:</td>
        <td>kontrol rujukan</td>
        <td>Keluhan Tambahan</td>
        <td>:</td>
        <td>kontrol rujukan</td>
      </tr>
      <tr>
        <td>Si tole</td>
        <td>:</td>
        <td>173 mm</td>
        <td>Suhu</td>
        <td>:</td>
        <td>°C</td>
      </tr>
      <tr>
        <td>Dia tole</td>
        <td>:</td>
        <td>98 Hg</td>
        <td>Detak Jantung</td>
        <td>:</td>
        <td>REGULAR</td>
      </tr>
      <tr>
        <td>Detak Nadi</td>
        <td>:</td>
        <td>100 /menit</td>
        <td>Mandi</td>
        <td>:</td>
        <td></td>
      </tr>
      <tr>
        <td>Nafa</td>
        <td>:</td>
        <td>20 /menit</td>
        <td>Berpakaian</td>
        <td>:</td>
        <td></td>
      </tr>
      <tr>
        <td>ID Diagno a</td>
        <td>:</td>
        <td>69261</td>
        <td>ICD-X</td>
        <td>:</td>
        <td>I20</td>
      </tr>
      <tr>
        <td>Tanggal</td>
        <td>:</td>
        <td>25-03-2026 10:04:07</td>
        <td>Diagno a</td>
        <td>:</td>
        <td>Angina pectori</td>
      </tr>
      <tr>
        <td>Dokter / Tenaga Medi</td>
        <td>:</td>
        <td>dr. Ferdi I kandar, S.H., M.Kn., C.LM., CMDC</td>
        <td>Perawat / Bidan / Nutri ioni t / Sanitarian</td>
        <td>:</td>
        <td>DIAN SUNARDI</td>
      </tr>
      <tr>
        <td>Terapi Obat</td>
        <td>:</td>
        <td>e uai advi dokter</td>
      </tr>
    </table>
  </div>
`;

describe('extractVisitFromRoot', () => {
  it('reads live ePuskesmas riwayat labels that drifted into split text', () => {
    document.body.innerHTML = LIVE_RIWAYAT_HTML;

    const result = extractVisitFromRoot(document, '69915', '2026-03-25');

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      encounter_id: '69915',
      date: '2026-03-25',
      vitals: {
        sbp: 173,
        dbp: 98,
        hr: 100,
        rr: 20,
        temp: 0,
        glucose: 0,
      },
      keluhan_utama: 'kontrol rujukan',
      diagnosa: {
        icd_x: 'I20',
        nama: 'Angina pectori',
      },
      terapi_obat: 'e uai advi dokter',
      dokter_penanganan: 'dr. Ferdi I kandar, S.H., M.Kn., C.LM., CMDC',
      perawat_penanganan: 'DIAN SUNARDI',
    });
  });
});
