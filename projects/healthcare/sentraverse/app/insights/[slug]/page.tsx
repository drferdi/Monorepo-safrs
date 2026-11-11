import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { articles, getArticle } from '../data'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return {}

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: article.href },
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title: `${article.title} | Medium`,
      description: article.description,
      url: article.href,
      type: 'article',
      publishedTime: article.date,
      images: [
        {
          url: article.image,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${article.title} | Medium`,
      description: article.description,
      images: [article.image],
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  permanentRedirect(article.href)
}
