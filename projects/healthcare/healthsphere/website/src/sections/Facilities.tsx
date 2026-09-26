// Architected and built by the one and only Drferdi.
// Chief's Facilities Section - Real Photos from Puskesmas Balowerti

import { Clock, MapPin, Phone, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { OPERATIONAL_HOURS, SITE_INFO } from '@/config/site'
import { useParallax } from '../hooks/useParallax'

const AnimatedImage = ({
  src,
  alt,
  className = '',
  delay = 0,
  isVisible = false,
  parallaxSpeed = 0,
  children,
}: {
  src: string
  alt: string
  className?: string
  delay?: number
  isVisible?: boolean
  parallaxSpeed?: number
  children?: React.ReactNode
}) => {
  const [loaded, setLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { elementRef, offset } = useParallax(parallaxSpeed)

  return (
    <div
      ref={elementRef}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? `translateY(${offset}px) scale(1)` : 'translateY(40px) scale(0.95)',
        transition: `all 1s cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms`,
      }}
    >
      {!loaded && <div className="absolute inset-0 image-shimmer rounded-inherit" />}

      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover transition-all duration-700
          ${loaded ? 'opacity-100' : 'opacity-0'}
          ${hovered ? 'scale-110' : 'scale-100'}`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
          filter: hovered ? 'brightness(1.05)' : 'brightness(1)',
        }}
        onLoad={() => setLoaded(true)}
      />

      <div
        className="absolute inset-0 bg-gradient-to-t from-[#2D2420]/60 via-transparent to-transparent
          transition-opacity duration-500"
        style={{ opacity: hovered ? 0.8 : 0.4 }}
      />

      <div
        className="absolute inset-3 border-2 border-white/40 rounded-[20px] pointer-events-none
          transition-all duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'scale(1)' : 'scale(0.9)',
        }}
      />

      {children}
    </div>
  )
}

const EdgeCaption = ({
  label,
  delay = 0,
  isVisible = false,
  accent = false,
}: {
  label: string
  delay?: number
  isVisible?: boolean
  accent?: boolean
}) => {
  return (
    <div
      className={`absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#2D2420]/45 via-[#2D2420]/10 to-transparent" />
      <p
        className={`relative z-10 text-[10px] lg:text-[11px] uppercase tracking-[0.18em] font-light ${
          accent ? 'text-[#F2D9B5]' : 'text-white/90'
        }`}
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        {label}
      </p>
    </div>
  )
}

