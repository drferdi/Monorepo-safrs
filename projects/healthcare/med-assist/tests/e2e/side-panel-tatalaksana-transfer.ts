/**
 * The Tatalaksana part of the payload the side panel sends with "Isi otomatis RME", as captured
 * from `ClinicalDifferential.rme-transfer.e2e.test.tsx` (J02, Amoksisilin, one education point
 * given, "Kontrol 2 minggu"). That test asserts the side panel still sends this; the synthetic
 * ePuskesmas spec sends it through the built extension. Synthetic data only.
 */
export const SIDE_PANEL_TATALAKSANA_TRANSFER = {
  anamnesa: {
    lainnya: {
      edukasi: 'Istirahat cukup, jangan bekerja/sekolah dulu hingga 24 jam bebas demam.',
      rencana_tindakan: 'Kontrol 2 minggu',
    },
  },
  diagnosa: {
    icd_x: 'J02',
    nama: 'Faringitis akut',
    jenis: 'PRIMER',
    kasus: 'BARU',
    prognosa: 'Bonam (Baik)',
    penyakit_kronis: [],
  },
  resep: {
    static: { no_resep: '', alergi: '' },
    ajax: {
      ruangan: '',
      dokter: 'dr. Ferdi Iskandar, S.H., M.Kn., C.LM., CMDC',
      perawat: 'JOSEP ARIANTO, A.Md',
    },
    medications: [
      {
        racikan: '0',
        jumlah_permintaan: 10,
        nama_obat: 'Amoksisilin kapsul/kaplet 500 mg',
        jumlah: 10,
        signa: '3x1',
        aturan_pakai: '2',
        keterangan: 'Antibiotik lini pertama faringitis bakterial',
      },
    ],
    prioritas: '0',
  },
};
