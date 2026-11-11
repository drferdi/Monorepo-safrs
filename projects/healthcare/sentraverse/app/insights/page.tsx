import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import type { Metadata } from 'next'
import { Newsreader } from 'next/font/google'
import Link from 'next/link'

import { articles, formatDate } from './data'

import { Reveal } from '@/components/ui/reveal'

// Editorial serif scoped to this page only — global brand typography untouched.
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
})

const serif = { fontFamily: 'var(--font-newsreader), Georgia, serif' }

const mediumProfileHref = 'https://medium.com/@drferdiiskandar'

export const metadata: Metadata = {
  title: 'Insights',
  description:
    'Daftar tulisan asli Dr. Ferdi Iskandar yang dipublikasikan di Medium, mencakup clinical trajectory, hypothesis building, dan AI kesehatan.',
  alternates: { canonical: '/insights' },
  openGraph: {
    title: 'Insights — Sentra Healthcare AI',
    description:
      'Daftar tulisan asli Dr. Ferdi Iskandar di Medium tentang AI kesehatan, trajectory klinis, dan kerangka hipotesis.',
    url: 'https://sentrahai.com/insights',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Sentra Healthcare AI insights',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Insights — Sentra Healthcare AI',
    description:
      'Daftar tulisan asli Dr. Ferdi Iskandar di Medium tentang AI kesehatan, trajectory klinis, dan kerangka hipotesis.',
    images: ['/opengraph-image'],
  },
}

