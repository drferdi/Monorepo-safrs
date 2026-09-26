// Architected and built by the one and only Drferdi.
// Chief's Footer Section - Final CTA with Social Media

import { ArrowUp, Heart, Instagram, Youtube } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const Footer = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Chief's Social Media Links
  const socialLinks = [
    {
      icon: Instagram,
      label: 'Instagram',
      href: 'https://www.instagram.com/pkm_balowerti/',
      color: 'hover:bg-gradient-to-br hover:from-purple-500 hover:via-pink-500 hover:to-orange-400',
    },
    {
      icon: Youtube,
      label: 'YouTube',
      href: 'https://www.youtube.com/@puskesmasbalowertikediri',
      color: 'hover:bg-red-600',
    },
  ]

  return (
    <footer
      ref={sectionRef}
      className="relative w-full py-14 lg:py-20 bg-[#F8F5F2] overflow-hidden neo-section"
    >
      <div className="absolute inset-0 bg-cream-gradient pointer-events-none" />

      <div className="relative z-10 px-6 lg:px-[7vw]">
        <div className="max-w-3xl mx-auto text-center">
          {/* Logos */}
          <div
            className={`flex items-center justify-center gap-6 mb-8 transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <div className="w-20 h-20 rounded-full bg-white p-2 neo-card">
              <img
                src="/images/logookm.png"
                alt="Logo Puskesmas"
                width="80"
                height="80"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="h-16 w-px bg-[#E5DDD5]" />
            <img
              src="/images/logokediri.avif"
              alt="Logo Kota Kediri"
              width="160"
              height="64"
              loading="lazy"
              decoding="async"
              className="h-16 w-auto object-contain"
            />
          </div>

          <div
            className={`transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2D2420] font-['Playfair_Display'] mb-4">
              Puskesmas <span className="text-[#C9A87C]">Balowerti</span>
            </h2>
            <p className="text-lg text-[#8B7D6F] mb-6">Layanan kesehatan terdekat, terpercaya.</p>
            <p className="text-sm text-[#8B7D6F]/70 mb-10">Dinas Kesehatan Kota Kediri</p>
          </div>

          {/* Chief's Social Media Section */}
          <div
            className={`mb-10 transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ transitionDelay: '150ms' }}
          >
            <p className="text-sm text-[#8B7D6F] mb-4">Ikuti kami di media sosial</p>
            <div className="flex justify-center gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group w-12 h-12 rounded-full bg-white neo-card neo-card-hover flex items-center justify-center
                    transition-all duration-300 hover:scale-110 ${social.color}`}
                  style={{ transitionDelay: `${200 + index * 100}ms` }}
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5 text-[#8B7D6F] group-hover:text-white transition-colors duration-300" />
                </a>
              ))}
            </div>
          </div>

          <div
            className={`mb-12 transition-all duration-1000 ${
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            <a
              href="#reservation"
              data-magnetic
              data-magnetic-strength="12"
              className="inline-flex items-center gap-3 bg-[#C9A87C] hover:bg-[#B8956A] text-white font-medium text-lg px-10 py-5 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-[#C9A87C]/30 group neo-card-hover"
            >
              <Heart className="w-6 h-6 transition-transform group-hover:scale-110" />
              <span>Reservasi Sekarang</span>
            </a>
          </div>

          <div
            className={`flex flex-wrap justify-center gap-6 mb-12
              transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: '400ms' }}
          >
            {['Nyaman', 'Unggul', 'Ramah', 'Sopan', 'Ikhlas'].map((word, index) => (
              <span
                key={word}
                className="text-xs uppercase tracking-[0.2em] text-[#8B7D6F]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {word}
              </span>
            ))}
          </div>

          <div
            className={`w-full h-px bg-[#FAF3EB] mb-8
              transition-all duration-1000 ${isVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}
            style={{ transitionDelay: '500ms' }}
          />

          <div
            className={`flex flex-wrap justify-center gap-8 mb-12
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: '600ms' }}
          >
            <a
              href="/syarat-ketentuan.html"
              className="text-sm text-[#8B7D6F] hover:text-[#C9A87C] transition-colors"
            >
              Syarat &amp; Ketentuan
            </a>
            <a
              href="/kebijakan-privasi.html"
              className="text-sm text-[#8B7D6F] hover:text-[#C9A87C] transition-colors"
            >
              Kebijakan Privasi
            </a>
            <a
              href="#about"
              className="text-sm text-[#8B7D6F] hover:text-[#C9A87C] transition-colors"
            >
              Tentang Kami
            </a>
            <a
              href="#services"
              className="text-sm text-[#8B7D6F] hover:text-[#C9A87C] transition-colors"
            >
              Layanan
            </a>
          </div>

          <div
            className={`transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '700ms' }}
          >
            <p className="text-xs text-[#8B7D6F]">
              © {new Date().getFullYear()} UPTD Puskesmas Poned Balowerti. All rights reserved.
            </p>
            <p className="text-xs text-[#8B7D6F] mt-2">
              Dinas Kesehatan Kota Kediri · Architected and built by{' '}
              <span className="text-[#C9A87C] font-medium">the one and only Drferdi</span>
            </p>
            <p className="text-xs text-[#8B7D6F]/60 mt-3 max-w-lg mx-auto leading-relaxed">
              Konten website ini bersifat informatif. Bukan pengganti konsultasi, diagnosis, atau
              penanganan medis oleh tenaga kesehatan berwenang.
            </p>
          </div>
        </div>

        <button
          onClick={scrollToTop}
          className={`fixed bottom-8 right-8 w-12 h-12 frosted-glass rounded-full flex items-center justify-center
            neo-card neo-card-hover transition-all duration-300 hover:-translate-y-1 z-50
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '800ms' }}
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 text-[#C9A87C]" />
        </button>
      </div>
    </footer>
  )
}

export default Footer
