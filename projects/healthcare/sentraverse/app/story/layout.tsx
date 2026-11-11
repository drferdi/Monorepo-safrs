import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Our Story — Transforming Indonesian Healthcare with AI',
  description:
    "Built by Dr. Ferdi Iskandar — a practicing physician with 15+ years in healthcare leadership. Sentra AI addresses Indonesia's maternal mortality crisis through clinical intelligence.",
  alternates: {
    canonical: '/story',
  },
  openGraph: {
    title: 'Our Story — Sentra Healthcare AI',
    description:
      'Built by physicians, for physicians. Sentra addresses 4,100+ annual maternal deaths through AI-powered clinical decision support.',
    url: 'https://sentrahai.com/story',
    images: [
      {
        url: '/story/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Our Story — Sentra Healthcare AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Our Story — Sentra Healthcare AI',
    description:
      'Built by physicians, for physicians. Sentra addresses 4,100+ annual maternal deaths through AI-powered clinical decision support.',
    images: ['/story/opengraph-image'],
  },
}

export default function StoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
