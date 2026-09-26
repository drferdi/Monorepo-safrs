// Architected and built by Drferdi.
// [APPROVED]

import About from '@/components/About'
import AboutSentra from '@/components/AboutSentra'
import BlueprintStory from '@/components/BlueprintStory'
import Clients from '@/components/Clients'
import ClinicalSuite from '@/components/ClinicalSuite'
import Ecosystem from '@/components/Ecosystem'
import FAQ from '@/components/FAQ'
import Footer from '@/components/Footer'
import Hero from '@/components/Hero'
import Interlude from '@/components/Interlude'
import Navbar from '@/components/Navbar'
import ProjectSlider from '@/components/ProjectSlider'
import ScrollGallery from '@/components/ScrollGallery'
import SentraSim from '@/components/SentraSim'
import Services from '@/components/Services'
import Showcase from '@/components/Showcase'
import { ScrollTriggerSync } from '@/components/ui/scrolltrigger-sync'

export default function Home() {
  return (
    <main id="top" className="min-h-screen bg-background text-foreground font-sans">
      <ScrollTriggerSync />
      <Navbar />
      <Hero />
      <ProjectSlider />
      <AboutSentra />
      <About />
      <Ecosystem />
      <Clients />
      <SentraSim />
      <Interlude />
      <BlueprintStory />
      <Showcase />
      <Services />
      <ClinicalSuite />
      <ScrollGallery />
      <FAQ />
      <Footer />
    </main>
  )
}
