import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

import { LEGAL_TABS } from '@/lib/legal-tabs'

// Legal links are plain anchors: a Next Link that only changes the hash fires no hashchange,
// so on /legal itself the tab would not switch.
export default function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="app-footer" aria-label="Footer aplikasi">
      <div className="app-footer__inner">
        <div className="app-footer__brand">
          <span className="app-footer__name">
            <img src="/sentra-mark.png" alt="" width={20} height={20} />
            MedBoard
          </span>
          <p className="app-footer__lead">Sistem informasi klinis untuk puskesmas.</p>
          <p className="app-footer__notice">
            Rekomendasi AI di MedBoard membantu tenaga kesehatan. Keputusan klinis tetap menjadi tanggung jawab
            tenaga kesehatan yang merawat pasien.
          </p>
        </div>

        <nav className="app-footer__col" aria-label="Dokumen legal">
          <p className="app-footer__heading">Legal</p>
          <ul>
            {LEGAL_TABS.map((tab) => (
              <li key={tab.key}>
                <a href={`/legal#${tab.key}`}>{tab.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="app-footer__col" aria-label="Sentra">
          <p className="app-footer__heading">Sentra</p>
          <ul>
            <li>
              <Link href="/hub">Sentra Hub</Link>
            </li>
            <li>
              <a href="https://sentrahai.com/" target="_blank" rel="noopener noreferrer">
                sentrahai.com
                <ExternalLink size={12} strokeWidth={2} aria-hidden />
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="app-footer__base">
        <span>© {year} Sentra Healthcare Solutions</span>
      </div>
    </footer>
  )
}