const Facilities = () => {
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
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="facilities"
      className="relative w-full py-14 lg:py-20 bg-[#F8F5F2] overflow-hidden neo-section"
    >
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[#C9A87C]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 float-gentle" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#C9A87C]/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 float-gentle-delay-2" />

      <div className="relative px-6 lg:px-[7vw]">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span
            className={`inline-block text-xs uppercase tracking-[0.3em] text-[#8B7D6F] font-medium mb-4
            transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            Fasilitas
          </span>
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2420] mb-6
            transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '100ms' }}
          >
            Fasilitas <span className="text-[#C9A87C]">Klinik</span>
          </h2>
          <p
            className={`text-base text-[#8B7D6F] leading-relaxed
            transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '200ms' }}
          >
            Ruang tunggu yang lapang, ruang periksa yang privat, dan peralatan yang terjaga
            kebersihannya.
          </p>
        </div>

        {/* Photo Grid - 6 Items Layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 auto-rows-[180px] lg:auto-rows-[220px]">
          {/* 1. Tim Puskesmas - Large Top Left */}
          <div className="group relative col-span-2 row-span-2">
            <AnimatedImage
              src="/images/tim.avif"
              alt="Tim Puskesmas Balowerti"
              className="w-full h-full rounded-[28px] neo-card neo-card-hover"
              delay={300}
              isVisible={isVisible}
              parallaxSpeed={0.2}
            >
              <EdgeCaption label="Tim Profesional" delay={500} isVisible={isVisible} />
            </AnimatedImage>
          </div>

          {/* 2. Ruang Tunggu - Top Right */}
          <div className="group relative col-span-2 row-span-1">
            <AnimatedImage
              src="/images/ruangtunggu.avif"
              alt="Ruang Tunggu Puskesmas Balowerti"
              className="w-full h-full rounded-[24px] neo-card neo-card-hover"
              delay={450}
              isVisible={isVisible}
              parallaxSpeed={0.15}
            >
              <EdgeCaption label="Ruang Tunggu" delay={650} isVisible={isVisible} />
            </AnimatedImage>
          </div>

          {/* 3. USG Promo - Highlight Card */}
          <div className="group relative col-span-1 row-span-1">
            <AnimatedImage
              src="/images/usg.avif"
              alt="Promo USG - Pemeriksaan USG"
              className="w-full h-full rounded-[24px] neo-card neo-card-hover"
              delay={600}
              isVisible={isVisible}
              parallaxSpeed={0.1}
            >
              {/* Promo Badge */}
              <div
                className={`absolute top-3 right-3 transition-all duration-700`}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'scale(1)' : 'scale(0.8)',
                  transitionDelay: '800ms',
                }}
              >
                <div className="bg-gradient-to-r from-[#C9A87C] to-[#B8976B] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  PROMO
                </div>
              </div>

              <EdgeCaption label="USG" delay={750} isVisible={isVisible} accent />
            </AnimatedImage>
          </div>

          {/* 4. Ruang Nifas Postpartum */}
          <div className="group relative col-span-1 row-span-1">
            <AnimatedImage
              src="/images/rawatinap.avif"
              alt="Ruang Nifas Postpartum"
              className="w-full h-full rounded-[24px] neo-card neo-card-hover"
              delay={750}
              isVisible={isVisible}
              parallaxSpeed={0.1}
            >
              <EdgeCaption label="Ruang Nifas" delay={850} isVisible={isVisible} />
            </AnimatedImage>
          </div>

          {/* 5. Rawat Inap - Bottom Row */}
          <div className="group relative col-span-2 row-span-1">
            <AnimatedImage
              src="/images/ranap.avif"
              alt="Ruang Rawat Inap"
              className="w-full h-full rounded-[24px] neo-card neo-card-hover"
              delay={900}
              isVisible={isVisible}
              parallaxSpeed={0.12}
            >
              <EdgeCaption label="Rawat Inap 24 Jam" delay={1000} isVisible={isVisible} />
            </AnimatedImage>
          </div>

          {/* 6. Poli KIA */}
          <div className="group relative col-span-2 row-span-1">
            <AnimatedImage
              src="/images/kia.avif"
              alt="Poli KIA - Kesehatan Ibu dan Anak"
              className="w-full h-full rounded-[24px] neo-card neo-card-hover"
              delay={1050}
              isVisible={isVisible}
              parallaxSpeed={0.1}
            >
              <EdgeCaption label="Poli KIA" delay={1150} isVisible={isVisible} />
            </AnimatedImage>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {[
            { icon: MapPin, title: 'Lokasi', desc: SITE_INFO.address, delay: 1200 },
            {
              icon: Clock,
              title: 'Jam Operasional',
              desc: OPERATIONAL_HOURS.clinicFull,
              delay: 1300,
            },
            { icon: Phone, title: 'Kontak', desc: SITE_INFO.phoneDisplay, delay: 1400 },
          ].map(item => (
            <div
              key={item.title}
              className={`frosted-glass rounded-2xl p-5 flex items-center gap-4 neo-card neo-card-hover
                transition-all duration-500 hover:-translate-y-1
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${item.delay}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-[#FAF3EB] flex items-center justify-center flex-shrink-0 neo-inset">
                <item.icon className="w-5 h-5 text-[#C9A87C]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#8B7D6F] mb-1">{item.title}</p>
                <p className="text-sm font-medium text-[#2D2420]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Facilities
