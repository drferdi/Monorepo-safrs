// Architected and built by Drferdi.
import NeuralJourney from '@/components/neural/NeuralJourney'

// The year is read once where the page is rendered and handed to the client, so hydration sees the
// same text the server wrote.
export default function Home() {
  return <NeuralJourney year={new Date().getFullYear()} />
}
