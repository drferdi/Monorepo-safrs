import Link from 'next/link'

export default function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="app-footer" aria-label="Footer aplikasi">
      <Link href="/legal" className="app-footer__link">
        Legal
      </Link>
      <span aria-hidden>·</span>
      <Link href="/legal#disclaimer" className="app-footer__link">
        Disclaimer AI
      </Link>
      <span aria-hidden>·</span>
      <span>© {year} Sentra Healthcare Solutions</span>
    </footer>
  )
}
