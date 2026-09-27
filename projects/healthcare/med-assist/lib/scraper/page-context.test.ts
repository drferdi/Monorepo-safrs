import { describe, expect, it } from 'vitest';

import {
  extractClinicalContextFromDocument,
  extractPatientInfoFromDocument,
  extractTenagaMedisFromDocument,
} from '@/lib/scraper/page-context';

describe('page context extractors', () => {
  it('extracts patient info from live-like ePuskesmas text blocks', () => {
    document.body.innerHTML = `
      <div>
        Nama : Ny. Siti Aminah
        RM : 00001033231
        Usia : 34 tahun
        Jenis Kelamin : Perempuan
        Kelurahan : Balowerti
        BPJS : Aktif
        Tgl Lahir : 13-08-1991
      </div>
    `;

    expect(extractPatientInfoFromDocument(document)).toEqual({
      name: 'Ny. Siti Aminah',
      gender: 'P',
      age: 34,
      ageParsed: true,
      rm: '00001033231',
      bpjsStatus: 'aktif',
      kelurahan: 'Balowerti',
      dob: '13-08-1991',
    });
  });

  it('extracts patient info from the "Data Pasien" table, one label per row (synthetic values)', () => {
    const rows = [
      ['ID Pelayanan', '11111'],
      ['No. eRM', '00000001'],
      ['No. RM Lama', '12345'],
      ['No. Dokumen RM', ''],
      ['Nama KK', 'CONTOH KK'],
      ['Nama', 'PASIEN CONTOH'],
      ['Jenis Kelamin', 'Perempuan'],
      ['Umur', '46 Thn 0 Bln 0 Hr'],
    ];
    document.body.innerHTML = `<table>${rows
      .map(([label, value]) => `<tr><td>${label}</td><td>:</td><td>${value}</td></tr>`)
      .join('')}</table>`;
    // jsdom has no layout, so give the body Chrome's innerText for a table: tabs between cells,
    // newlines between rows.
    Object.defineProperty(document.body, 'innerText', {
      configurable: true,
      value: rows.map(([label, value]) => `${label}\t:\t${value}`).join('\n'),
    });

    try {
      expect(extractPatientInfoFromDocument(document)).toMatchObject({
        name: 'PASIEN CONTOH',
        rm: '00000001',
        age: 46,
        ageParsed: true,
        gender: 'P',
      });
    } finally {
      Reflect.deleteProperty(document.body, 'innerText');
    }
  });

  it('marks empty-page extracts as unreliable (ageParsed false, blank identity)', () => {
    document.body.innerHTML = `<div class="login">Silakan masuk</div>`;

    expect(extractPatientInfoFromDocument(document)).toEqual({
      name: '',
      gender: 'L',
      age: 0,
      ageParsed: false,
      rm: '',
      bpjsStatus: null,
      kelurahan: '',
      dob: '',
    });
  });

  it('extracts clinical context from live-like labeled rows', () => {
    document.body.innerHTML = `
      <table>
        <tr><td>Nama Faskes</td><td>Puskesmas Balowerti</td></tr>
        <tr><td>Status BPJS</td><td>BPJS Aktif</td></tr>
        <tr><td>Penyakit Khusus</td><td>Kehamilan, Obesitas</td></tr>
        <tr><td>Risiko Kehamilan</td><td>Risiko tinggi trimester 3</td></tr>
        <tr><td>Riwayat Alergi</td><td>Alergi obat, debu</td></tr>
        <tr><td>Status Hamil</td><td>Hamil</td></tr>
      </table>
    `;

    expect(extractClinicalContextFromDocument(document)).toEqual({
      facilityName: 'Puskesmas Balowerti',
      payerLabel: 'BPJS Aktif',
      specialConditions: ['Kehamilan', 'Obesitas'],
      pregnancyRisk: 'Risiko tinggi trimester 3',
      allergies: ['Debu', 'Obat'],
      pregnancyStatus: true,
    });
  });

  it('does not treat table headers as special clinical conditions', () => {
    document.body.innerHTML = `
      <table>
        <tr><td>Penyakit Khusus</td><td>Warna icdx Penyakit</td></tr>
      </table>
    `;

    expect(extractClinicalContextFromDocument(document).specialConditions).toEqual([]);
  });

  it('does not treat ICD diagnosis rows as special clinical conditions', () => {
    document.body.innerHTML = `
      <table>
        <tr><td>Penyakit Khusus</td><td>Warna icdx Penyakit E10 Insulin-dependent diabetes mellitus</td></tr>
      </table>
    `;

    expect(extractClinicalContextFromDocument(document).specialConditions).toEqual([]);
  });

  it('extracts tenaga medis from DOM inputs and persists them to storage', () => {
    document.body.innerHTML = `
      <input name="dokter_nama_bpjs" value="dr. Ferdi Iskandar" />
      <input name="perawat_nama" value="Dian Sunardi" />
    `;

    const result = extractTenagaMedisFromDocument(document);

    expect(result).toMatchObject({
      dokterNama: 'dr. Ferdi Iskandar',
      perawatNama: 'Dian Sunardi',
    });
    expect(result.source).toEqual(
      expect.arrayContaining(['dom-input:dokter', 'dom-input:perawat'])
    );
    expect(window.localStorage.getItem('epuskesmas_doctor_name')).toBe('dr. Ferdi Iskandar');
    expect(window.localStorage.getItem('epuskesmas_nurse_name')).toBe('Dian Sunardi');
  });

  it('falls back to storage snapshot when tenaga medis fields are absent', () => {
    window.localStorage.setItem(
      'sentra_tenaga_medis',
      JSON.stringify({
        dokterNama: 'dr. Fallback',
        perawatNama: 'Perawat Fallback',
      })
    );
    document.body.innerHTML = `<div class="empty">tanpa field tenaga medis</div>`;

    const result = extractTenagaMedisFromDocument(document);

    expect(result).toMatchObject({
      dokterNama: 'dr. Fallback',
      perawatNama: 'Perawat Fallback',
    });
    expect(result.source).toEqual(expect.arrayContaining(['storage:dokter', 'storage:perawat']));
  });
});
