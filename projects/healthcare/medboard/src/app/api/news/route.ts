import { NextResponse } from 'next/server'

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
  description?: string
}

function parseRssItems(xml: string, source: string, limit = 8): NewsItem[] {
  const items: NewsItem[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
  for (const m of itemMatches) {
    const block = m[1]
    const title = (
      block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
      block.match(/<title>(.*?)<\/title>/)?.[1] ??
      ''
    ).trim()
    const link = (
      block.match(/<link>(.*?)<\/link>/)?.[1] ??
      block.match(/<guid>(https?:\/\/[^<]+)<\/guid>/)?.[1] ??
      ''
    ).trim()
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? '').trim()
    const description = (
      block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ??
      block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ??
      ''
    )
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 120)

    if (title && link) {
      items.push({ title, link, pubDate, source, description })
    }
    if (items.length >= limit) break
  }
  return items
}

async function fetchRss(url: string, source: string, limit = 8): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SentraBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRssItems(xml, source, limit)
  } catch {
    return []
  }
}

/* Source priority — diuji live 2026-03-02 */
const RSS_SOURCES = [
  { url: 'https://health.detik.com/rss', source: 'Detik Health' },
  {
    url: 'https://www.cnnindonesia.com/gaya-hidup/rss',
    source: 'CNN Indonesia',
  },
  { url: 'https://www.liputan6.com/rss/health', source: 'Liputan6' },
  { url: 'https://www.kompas.com/getrss/kesehatan', source: 'Kompas' },
]

export async function GET() {
  // Ambil dari semua source secara parallel
  const results = await Promise.all(RSS_SOURCES.map(s => fetchRss(s.url, s.source, 4)))

  // Gabungkan, deduplikasi by title, ambil 5 terbaru
  const seen = new Set<string>()
  const items: NewsItem[] = []

  for (const batch of results) {
    for (const item of batch) {
      const key = item.title.toLowerCase().slice(0, 60)
      if (!seen.has(key) && item.title) {
        seen.add(key)
        items.push(item)
      }
      if (items.length >= 5) break
    }
    if (items.length >= 5) break
  }

  // Sort by pubDate terbaru
  items.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0
    return db - da
  })

  return NextResponse.json({ items })
}
