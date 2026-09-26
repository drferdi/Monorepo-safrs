'use client'

import Link from 'next/link'

const FOOTER_LINK_GROUPS = [
  {
    title: 'Jelajah',
    links: [
      { href: '/emr', label: 'EMR Klinis' },
      { href: '/hub', label: 'Sentra HUB' },
      { href: '/voice', label: 'Consult Audrey' },
      { href: '/acars', label: 'Sentra Network' },
    ],
  },
  {
    title: 'Clinical Tools',
    links: [
      { href: '/icdx', label: 'Smart ICD-10' },
      { href: '/calculator', label: 'SenCall' },
      { href: '/critical-mind', label: 'Critical Mind' },
      { href: '/report', label: 'Report' },
    ],
  },
  {
    title: 'Komunikasi',
    links: [
      { href: '/chat', label: 'Team Chat' },
      { href: '/telemedicine', label: 'Telemedicine' },
      { href: '/dashboard/intelligence', label: 'Intelligence Monitor' },
    ],
  },
  {
    title: 'Legal & Governance',
    links: [
      { href: '/legal#disclaimer', label: 'Disclaimer AI' },
      { href: '/legal#privacy', label: 'Privasi Data' },
      { href: '/legal#terms', label: 'Ketentuan Penggunaan' },
      { href: '/legal#security', label: 'Keamanan Informasi' },
    ],
  },
]

export default function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="app-footer" aria-label="Footer aplikasi">
      <div className="app-footer-topline" />

      <div className="app-footer-hero">
        <div className="app-footer-hero-main">
          <div className="app-footer-kicker">Sentra Healthcare Solutions</div>
          <h2 className="app-footer-title">Sentra Intelligence Dashboard</h2>
        </div>

        <div className="app-footer-summary">
          <p>
            Sentra Intelligence Dashboard saat ini masih dalam tahap pengembangan intensif. Dengan
            demikian, fitur, data, dan fungsionalitas yang tersedia mungkin belum sepenuhnya akurat
            dan stabil.
          </p>
          <p>
            Seluruh hak kekayaan intelektual, properti, dan konten yang terkait dengan sistem ini
            adalah milik Sentra Healthcare Artificial Intelligent.
          </p>
        </div>
      </div>

      <div className="app-footer-grid">
        {FOOTER_LINK_GROUPS.map((group) => (
          <section key={group.title} className="app-footer-section">
            <div className="app-footer-section-title">{group.title}</div>
            <div className="app-footer-links">
              {group.links.map((link) => (
                <Link key={link.href + link.label} href={link.href} className="app-footer-link">
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="app-footer-section app-footer-section-meta">
          <div className="app-footer-section-title">Lingkup</div>
          <div className="app-footer-meta-list">
            <div>Poli Umum Dewasa</div>
            <div>Puskesmas Balowerti Kota Kediri</div>
            <div>Clinical workflow · reporting · decision support</div>
          </div>
        </section>
      </div>

      <div className="app-footer-bottomline">
        <div>© {year} Sentra Healthcare Solutions</div>
        <div>Designed for disciplined, daily clinical operations.</div>
      </div>
    </footer>
  )
}
