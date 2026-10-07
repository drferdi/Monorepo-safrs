import { ArrowRight, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

import { LEGAL_TABS } from '@/lib/legal-tabs'

// Chief 2026-10-07: laid out after the Inversa footer: three framed columns, the MedBoard
// wordmark across the full width, then one base line.
// Legal links are plain anchors: a Next Link that only changes the hash fires no hashchange,
// so on /legal itself the tab would not switch.
export default function AppFooter() {
  const year = new Date().getFullYear()
  const privacy = LEGAL_TABS.find((tab) => tab.key === 'privacy')
  const legalLinks = LEGAL_TABS.filter((tab) => tab.key !== 'privacy')

  return (
    <footer className="app-footer" aria-label="Footer aplikasi">
      <div className="app-footer__frame">
        <div className="app-footer__grid">
          <div className="app-footer__cell">
            <p className="app-footer__heading">Tentang</p>
            <p className="app-footer__lead">Sistem informasi klinis untuk puskesmas, dengan dukungan AI untuk tenaga kesehatan.</p>
            <div className="app-footer__end">
              <p className="app-footer__small">
                Keputusan klinis tetap menjadi tanggung jawab tenaga kesehatan yang merawat pasien.
              </p>
              <a href="/legal#disclaimer" className="app-footer__more">
                Baca disclaimer AI
                <ArrowUpRight size={14} strokeWidth={2} aria-hidden />
              </a>
            </div>
          </div>

          <nav className="app-footer__cell" aria-label="Dokumen legal">
            <p className="app-footer__heading">Legal</p>
            <ul className="app-footer__links">
              {legalLinks.map((tab) => (
                <li key={tab.key}>
                  <a href={`/legal#${tab.key}`}>{tab.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="app-footer__cell">
            <p className="app-footer__heading">Sentra</p>
            <Link href="/hub" className="app-footer__field">
              Buka Sentra Hub
              <ArrowRight size={16} strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </div>

        <p className="app-footer__mark" aria-hidden="true">MedBoard</p>
      </div>

      <div className="app-footer__base">
        <span>© {year} Sentra Healthcare Solutions</span>
        {privacy && <a href={`/legal#${privacy.key}`}>{privacy.label}</a>}
        <a href="https://sentrahai.com/" target="_blank" rel="noopener noreferrer">
          Dikembangkan oleh Sentra
          <ArrowUpRight size={14} strokeWidth={2} aria-hidden />
        </a>
      </div>
    </footer>
  )
}
