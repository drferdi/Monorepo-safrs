// Drferdi — vision, brought to life.
import { notFound } from 'next/navigation'
import CalculatorWorkspace from '@/components/calculator/CalculatorWorkspace'
import { getCalculatorBySlug } from '@/lib/calculators/medical-calculators'

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function CalculatorDetailPage({ params }: PageProps) {
  const { slug } = await params
  const calculator = getCalculatorBySlug(slug)

  if (!calculator) {
    notFound()
  }

  return <CalculatorWorkspace slug={calculator.slug} />
}
