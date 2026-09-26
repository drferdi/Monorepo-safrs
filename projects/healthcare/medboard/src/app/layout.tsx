// Drferdi — vision, brought to life.
import type { Metadata } from 'next'
import './globals.css'
import { Poppins } from 'next/font/google'
import AppFooter from '@/components/AppFooter'
import AppNav from '@/components/AppNav'
import CrewAccessGate from '@/components/CrewAccessGate'
import ThemeProvider from '@/components/ThemeProvider'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

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
    <html lang="id" data-theme="dark" className={poppins.variable}>
      <body className={poppins.className}>
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
