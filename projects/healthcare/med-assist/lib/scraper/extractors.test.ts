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

  // Chief, 2026-10-02 ("Pengisian dosis salah"): the riwayat's "Terapi Obat" is free text without a
  // signa ("NAC, CTM"); the same modal's Resep table holds each medication's signa and aturan pakai
  // (read live, names masked, 2026-10-02). The ePuskesmas modal shows the table twice.
  it('reads the riwayat Resep table, with each signa and aturan pakai, as the visit therapy', () => {
    const resepTable = (withPermintaan: boolean) => `
      <table>
        <tr><td>Nama Obat</td><td>Jumlah</td><td>Signa</td><td>Racikan</td>${withPermintaan ? '<td>Jumlah Permintaan</td>' : ''}<td>Aturan Pakai</td><td>Keterangan</td></tr>
        <tr><td>N-asetilsistein kapsul 200 mg</td><td>6</td><td>2x1</td><td></td>${withPermintaan ? '<td></td>' : ''}<td>Sesudah Makan</td><td>Batuk</td></tr>
        <tr><td>Klorfeniramin Maleat ( CTM ) tablet 4 mg</td><td>6</td><td>2x1</td><td></td>${withPermintaan ? '<td></td>' : ''}<td>Sesudah Makan</td><td>Pilek</td></tr>
        <tr><td>Parasetamol sirup 120 mg/ 5 ml</td><td>1</td><td>3X1,5</td><td></td>${withPermintaan ? '<td></td>' : ''}<td>Sebelum Makan</td><td>Demam, nyeri</td></tr>
      </table>`;
    document.body.innerHTML = LIVE_RIWAYAT_HTML.replace('e uai advi dokter', 'NAC, CTM').replace(
      '</div>',
      `${resepTable(true)}${resepTable(false)}</div>`
    );

    const result = extractVisitFromRoot(document, '69915', '2026-03-25');

    expect(result?.terapi_obat).toBe(
      'N-asetilsistein kapsul 200 mg 2x1 Sesudah Makan; ' +
        'Klorfeniramin Maleat ( CTM ) tablet 4 mg 2x1 Sesudah Makan; ' +
        'Parasetamol sirup 120 mg/ 5 ml 3X1.5 Sebelum Makan'
    );
  });
});