export default function InsightsPage() {
  const [featured, ...rest] = articles
  const railArticles = rest.slice(0, 2)
  const bottomArticles = rest.slice(2)
  const sections = Array.from(new Set(articles.map((a) => a.category)))
  const editionDate = formatDate(featured.date)

  return (
    <main
      className={`${newsreader.variable} min-h-screen bg-[#fcfbfa] text-[#191919] font-sans selection:bg-[#eae6df]`}
    >
      {/* Utility bar */}
      <div className="border-b border-[#e6e4e0] bg-[#faf8f5]/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-[1140px] mx-auto px-6 md:px-10 h-12 flex items-center justify-between text-[11px] tracking-wider font-semibold">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#6b6b6b] hover:text-[#191919] transition-colors"
          >
            <ArrowLeft size={13} className="mt-[-1px]" />
            <span>Kembali ke Sentra</span>
          </Link>
          <div className="flex items-center gap-1.5 text-[#6b6b6b] font-mono uppercase">
            <span className="hidden sm:inline">{editionDate}</span>
            <span className="hidden sm:inline h-1 w-1 rounded-full bg-[#d3d1cc]" />
            <span>Edisi 2026</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1140px] mx-auto px-6 md:px-10 pt-10 md:pt-14 pb-12 md:pb-16">
        {/* Masthead */}
        <Reveal>
          <header className="text-center">
            <h1
              className="text-5xl md:text-7xl font-bold tracking-tight text-[#191919]"
              style={serif}
            >
              Sentra Insights
            </h1>
            <p className="mt-3 text-sm md:text-base text-[#6b6b6b] italic" style={serif}>
              Hipotesis klinis, trajektori penyakit, dan masa depan kecerdasan buatan medis
            </p>
          </header>

          {/* Double rule + section index */}
          <div className="mt-8 border-t-2 border-[#191919]">
            <nav
              aria-label="Rubrik publikasi"
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-2.5 text-[10px] md:text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#6b6b6b]"
            >
              {sections.map((section, index) => (
                <span key={section} className="flex items-center gap-6">
                  {index > 0 && <span className="h-3 w-px bg-[#e6e4e0]" aria-hidden />}
                  <span>{section}</span>
                </span>
              ))}
            </nav>
          </div>
          <div className="border-t border-[#191919]" />
        </Reveal>

        {/* Front page grid: featured + rail */}
        <div className="mt-10 md:mt-12 grid lg:grid-cols-[1fr_320px] gap-10 lg:gap-0 items-start">
          {/* Featured story */}
          <Reveal>
            <article className="group lg:pr-10">
              <Link
                href={featured.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#faf8f5] border border-[#e6e4e0]">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    className="h-full w-full object-cover opacity-[0.95] group-hover:scale-[1.02] transition-transform duration-700 filter contrast-[0.95] brightness-[0.98]"
                  />
                </div>
                <p className="mt-6 text-[10px] md:text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-amber-800">
                  {featured.category}
                </p>
                <h2
                  className="mt-2 text-3xl md:text-5xl font-bold tracking-tight leading-[1.08] text-[#191919] group-hover:text-amber-800 transition-colors"
                  style={serif}
                >
                  {featured.title}
                </h2>
                <p className="mt-4 text-[16px] text-[#4a4a4a] leading-relaxed max-w-[640px]">
                  {featured.description}
                </p>
                <div className="mt-5 flex items-center gap-2 text-xs text-[#6b6b6b]">
                  <span className="font-bold text-[#191919]">Dr. Ferdi Iskandar</span>
                  <span className="h-1 w-1 rounded-full bg-[#d3d1cc]" />
                  <span>{formatDate(featured.date)}</span>
                  <span className="h-1 w-1 rounded-full bg-[#d3d1cc]" />
                  <span>{featured.source}</span>
                </div>
              </Link>
            </article>
          </Reveal>

          {/* Right rail — column rule, typography only */}
          <aside className="border-t lg:border-t-0 lg:border-l border-[#e6e4e0] pt-8 lg:pt-0 lg:pl-10 flex flex-col">
            {railArticles.map((article, index) => (
              <Reveal key={article.slug} delay={0.1 + index * 0.08}>
                <article
                  className={`group ${index > 0 ? 'mt-8 pt-8 border-t border-[#e6e4e0]' : ''}`}
                >
                  <Link
                    href={article.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-[#6b6b6b]">
                      {article.category}
                    </p>
                    <h3
                      className="mt-2 text-xl md:text-2xl font-bold tracking-tight leading-snug text-[#191919] group-hover:text-amber-800 transition-colors"
                      style={serif}
                    >
                      {article.title}
                    </h3>
                    <p className="mt-2.5 text-sm text-[#6b6b6b] leading-relaxed line-clamp-2">
                      {article.description}
                    </p>
                    <p className="mt-3 text-xs text-[#6b6b6b]">{formatDate(article.date)}</p>
                  </Link>
                </article>
              </Reveal>
            ))}
          </aside>
        </div>

        {/* Below the fold */}
        <div className="mt-12 border-t border-[#191919] pt-10 grid md:grid-cols-2 gap-10 md:gap-0">
          {bottomArticles.map((article, index) => (
            <Reveal key={article.slug} delay={index * 0.08}>
              <article
                className={`group h-full ${
                  index > 0
                    ? 'border-t md:border-t-0 md:border-l border-[#e6e4e0] pt-10 md:pt-0 md:pl-10'
                    : 'md:pr-10'
                }`}
              >
                <Link
                  href={article.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid grid-cols-[1fr_96px] sm:grid-cols-[1fr_120px] gap-5 items-start"
                >
                  <div>
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-[#6b6b6b]">
                      {article.category}
                    </p>
                    <h3
                      className="mt-2 text-lg md:text-xl font-bold tracking-tight leading-snug text-[#191919] group-hover:text-amber-800 transition-colors"
                      style={serif}
                    >
                      {article.title}
                    </h3>
                    <p className="mt-2 text-sm text-[#6b6b6b] leading-relaxed line-clamp-2">
                      {article.description}
                    </p>
                    <p className="mt-3 text-xs text-[#6b6b6b]">{formatDate(article.date)}</p>
                  </div>
                  <div className="relative aspect-square w-full overflow-hidden bg-[#faf8f5] border border-[#e6e4e0]">
                    {}
                    <img
                      src={article.image}
                      alt={article.title}
                      className="h-full w-full object-cover opacity-[0.95] group-hover:scale-[1.03] transition-transform duration-500 filter contrast-[0.95] brightness-[0.98]"
                    />
                  </div>
                </Link>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Colophon */}
        <Reveal>
          <footer className="mt-14">
            <div className="border-t-2 border-[#191919]" />
            <div className="border-t border-[#191919] mt-[3px] pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-[#191919]">
                <span className="font-bold" style={serif}>
                  Dr. Ferdi Iskandar
                </span>
                <span className="text-[#6b6b6b]"> — Klinisi &amp; Arsitek AI Medis</span>
              </div>
              <Link
                href={mediumProfileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 self-start sm:self-auto bg-[#191919] text-white hover:bg-neutral-800 transition-colors text-[11px] font-bold px-3.5 py-2 rounded-full"
              >
                <span>Ikuti di Medium</span>
                <ArrowUpRight size={13} />
              </Link>
              <p className="text-[11px] text-[#6b6b6b] font-mono sm:text-right">
                © 2026 Sentra AI. Publikasi orisinal diterbitkan di Medium.
              </p>
            </div>
          </footer>
        </Reveal>
      </div>
    </main>
  )
}
