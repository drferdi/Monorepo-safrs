// Architected and built by the one and only Drferdi.
// Chief's Location Section - Lokasi & Kontak

import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { OPERATIONAL_HOURS, SITE_INFO } from '@/config/site'

const Location = () => {
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
      { threshold: 0.15 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const workingAreas = ['Balowerti', 'Semampir', 'Dermo', 'Bangsal', 'Ngronggo']

  const contactInfo = [
    {
      icon: MapPin,
      label: 'Alamat',
      value: SITE_INFO.address,
    },
    {
      icon: Phone,
      label: 'Telepon',
      value: SITE_INFO.phoneDisplay,
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: SITE_INFO.whatsappDisplay,
    },
    {
      icon: Mail,
      label: 'Email',
      value: SITE_INFO.email,
    },
    {
      icon: Clock,
      label: 'Jam Operasional',
      value: OPERATIONAL_HOURS.combined,
    },
  ]

  return (
    <section
      ref={sectionRef}
      id="location"
      className="relative w-full py-14 lg:py-20 bg-[#FAF3EB] overflow-hidden neo-section"
    >
      <div className="px-6 lg:px-[7vw]">
        <div className="max-w-2xl mb-12">
          <span
            className={`text-xs uppercase tracking-[0.2em] text-[#8B7D6F] font-medium
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            Lokasi
          </span>
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2420] mt-4 mb-6
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '100ms' }}
          >
            Lokasi & <span className="text-[#C9A87C]">Kontak</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div
            className={`transition-all duration-1000 ${
              isVisible
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-12 scale-[0.98]'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            <div className="relative rounded-[30px] p-8 neo-card h-full min-h-[400px] flex flex-col">
              <div className="flex-1 relative">
                <svg viewBox="0 0 400 300" className="w-full h-full" style={{ minHeight: '250px' }}>
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke="rgba(201, 168, 124, 0.1)"
                        strokeWidth="0.5"
                      />
                    </pattern>
                  </defs>
                  <rect width="400" height="300" fill="url(#grid)" />

                  <path
                    d="M 50 150 Q 100 100 150 120 T 250 100 T 350 150"
                    className="line-art-map"
                    stroke="rgba(201, 168, 124, 0.3)"
                    strokeWidth="1"
                    fill="none"
                  />
                  <path
                    d="M 30 200 Q 80 180 130 200 T 230 190 T 330 210"
                    className="line-art-map"
                    stroke="rgba(201, 168, 124, 0.3)"
                    strokeWidth="1"
                    fill="none"
                  />
                  <path
                    d="M 80 80 L 120 60 L 180 70 L 220 50 L 280 80"
                    className="line-art-map"
                    stroke="rgba(201, 168, 124, 0.3)"
                    strokeWidth="1"
                    fill="none"
                  />

                  <circle cx="200" cy="150" r="8" fill="#C9A87C" opacity="0.2" />
                  <circle cx="200" cy="150" r="4" fill="#C9A87C" />

                  <circle cx="100" cy="120" r="3" fill="#8B7D6F" opacity="0.5" />
                  <circle cx="300" cy="100" r="3" fill="#8B7D6F" opacity="0.5" />
                  <circle cx="150" cy="200" r="3" fill="#8B7D6F" opacity="0.5" />
                  <circle cx="280" cy="180" r="3" fill="#8B7D6F" opacity="0.5" />
                  <circle cx="80" cy="250" r="3" fill="#8B7D6F" opacity="0.5" />

                  <path
                    d="M 200 150 L 100 120 M 200 150 L 300 100 M 200 150 L 150 200 M 200 150 L 280 180 M 200 150 L 80 250"
                    stroke="rgba(201, 168, 124, 0.2)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    fill="none"
                  />
                </svg>

                <div className="absolute bottom-4 left-4 right-4">
                  <div className="frosted-glass rounded-xl px-4 py-3 neo-card">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-[#C9A87C]" />
                      <span className="text-sm text-[#2D2420]">Puskesmas Balowerti</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs uppercase tracking-wider text-[#8B7D6F] mb-3">
                  Wilayah Kerja
                </p>
                <div className="flex flex-wrap gap-2">
                  {workingAreas.map((area, index) => (
                    <span
                      key={area}
                      className={`inline-block text-xs font-medium text-[#2D2420] bg-[#FAF3EB] rounded-full px-4 py-2 neo-chip
                        transition-all duration-500 ${
                          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                      style={{ transitionDelay: `${400 + index * 60}ms` }}
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            className={`transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <div className="space-y-4">
              {contactInfo.map((info, index) => (
                <div
                  key={info.label}
                  className={`frosted-glass rounded-2xl p-5 flex items-start gap-4 neo-card neo-card-hover
                    transition-all duration-500 hover:translate-x-1
                    ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: `${400 + index * 80}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FAF3EB] flex items-center justify-center flex-shrink-0 neo-inset">
                    <info.icon className="w-5 h-5 text-[#C9A87C]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#8B7D6F] mb-1">
                      {info.label}
                    </p>
                    <p className="text-base font-medium text-[#2D2420]">{info.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`flex flex-wrap gap-4 mt-8
                transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: '800ms' }}
            >
              <a
                href={`https://wa.me/${SITE_INFO.whatsappInternational}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#C9A87C] hover:bg-[#B8956A] text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[#C9A87C]/20 neo-card-hover"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Chat WhatsApp</span>
              </a>
              <a
                href={`tel:${SITE_INFO.phoneTel}`}
                className="inline-flex items-center gap-2 frosted-glass hover:bg-white text-[#2D2420] font-medium px-6 py-3 rounded-xl transition-all duration-300 neo-control"
              >
                <Phone className="w-5 h-5 text-[#C9A87C]" />
                <span>Hubungi Kami</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Location
