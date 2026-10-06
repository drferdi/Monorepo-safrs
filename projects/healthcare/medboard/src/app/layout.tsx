// Drferdi — vision, brought to life.
import type { Metadata } from 'next'
import '@fontsource-variable/inter'
import './globals.css'
import './ui.css'
import AppFooter from '@/components/AppFooter'
import AppNav from '@/components/AppNav'
import CrewAccessGate from '@/components/CrewAccessGate'

export const metadata: Metadata = {
  title: 'Sentra — Puskesmas Dashboard',
  description: 'Clinical Information System — Sentra Healthcare Solutions',
  icons: { icon: '/favicon.svg' },
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
            <main className="app-content">
              <div className="app-page-stack">
                {children}
                <AppFooter />
              </div>
            </main>
          </div>
        </CrewAccessGate>
      </body>
    </html>
  )
}
