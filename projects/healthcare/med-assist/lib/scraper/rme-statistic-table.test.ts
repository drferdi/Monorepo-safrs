import { describe, expect, it } from 'vitest';

import { RME_STATISTIC_PAGES } from './rme-statistic-mapping';
import { extractMappedTableRows, extractNextPaginationUrl } from './rme-statistic-table';

describe('rme statistic table extractor', () => {
  it('extracts queue statistic rows from pendaftaran table', () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td>1</td><td>ID</td><td>26-06-2026</td><td>REG-001</td><td>RM001 John Doe</td>
            <td>Hipertensi</td><td>Poli Umum</td><td>dr. Sinta</td><td>BPJS</td>
            <td>Belum Bayar</td><td>Aktif</td><td>Baru</td><td>Menunggu</td><td>Cetak</td>
          </tr>
        </tbody>
      </table>
    `;

    const rows = extractMappedTableRows(
      document,
      RME_STATISTIC_PAGES.pendaftaran.rowSelector,
      RME_STATISTIC_PAGES.pendaftaran.columns
    );

    expect(rows[0]?.ruanganDaftar).toBe('Poli Umum');
    expect(rows[0]?.statusPelayanan).toBe('Menunggu');
  });

  it('extracts referral rows from rujukanexternal table', () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td>1</td><td>26-06-2026</td><td>dr. Sinta</td><td>Ns. Eka</td><td>ERM</td><td>NIK</td>
            <td>John Doe</td><td>L</td><td>Kediri, 1990-01-01</td><td>36 th</td>
            <td>RSUD Gambiran</td><td>Penyakit Dalam</td><td>BPJS</td><td>RJ-1</td>
          </tr>
        </tbody>
      </table>
    `;

    const rows = extractMappedTableRows(
      document,
      RME_STATISTIC_PAGES.rujukanexternal.rowSelector,
      RME_STATISTIC_PAGES.rujukanexternal.columns
    );

    expect(rows[0]?.rsTujuanRujukan).toBe('RSUD Gambiran');
  });

  it('extracts stock rows from stokobat table', () => {
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td>1</td><td>KD1</td><td>Analgesik</td><td>Paracetamol 500 mg</td><td>8</td><td>BC</td>
            <td>DAK</td><td>Industri</td><td>PBF</td><td>B1</td><td>1000</td><td>1500</td><td>12000</td>
            <td>2026</td><td>01-08-2026</td><td>Balowerti</td><td>Farmasi Umum</td>
          </tr>
        </tbody>
      </table>
    `;

    const rows = extractMappedTableRows(
      document,
      RME_STATISTIC_PAGES.stokobat.rowSelector,
      RME_STATISTIC_PAGES.stokobat.columns
    );

    expect(rows[0]?.namaObat).toBe('Paracetamol 500 mg');
  });

  it('extracts the next pagination url', () => {
    document.body.innerHTML = `
      <ul class="pagination">
        <li><a href="/pendaftaran?page=1">1</a></li>
        <li class="active"><a href="/pendaftaran?page=2">2</a></li>
        <li><a href="/pendaftaran?page=3">3</a></li>
      </ul>
    `;

    expect(
      extractNextPaginationUrl(document, 'https://kotakediri.epuskesmas.id/pendaftaran?page=2')
    ).toBe('https://kotakediri.epuskesmas.id/pendaftaran?page=3');
  });
});
