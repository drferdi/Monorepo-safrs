// SEO: Dynamic robots.txt generation via Next.js App Router convention
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const aiBots = [
    'GPTBot',
    'ChatGPT-User',
    'ClaudeBot',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'Bytespider',
    'CCBot',
    'anthropic-ai',
    'FacebookBot',
    'Amazonbot',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      ...aiBots.map((bot) => ({
        userAgent: bot,
        allow: '/',
      })),
    ],
    sitemap: 'https://sentrahai.com/sitemap.xml',
  }
}
