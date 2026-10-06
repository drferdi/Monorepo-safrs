// Drferdi — vision, brought to life.
import type { Metadata } from 'next'
import '@fontsource-variable/ibm-plex-sans'
import './globals.css'
import './ui.css'
import './shell.css'
import AppFooter from '@/components/AppFooter'
import AppHeader from '@/components/AppHeader'
import AppNav from '@/components/AppNav'
import CrewAccessGate from '@/components/CrewAccessGate'

export const metadata: Metadata = {
  title: 'Sentra — Puskesmas Dashboard',
  description: 'Clinical Information System — Sentra Healthcare Solutions',
  icons: { icon: '/sentra-mark.png' },
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body>
        <CrewAccessGate>
          <div className="app-shell">
            <AppNav />
            <div className="app-main">
              <AppHeader />
              <main className="app-content">
                <div className="app-page-stack">{children}</div>
              </main>
              <AppFooter />
            </div>
          </div>
        </CrewAccessGate>
      </body>
    </html>
  )
}
