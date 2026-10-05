// Drferdi — vision, brought to life.
import type { Metadata } from 'next'
import '@fontsource-variable/ibm-plex-sans'
import './globals.css'
import AppFooter from '@/components/AppFooter'
import AppNav from '@/components/AppNav'
import CrewAccessGate from '@/components/CrewAccessGate'
import ThemeProvider from '@/components/ThemeProvider'

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
    <html lang="id" data-theme="dark">
      <body>
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  )
}
