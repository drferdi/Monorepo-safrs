// ─── ICD-10 mapping untuk penyakit terbanyak di Puskesmas Indonesia ───────────
// Source: Panduan Praktik Klinis Dokter di FKTP (Kemenkes 2014/2017)

export interface IcdEntry {
  code: string
  name: string
  category: 'rawat-jalan' | 'rawat-inap' | 'rujuk'
}

export const ICD_MAP: Record<string, IcdEntry> = {
  // Infeksi Saluran Napas
  'J06.9': { code: 'J06.9', name: 'ISPA Akut', category: 'rawat-jalan' },
  J00: {
    code: 'J00',
    name: 'Nasofaringitis Akut (Pilek)',
    category: 'rawat-jalan',
  },
  J06: {
    code: 'J06',
    name: 'Infeksi Sal. Napas Atas Akut',
    category: 'rawat-jalan',
  },
  'J18.9': { code: 'J18.9', name: 'Pneumonia', category: 'rujuk' },
  'J20.9': { code: 'J20.9', name: 'Bronkitis Akut', category: 'rawat-jalan' },
  J45: { code: 'J45', name: 'Asma', category: 'rawat-jalan' },

  // Hipertensi & Kardiovaskular
  I10: { code: 'I10', name: 'Hipertensi Esensial', category: 'rawat-jalan' },
  I11: { code: 'I11', name: 'Hipertensi dengan PJK', category: 'rujuk' },
  'I50.9': { code: 'I50.9', name: 'Gagal Jantung', category: 'rujuk' },

  // Diabetes
  E11: {
    code: 'E11',
    name: 'Diabetes Melitus Tipe 2',
    category: 'rawat-jalan',
  },
  'E11.9': {
    code: 'E11.9',
    name: 'DM Tipe 2 tanpa Komplikasi',
    category: 'rawat-jalan',
  },
  E14: { code: 'E14', name: 'Diabetes Melitus NOS', category: 'rawat-jalan' },

  // Gangguan Pencernaan
  'K29.7': { code: 'K29.7', name: 'Gastritis', category: 'rawat-jalan' },
  'K21.9': { code: 'K21.9', name: 'GERD', category: 'rawat-jalan' },
  A09: { code: 'A09', name: 'Diare Akut', category: 'rawat-jalan' },
  'K59.1': { code: 'K59.1', name: 'Diare Fungsional', category: 'rawat-jalan' },
  'A01.0': { code: 'A01.0', name: 'Demam Tifoid', category: 'rawat-inap' },

  // Infeksi Lain
  A90: { code: 'A90', name: 'Dengue Fever', category: 'rawat-inap' },
  A91: { code: 'A91', name: 'Dengue Hemorrhagic Fever', category: 'rujuk' },
  'B50.9': { code: 'B50.9', name: 'Malaria', category: 'rawat-inap' },
  'A16.9': {
    code: 'A16.9',
    name: 'Tuberkulosis Paru',
    category: 'rawat-jalan',
  },

  // Muskuloskeletal
  'M79.3': { code: 'M79.3', name: 'Mialgia', category: 'rawat-jalan' },
  'M54.5': {
    code: 'M54.5',
    name: 'Nyeri Punggung Bawah',
    category: 'rawat-jalan',
  },
  'M10.9': { code: 'M10.9', name: 'Gout Artritis', category: 'rawat-jalan' },

  // Kulit
  'L30.9': { code: 'L30.9', name: 'Dermatitis NOS', category: 'rawat-jalan' },
  'B35.9': { code: 'B35.9', name: 'Tinea', category: 'rawat-jalan' },
  'L50.9': { code: 'L50.9', name: 'Urtikaria', category: 'rawat-jalan' },

  // Mata & THT
  'H10.9': { code: 'H10.9', name: 'Konjungtivitis', category: 'rawat-jalan' },
  'H66.9': { code: 'H66.9', name: 'Otitis Media', category: 'rawat-jalan' },
  'J02.9': { code: 'J02.9', name: 'Faringitis Akut', category: 'rawat-jalan' },
  'J03.9': { code: 'J03.9', name: 'Tonsilitis Akut', category: 'rawat-jalan' },

  // Neurologi & Psikiatri
  'G43.9': { code: 'G43.9', name: 'Migrain', category: 'rawat-jalan' },
  R51: { code: 'R51', name: 'Sakit Kepala', category: 'rawat-jalan' },
  'F41.1': {
    code: 'F41.1',
    name: 'Gangguan Ansietas',
    category: 'rawat-jalan',
  },

  // Urologi
  'N39.0': { code: 'N39.0', name: 'ISK', category: 'rawat-jalan' },
  'N20.0': { code: 'N20.0', name: 'Batu Ginjal', category: 'rujuk' },

  // Anak
  'A08.0': {
    code: 'A08.0',
    name: 'Gastroenteritis Rotavirus',
    category: 'rawat-jalan',
  },
  'P07.3': { code: 'P07.3', name: 'Bayi Prematur', category: 'rujuk' },

  // Lain-lain
  'Z00.0': { code: 'Z00.0', name: 'Pemeriksaan Umum', category: 'rawat-jalan' },
  Z34: {
    code: 'Z34',
    name: 'Pengawasan Kehamilan Normal',
    category: 'rawat-jalan',
  },
  'R50.9': { code: 'R50.9', name: 'Demam NOS', category: 'rawat-jalan' },
  R05: { code: 'R05', name: 'Batuk', category: 'rawat-jalan' },
}

// Cari entry ICD — toleran terhadap prefix match (misal "J06" match "J06.9")
export function lookupIcd(code: string): IcdEntry | null {
  const clean = code.trim().toUpperCase()
  if (ICD_MAP[clean]) return ICD_MAP[clean]
  // prefix match
  const found = Object.values(ICD_MAP).find(
    e => clean.startsWith(e.code) || e.code.startsWith(clean)
  )
  return found ?? null
}

export function categorizeIcd(code: string): IcdEntry['category'] {
  return lookupIcd(code)?.category ?? 'rawat-jalan'
}

export function getIcdName(code: string): string {
  return lookupIcd(code)?.name ?? code
}
