// Architected and built by the one and only Drferdi.
// Chief's Services Section - Layanan Kami Grid with Smooth Image Animations

import { ArrowRight, Baby, Bed, FlaskConical, Siren, Smile, Stethoscope } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Chief's Smooth Service Image Component
const ServiceImage = ({
  src,
  alt,
  delay = 0,
  isVisible = false,
  privacy = false,
}: {
  src: string
  alt: string
  delay?: number
  isVisible?: boolean
  privacy?: boolean
}) => {
  const [loaded, setLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const imageRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) / 20
    const y = (e.clientY - rect.top - rect.height / 2) / 20
    setMousePosition({ x, y })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHovered(false)
    setMousePosition({ x: 0, y: 0 })
  }, [])

  return (
    <div
      ref={imageRef}
      className="relative h-48 overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
        transition: `all 0.8s cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms`,
      }}
    >
      {/* Chief's Shimmer Loading */}
      {!loaded && <div className="absolute inset-0 image-shimmer" />}

      {/* Chief's Image with 3D Tilt Effect */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover transition-all duration-500
          ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          transform: hovered
            ? `scale(1.1) translate(${-mousePosition.x}px, ${-mousePosition.y}px)`
            : 'scale(1) translate(0, 0)',
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        }}
        onLoad={() => setLoaded(true)}
      />

      {/* Chief's Privacy Badge */}
      {privacy && (
        <div
          className="absolute top-4 right-4 frosted-glass rounded-full px-3 py-1.5
          transform transition-all duration-300 hover:scale-105"
        >
          <span className="text-xs font-medium text-[#C9A87C]">Privasi Terjaga</span>
        </div>
      )}

      {/* Chief's Gradient Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent
          transition-opacity duration-500"
        style={{ opacity: hovered ? 0.6 : 0.3 }}
      />

      {/* Chief's Animated Shine Effect */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          backgroundImage: hovered
            ? 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)'
            : 'none',
          backgroundSize: hovered ? '200% 100%' : undefined,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '0% 0%',
          opacity: hovered ? 1 : 0,
          animation: hovered ? 'shimmer 1s ease-out' : 'none',
        }}
      />
    </div>
  )
}

const Services = () => {
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

  const services = [
    {
      icon: Stethoscope,
      title: 'Poli Umum & Geriatri',
      description: 'Pemeriksaan kesehatan umum, pengelolaan kronis, dan layanan lansia.',
      image: '/images/poli-umum.avif',
    },
    {
      icon: Smile,
      title: 'Poli Gigi',
      description: 'Perawatan gigi, scaling, dan edukasi kesehatan mulut.',
      image: '/images/poli-gigi-real.avif',
    },
    {
      icon: Baby,
      title: 'KIA & Imunisasi',
      description: 'Layanan ibu hamil, anak sehat, dan jadwal imunisasi lengkap.',
      image: '/images/kia.avif',
    },
    {
      icon: FlaskConical,
      title: 'Laboratorium & VCT',
      description: 'Pemeriksaan darah, urin, dan konseling tes HIV dengan privasi terjaga.',
      image: '/images/service-4.avif',
      privacy: true,
    },
    {
      icon: Siren,
      title: 'UGD 24 Jam',
      description: 'Penanganan gawat darurat dan observasi singkat selama 24 jam.',
      image: '/images/ugd-24jam.avif',
    },
    {
      icon: Bed,
      title: 'Rawat Inap',
      description: 'Perawatan intensif harian dengan monitoring terintegrasi.',
      image: '/images/rawatinap.avif',
    },
  ]

  return (
    <section
      ref={sectionRef}
      id="services"
      className="relative w-full py-14 lg:py-20 bg-[#FAF3EB] overflow-hidden neo-section"
    >
      {/* Chief's Decorative Elements */}
      <div className="absolute top-20 left-10 w-40 h-40 bg-[#C9A87C]/5 rounded-full blur-3xl float-gentle" />
      <div className="absolute bottom-20 right-10 w-60 h-60 bg-[#C9A87C]/5 rounded-full blur-3xl float-gentle-delay-1" />

      <div className="relative px-6 lg:px-[7vw]">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span
            className={`text-xs uppercase tracking-[0.2em] text-[#8B7D6F] font-medium
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            Layanan Kami
          </span>
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2420] mt-4 mb-6
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '100ms' }}
          >
            Layanan <span className="text-[#C9A87C]">Kesehatan</span> Komprehensif
          </h2>
          <p
            className={`text-base text-[#8B7D6F] leading-relaxed
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '200ms' }}
          >
            Layanan kesehatan komprehensif untuk berbagai kebutuhan—dari pemeriksaan rutin hingga
            penanganan gawat darurat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <div
              key={service.title}
              className={`group relative rounded-[24px] overflow-hidden neo-card neo-card-hover
                transition-all duration-500 hover:-translate-y-1.5
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{
                transitionDelay: `${300 + index * 80}ms`,
                transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            >
              <ServiceImage
                src={service.image}
                alt={service.title}
                delay={300 + index * 80}
                isVisible={isVisible}
                privacy={service.privacy}
              />

              <div className="p-6 relative">
                {/* Chief's Hover Background Effect */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-[#C9A87C]/0 via-[#C9A87C]/0 to-[#C9A87C]/0
                  group-hover:from-[#C9A87C]/5 group-hover:via-[#C9A87C]/5 group-hover:to-transparent
                  transition-all duration-500"
                />

                <div className="flex items-center gap-3 mb-3 relative">
                  <div
                    className="w-10 h-10 rounded-xl bg-[#FAF3EB] flex items-center justify-center neo-inset
                    transition-all duration-300 group-hover:bg-[#C9A87C] group-hover:scale-110
                    group-hover:rotate-3"
                  >
                    <service.icon className="w-5 h-5 text-[#C9A87C] transition-colors duration-300 group-hover:text-white" />
                  </div>
                  <h3
                    className="text-lg font-bold text-[#2D2420] font-['Playfair_Display']
                    group-hover:text-[#C9A87C] transition-colors duration-300"
                  >
                    {service.title}
                  </h3>
                </div>
                <p className="text-sm text-[#8B7D6F] leading-relaxed relative">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`text-center mt-8
            transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionDelay: '800ms' }}
        >
          <a
            href="#reservation"
            className="inline-flex items-center gap-2 text-[#C9A87C] font-medium hover:gap-4 transition-all duration-300
              group"
          >
            <span className="relative">
              Lihat jadwal poli
              <span
                className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C9A87C] 
                group-hover:w-full transition-all duration-300"
              />
            </span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  )
}

export default Services
