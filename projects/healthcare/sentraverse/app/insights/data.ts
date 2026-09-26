export interface Article {
  slug: string
  title: string
  description: string
  date: string
  category: string
  href: string
  substackHref: string
  image: string
  source: string
}

export const substackUrl = 'https://drferdiiskandar.substack.com'

export const articles: Article[] = [
  {
    slug: 'the-adaptive-engram-migration-hypothesis',
    title: 'The Adaptive Engram Migration Hypothesis',
    description:
      'Possession trance dibahas sebagai dissociative cascade yang dibentuk oleh tekanan neuro-kultural dan kanal ekspresi yang disahkan secara sosial.',
    date: '2026-06-11',
    category: 'Possession Trance',
    href: 'https://medium.com/@drferdiiskandar/the-adaptive-engram-migration-hypothesis-2f9e551131e3',
    substackHref: 'https://drferdiiskandar.substack.com/p/the-adaptive-engram-migration-hypothesis',
    image: 'https://cdn-images-1.medium.com/max/1024/1*QDHyJQo4M-pGrnjExM_viA.png',
    source: 'Medium',
  },
  {
    slug: 'ai-mediated-real-time-diagnostic-course-correction',
    title: 'AI-Mediated Real-Time Diagnostic Course Correction',
    description:
      'Kerangka real-time course correction untuk membantu klinisi mendeteksi deviasi diagnosis lebih cepat melalui pemodelan lintasan klinis.',
    date: '2026-06-09',
    category: 'Clinical Trajectory',
    href: 'https://medium.com/@drferdiiskandar/ai-mediated-real-time-diagnostic-course-correction-5e8026049858',
    substackHref: 'https://drferdiiskandar.substack.com/p/ai-mediated-real-time-diagnostic',
    image: 'https://cdn-images-1.medium.com/max/1024/1*DXrpJ4lc_zPGn0O7PUeV9A.png',
    source: 'Medium',
  },
  {
    slug: 'adaptive-engram-migration-as-a-trigger-for-transient-auditory-hallucinations-in-the-aging-brain',
    title:
      'Adaptive Engram Migration as a Trigger for Transient Auditory Hallucinations in the Aging Brain',
    description:
      'Hipotesis tentang bagaimana migrasi engram adaptif dapat memicu halusinasi auditorik sementara pada otak yang menua.',
    date: '2026-06-08',
    category: 'Hypothesis',
    href: 'https://medium.com/@drferdiiskandar/adaptive-engram-migration-as-a-trigger-for-transient-auditory-hallucinations-in-the-aging-brain-a-2e10d99034e4',
    substackHref: 'https://drferdiiskandar.substack.com/p/adaptive-engram-migration-as-a-trigger',
    image: 'https://cdn-images-1.medium.com/max/1024/1*8eLwnN9CzcNT-JIeP3m4Wg.png',
    source: 'Medium',
  },
  {
    slug: 'real-time-clinical-trajectory-modeling',
    title: 'Real-Time Clinical Trajectory Modeling',
    description:
      'Kerangka komputasional untuk mengintersepsi progresi penyakit lebih dini melalui pembacaan trajectory klinis secara real-time.',
    date: '2026-06-08',
    category: 'Clinical Trajectory',
    href: 'https://medium.com/@drferdiiskandar/real-time-clinical-trajectory-modeling-a-computational-framework-for-intercepting-disease-6aa8e8e80fd9',
    substackHref: 'https://drferdiiskandar.substack.com/p/real-time-clinical-trajectory-modeling',
    image: 'https://cdn-images-1.medium.com/max/1024/1*k4mgKRLb-z6av5RsFoLsWg.png',
    source: 'Medium',
  },
  {
    slug: 'hallucination-as-a-patching-mechanism',
    title: 'Hallucination as a Patching Mechanism',
    description:
      'Fatigue-induced hallucination direframing sebagai mekanisme patching top-down yang menjaga kontinuitas persepsi saat input sensorik menurun.',
    date: '2026-06-04',
    category: 'Hypothesis',
    href: 'https://medium.com/@drferdiiskandar/hallucination-as-a-patching-mechanism-reframing-fatigue-induced-perception-as-adaptive-top-down-12bef78e85b6',
    substackHref: 'https://drferdiiskandar.substack.com/p/hallucination-as-a-patching-mechanism',
    image: 'https://cdn-images-1.medium.com/max/1024/1*_h8pZuHVUOn8_e4rv5yISQ.png',
    source: 'Medium',
  },
]

export const featuredArticles = articles.slice(0, 4)

const articleMap = new Map(articles.map((article) => [article.slug, article]))

export function getArticle(slug: string): Article | undefined {
  return articleMap.get(slug)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
