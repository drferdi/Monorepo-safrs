// SEO: Dynamic sitemap.xml generation via Next.js App Router convention
import type { MetadataRoute } from 'next'

import { articles } from './insights/data'

const SITE_LAST_MODIFIED = new Date('2026-04-12')
const STORY_LAST_MODIFIED = new Date('2026-04-10')
const LEGAL_LAST_MODIFIED = new Date('2026-03-01')

const latestArticleDate = articles.reduce(
  (latest, article) => {
    const articleDate = new Date(article.date)
    return articleDate > latest ? articleDate : latest
  },
  new Date(articles[0]?.date ?? SITE_LAST_MODIFIED)
)

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://sentrahai.com',
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://sentrahai.com/story',
      lastModified: STORY_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://sentrahai.com/insights',
      lastModified: latestArticleDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://sentrahai.com/sentrapedia',
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://sentrahai.com/ekosistem',
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://sentrahai.com/sentrawiki',
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://sentrahai.com/privacy',
      lastModified: LEGAL_LAST_MODIFIED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://sentrahai.com/terms',
      lastModified: LEGAL_LAST_MODIFIED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
