// Architected and built by Drferdi.
// [APPROVED]

import type { Metadata } from 'next'
import NeuralJourney from '@/components/neural/NeuralJourney'

export const metadata: Metadata = {
  title: { absolute: 'Sentraverse — Intelligence begins as connection' },
  description: 'Where human intelligence, artificial intelligence, and real-world systems connect. Discover the interconnected ecosystem of Sentra.',
  openGraph: {
    title: 'Sentraverse — One intelligence ecosystem',
    description: 'Intelligence begins as connection. Explore the living network of Sentra.',
    url: 'https://sentrahai.com',
  },
  twitter: { title: 'Sentraverse — One intelligence ecosystem', description: 'Intelligence begins as connection.' },
}

export default function Home() {
  return <NeuralJourney />
}
