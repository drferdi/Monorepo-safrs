// Architected and built by Drferdi.
import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

// The journey's stylesheets read these two font variables (`journey.module.css`).
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Sentraverse — Intelligence begins as connection',
  description: 'Where human intelligence, artificial intelligence, and real-world systems connect. Discover the interconnected ecosystem of Sentra.',
  openGraph: {
    title: 'Sentraverse — One intelligence ecosystem',
    description: 'Intelligence begins as connection. Explore the living network of Sentra.',
    siteName: 'Sentraverse',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'Sentraverse — One intelligence ecosystem', description: 'Intelligence begins as connection.' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} ${inter.variable}`}>{children}</body>
    </html>
  )
}
