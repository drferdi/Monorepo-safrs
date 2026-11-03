// Architected and built by the one and only Drferdi.
// Chief's WhatsApp Floating Button — sticky CTA untuk konversi mobile

import { useEffect, useState } from 'react'
import { SITE_INFO } from '@/config/site'

const WA_URL = `https://wa.me/${SITE_INFO.whatsappInternational}?text=${encodeURIComponent('Halo Puskesmas Balowerti, saya ingin bertanya tentang layanan kesehatan.')}`

const WAFloatingButton = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <a
      href={WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Hubungi kami via WhatsApp"
      className={`fixed bottom-24 right-6 z-40 flex items-center gap-2.5 bg-[#25D366] text-white
        px-4 py-3 rounded-full shadow-lg shadow-[#25D366]/30
        transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#25D366]/40
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      {/* WhatsApp SVG icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5 flex-shrink-0"
        aria-hidden="true"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.847L.057 23.882a.5.5 0 0 0 .614.614l6.035-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.694-.505-5.23-1.387l-.374-.217-3.882.946.964-3.882-.229-.386A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
      </svg>
      <span className="text-sm font-semibold whitespace-nowrap">Chat WA</span>
    </a>
  )
}

export default WAFloatingButton
