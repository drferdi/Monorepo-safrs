// Architected and built by Drferdi.
import NeuralJourney from '@/components/neural/NeuralJourney'

// The organisation behind the site, as structured data; the pages it points to live on sentrahai.com.
const organization = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Sentra', url: 'https://sentrahai.com' }

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <NeuralJourney />
    </>
  )
}
