// Drferdi — vision, brought to life.
import type { Metadata } from 'next'
import '@fontsource-variable/ibm-plex-sans'
import 'lenis/dist/lenis.css'
import './globals.css'
import './ui.css'
import './shell.css'
import './rank.css'
import '@/components/motion/motion.css'
import ActivityHeartbeat from '@/components/ActivityHeartbeat'
import AppFooter from '@/components/AppFooter'
import AppHeader from '@/components/AppHeader'
import AppNav from '@/components/AppNav'
import CrewAccessGate from '@/components/CrewAccessGate'
import SmoothScroll from '@/components/SmoothScroll'
import TidyCaseOnBlur from '@/components/TidyCaseOnBlur'
import MotionProvider, { MotionViewport } from '@/components/motion/MotionProvider'

export const metadata: Metadata = {
  title: 'MedBoard — Sentra',
  description: 'Meja kerja klinis untuk puskesmas, dari anamnesis sampai rujukan.',
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
        <SmoothScroll />
        <TidyCaseOnBlur />
        <CrewAccessGate>
          <ActivityHeartbeat />
          <MotionProvider>
          <div className="app-shell">
            <AppNav />
            <div className="app-main">
              <AppHeader />
              <main className="app-content">
                <MotionViewport>{children}</MotionViewport>
              </main>
              <AppFooter />
            </div>
          </div>
          </MotionProvider>
        </CrewAccessGate>
      </body>
    </html>
  )
}
