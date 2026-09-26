export const SYNTHETIC_DATA_GUARDRAIL =
  'Hanya gunakan data sintetis. Jangan masukkan identitas pasien atau PHI.' as const

export const UI_COPY = {
  navigation: {
    search: 'Cari navigasi',
    resources: 'Sumber daya',
    history: 'Riwayat',
    notifications: 'Notifikasi',
    settings: 'Pengaturan',
    ready: 'Siap',
    logout: 'Keluar dari ruang kerja',
  },
  actions: {
    cancel: 'Batal',
    delete: 'Hapus',
    retry: 'Coba lagi',
    search: 'Cari',
  },
  states: {
    loading: 'Memuat…',
    unavailable: 'Tidak tersedia',
    completed: 'Selesai',
    failed: 'Gagal',
  },
} as const

export type UiCopy = typeof UI_COPY
