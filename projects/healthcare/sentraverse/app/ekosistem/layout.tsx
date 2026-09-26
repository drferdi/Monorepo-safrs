import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ekosistem Modul & Produk',
  description:
    'Jelajahi platform kecerdasan klinis modular Sentra AI. Temukan modul pendukung keputusan klinis, rekam medis terintegrasi, dan asisten keputusan medis di Indonesia.',
  alternates: {
    canonical: '/ekosistem',
  },
}

export default function EkosistemLayout({ children }: { children: React.ReactNode }) {
  return children
}
