import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sentrapedia — Indeks Protokol & Penyakit Medis',
  description:
    'Kamus referensi penyakit klinis dan panduan pemetaan ICD-10 yang digunakan oleh algoritma asisten keputusan medis Sentra AI.',
}

export default function SentrapediaLayout({ children }: { children: React.ReactNode }) {
  return children
}
