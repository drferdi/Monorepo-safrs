// Critical Mind is the library of dr. Ferdi Iskandar's thinking (Chief 2026-10-07).
// Source: github.com/drferdi/MyMindMemory, publications/ (snapshot 7faa9ce, 2026-06-13).
// A new writing there is added here by hand.

export const MY_MIND_MEMORY_URL = 'https://github.com/drferdi/MyMindMemory'

export interface CriticalMindEntry {
  kind: 'Hipotesis' | 'Kerangka' | 'Arsip'
  title: string
  published: string
  type: string
  doi: string
  description: string
  topics: string[]
}

export const CRITICAL_MIND_LIBRARY: CriticalMindEntry[] = [
  {
    kind: 'Arsip',
    title: 'Ferdi Iskandar Mind & Memory — Initial Archive',
    published: '13 Juni 2026',
    type: 'Arsip perangkat lunak (v0.1.0)',
    doi: '10.5281/zenodo.20677057',
    description:
      'Rilis pertama repositori MyMindMemory yang diberi DOI: cara berpikir, keputusan, pelajaran, visi, dan nilai dicatat dalam arsip berversi, sehingga pemikiran itu sendiri ikut menjadi catatan ilmiah yang bisa disitasi.',
    topics: ['Arsip pengetahuan pribadi', 'Open science', 'Pemikiran berversi'],
  },
  {
    kind: 'Hipotesis',
    title:
      'The Adaptive Engram Migration Hypothesis: Possession Trance as a Culturally Scripted Dissociative Cascade in Neuro-Cultural Stress Responses',
    published: '11 Juni 2026',
    type: 'Working paper',
    doi: '10.5281/zenodo.20646120',
    description:
      'Membaca kesurupan sebagai kaskade disosiatif yang dibentuk budaya: beban psikososial yang berlebihan melepaskan pola memori dan emosi dari jaringan diri utama, lalu mengekspresikannya lewat skema identitas yang dikenal dan diterima masyarakat. Mekanisme ini dipandang adaptif, bukan semata patologi.',
    topics: ['Kesurupan', 'Dissociative Trance Disorder', 'Default Mode Network', 'Psikiatri budaya'],
  },
  {
    kind: 'Kerangka',
    title:
      'A Mechanistic Framework for the Clinical Trajectory System in the Context of Indonesian Healthcare Delivery',
    published: '9 Juni 2026',
    type: 'Preprint',
    doi: '10.5281/zenodo.20604965',
    description:
      'Clinical Trajectory System: lapisan AI yang terus membandingkan perjalanan klinis pasien dengan basis pengetahuan terverifikasi dan memberi tahu dokter saat penyimpangannya melewati ambang aman. Gagasan intinya, kesalahan diagnosis lebih sering lahir dari penilaian satu potret sesaat daripada dari kurangnya pengetahuan.',
    topics: ['Clinical Trajectory System', 'SATUSEHAT', 'FHIR R4', 'Keselamatan pasien'],
  },
  {
    kind: 'Hipotesis',
    title:
      'Adaptive Engram Migration as a Trigger for Transient Auditory Hallucinations in the Aging Brain: A Proposed Mechanistic Hypothesis',
    published: '8 Juni 2026',
    type: 'Preprint',
    doi: '10.5281/zenodo.20589509',
    description:
      'Hipotesis pertama Adaptive Engram Migration: halusinasi auditori sesaat pada otak yang menua diusulkan muncul dari perpindahan jejak memori saat proses rekonsolidasi, dibaca melalui kerangka predictive coding.',
    topics: ['Neurosains', 'Halusinasi auditori', 'Rekonsolidasi memori', 'Predictive coding', 'Penuaan'],
  },
]
