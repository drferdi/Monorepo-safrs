import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SentraWiki — Kepatuhan & Arsitektur Medis',
  description:
    'Dokumentasi komprehensif arsitektur teknologi, kepatuhan HIPAA/Zero PHI, dan sistem rekam jejak audit trail klinis Sentra AI.',
  alternates: {
    canonical: '/sentrawiki',
  },
}

export default function SentraWikiLayout({ children }: { children: React.ReactNode }) {
  return children
}
