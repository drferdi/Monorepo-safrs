import { describe, expect, it } from 'vitest';

import { scanMedicalHistoryFromRoot } from '@/lib/scraper/medical-history';

describe('scanMedicalHistoryFromRoot', () => {
  it('extracts chronic diseases from live-like penyakit kronis banner and riwayat table', () => {
    document.body.innerHTML = `
      <div>
        <label>Penyakit Kronis</label>
        <div>Diabetes Mellitus</div>
      </div>
      <table>
        <tr>
          <td>Riwayat Penyakit Sekarang</td>
          <td>Pasien memiliki hiperten si sejak lama.</td>
          <td>18-04-2026</td>
        </tr>
        <tr>
          <td>Riwayat Penyakit Dulu</td>
          <td>Riwayat penyakit kronis: DM.</td>
          <td>18-04-2026</td>
        </tr>
      </table>
    `;

    const result = scanMedicalHistoryFromRoot(document);

    expect(result.history).toEqual([
      {
        code: 'DIRECT_DM',
        description: 'Diabetes Mellitus',
        shortLabel: 'DM',
      },
      {
        code: 'DIRECT_HT',
        description: 'Pasien memiliki hiperten si sejak lama.',
        shortLabel: 'HT',
      },
    ]);
  });

  it('deduplicates direct and ICD-derived chronic history labels', () => {
    document.body.innerHTML = `
      <div>
        <label>Penyakit Kronis</label>
        <div>Diabetes Mellitus</div>
      </div>
      <table id="tabel_detail_warna_penyakit">
        <tr>
          <td>No</td>
          <td>ICD</td>
          <td>Nama</td>
        </tr>
        <tr>
          <td>1</td>
          <td>E11</td>
          <td>Non-insulin-dependent diabetes mellitus</td>
        </tr>
      </table>
    `;

    const result = scanMedicalHistoryFromRoot(document);

    expect(result.history).toHaveLength(1);
    expect(result.history[0]).toMatchObject({
      code: 'DIRECT_DM',
      shortLabel: 'DM',
    });
  });
});
