import { ArrowUp, FileText, Info, Lock, ShieldCheck, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

import { LEGAL_TABS, type LegalTab } from '@/lib/legal-tabs'

const LEGAL_ICONS: Record<LegalTab, LucideIcon> = {
  disclaimer: Info,
  privacy: Lock,
  terms: FileText,
  security: ShieldCheck,
}

// Chief 2026-10-07: laid out after the Wine Diplomacy footer: a fine grid band over six guide
// lines, the tagline with a round back-to-top link, three ruled columns, a light bar, a base line.
// Legal links are plain anchors: a Next Link that only changes the hash fires no hashchange,
// so on /legal itself the tab would not switch.
export default function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="app-footer" aria-label="Footer aplikasi">
      <div className="app-footer__guides" aria-hidden="true" />
      <div className="app-footer__band" aria-hidden="true" />

      <div className="app-footer__hero">
        <p className="app-footer__tagline">See Earlier. Decide Better.</p>
        <a href="#" className="app-footer__top" aria-label="Kembali ke atas">
          <ArrowUp size={18} strokeWidth={1.75} aria-hidden />
        </a>
      </div>

      <div className="app-footer__columns">
        <div className="app-footer__column app-footer__identity">
          <img src="/sentra-mark.png" alt="" width={44} height={44} />
          <div>
            <p className="app-footer__heading">MedBoard</p>
            <p className="app-footer__text">
              Dibangun oleh Sentra untuk puskesmas
              <br />
              Kota Kediri, Jawa Timur
            </p>
          </div>
        </div>

        <div className="app-footer__column">
          <p className="app-footer__heading">Tanggung jawab klinis</p>
          <p className="app-footer__text">
            AI di MedBoard memberi saran. Keputusan klinis tetap menjadi tanggung jawab tenaga kesehatan yang
            merawat pasien.
          </p>
          <a href="/legal#disclaimer" className="app-footer__underline">
            Baca disclaimer AI
          </a>
        </div>

        <nav className="app-footer__column" aria-label="Dokumen legal">
          <p className="app-footer__heading">Legal</p>
          <ul className="app-footer__legal">
            {LEGAL_TABS.map((tab) => {
              const Icon = LEGAL_ICONS[tab.key]
              return (
                <li key={tab.key}>
                  <a href={`/legal#${tab.key}`}>
                    <span className="app-footer__icon">
                      <Icon size={14} strokeWidth={2} aria-hidden />
                    </span>
                    {tab.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      <div className="app-footer__bar" aria-hidden="true" />

      <div className="app-footer__base">
        <span className="app-footer__base-start">
          <span>© {year} Sentra Healthcare Solutions</span>
          <span className="app-footer__dot" aria-hidden="true" />
          <Link href="/hub" className="app-footer__underline">Sentra Hub</Link>
        </span>
        <a href="https://sentrahai.com/" target="_blank" rel="noopener noreferrer" className="app-footer__underline">sentrahai.com</a>
      </div>
    </footer>
  )
}
