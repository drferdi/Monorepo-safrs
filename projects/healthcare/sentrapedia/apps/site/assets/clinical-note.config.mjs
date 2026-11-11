// Fictional adult case for physician review; not a treatment recommendation.
export const clinicalNote = {
  title: 'Catatan klinis / pasien contoh',
  patient: 'Laki-laki, 24 th',
  status: 'Kasus fiktif · perlu tinjauan dokter',
  authors: { doctor: 'dr Ferdi Iskandar', sentrapedia: 'Sentrapedia' },
  source: {
    title: 'PNPK 2020 Tata Laksana Infeksi Dengue Pada Dewasa',
    url: 'https://kemkes.go.id/app_asset/file_content_download/17001183546555bf5250af30.46055725.pdf',
    note: 'Contoh DBD: trombosit turun dan hematokrit naik 20%; rawat dengan pemantauan. Coretan menunjukkan prioritas diagnosis, bukan kepastian menyingkirkan penyakit lain.'
  },
  rows: [
    { label: '01 / Anamnesis', lines: [
      { author: 'doctor', text: 'Demam 4 hari, nyeri kepala, mual.' },
      { author: 'sentrapedia', text: '+ Digali: nyeri perut, muntah, perdarahan. Gusi berdarah.' }
    ] },
    { label: '02 / Pemeriksaan', lines: [
      { author: 'doctor', text: 'TD 110/70. Trombosit 75.000/µL. Ht 40 → 48%. NS1 positif.' }
    ] },
    { label: '03 / Diagnosis banding', lines: [
      { author: 'sentrapedia', differentials: ['DBD', 'Demam tifoid', 'Malaria', 'Leptospirosis'] }
    ] },
    { label: '04 / Diagnosis kerja', lines: [
      { author: 'doctor', text: 'Demam berdarah dengue, tanpa syok.' },
      { author: 'sentrapedia', text: 'Trombosit turun, hematokrit meningkat. Banding tetap dievaluasi.' }
    ] },
    { label: '05 / Terapi', lines: [
      { author: 'doctor', text: 'Cairan kristaloid terpantau, parasetamol.' },
      { author: 'sentrapedia', text: 'Pantau hemodinamik, diuresis, hematokrit.' }
    ] },
    { label: '06 / Keputusan', lines: [
      { author: 'doctor', decision: 'Rawat', text: '— rujuk bila pemantauan tidak tersedia.' }
    ] }
  ]
};
