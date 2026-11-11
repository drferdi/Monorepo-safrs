export const KPI_CARDS = [
  { label: 'URGENSI KLINIS', value: 'Urgent <6 Jam', color: '#F97316' },
  { label: 'MORTALITAS PROXY', value: 'Menengah', color: '#E8A838' },
  { label: 'CONFIDENCE', value: '72%', color: 'var(--sentra-fg)' },
  { label: 'TIER REVIEW', value: 'HIGH', color: '#F97316' },
]

export const SIGNAL_BARS = [
  { label: 'Mortalitas', value: 52 },
  { label: 'Deteriorasi', value: 64 },
  { label: 'Krisis HTN', value: 72 },
  { label: 'Glikemik', value: 45 },
  { label: 'Sepsis', value: 12 },
  { label: 'Syok', value: 8 },
  { label: 'Stroke/ACS', value: 58 },
]

export const RADAR_DATA = [
  { label: 'Hemodinamik', value: 72 },
  { label: 'Infeksi', value: 12 },
  { label: 'Metabolik', value: 58 },
  { label: 'Neuro/ACS', value: 45 },
  { label: 'Deteriorasi', value: 64 },
  { label: 'Warning', value: 38 },
]

export const SURVIVAL_DATA = [
  { label: '24 jam', prob: 91.2, lower: 83.2, upper: 99.2 },
  { label: '72 jam', prob: 84.8, lower: 76.8, upper: 92.8 },
  { label: '7 hari', prob: 76.4, lower: 68.4, upper: 84.4 },
  { label: '30 hari', prob: 68.1, lower: 60.1, upper: 76.1 },
]

export const DOUGHNUT_SEGMENTS = [
  { label: 'Cadangan stabil', value: 38, color: 'rgba(120,168,132,0.88)' },
  { label: 'Perlu review', value: 28, color: 'rgba(232,168,56,0.9)' },
  { label: 'Tekanan risiko', value: 34, color: 'rgba(222,130,104,0.92)' },
]

export const HEATMAP = [
  {
    label: 'Hemodinamik',
    score: 72,
    note: 'TD, nadi, perfusi, dan potensi dekompensasi sirkulasi.',
  },
  { label: 'Infeksi / Sistemik', score: 12, note: 'Demam, napas, dan pola sepsis-like hari ini.' },
  {
    label: 'Metabolik',
    score: 58,
    note: 'Glukosa, potensi krisis metabolik, dan stabilitas umum.',
  },
  { label: 'Neuro / ACS', score: 45, note: 'Sinyal stroke atau sindrom koroner akut.' },
  { label: 'Deteriorasi Global', score: 64, note: 'Kecenderungan kondisi saat ini memburuk.' },
  { label: 'Beban Warning', score: 38, note: 'Akumulasi breach warning dan volatilitas.' },
]

export const JOURNEY = [
  {
    title: 'Triase selesai',
    detail: 'Data keluhan dan TTV hari ini sudah masuk ke engine.',
    state: 'done' as const,
  },
  {
    title: 'Dx kerja I11.9',
    detail: 'Hipertensi esensial + DM Tipe 2 tidak terkontrol.',
    state: 'done' as const,
  },
  {
    title: 'Review prognosis AI',
    detail: 'Window review 6 jam dengan urgensi urgent.',
    state: 'active' as const,
  },
  {
    title: 'Arah tindak lanjut',
    detail: 'Observasi ketat dan review ulang prioritas.',
    state: 'next' as const,
  },
]
