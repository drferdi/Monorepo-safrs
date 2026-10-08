// Architected and built by Drferdi.
import NeuralJourney from '@/components/neural/NeuralJourney'

// The organisation behind the site, as structured data; the pages it points to live on sentrahai.com.
const organization = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Sentra', url: 'https://sentrahai.com' }

// The year is read once where the page is rendered and handed to the client, so hydration sees the
// same text the server wrote.
export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <NeuralJourney year={new Date().getFullYear()} />
    </>
  )
}
