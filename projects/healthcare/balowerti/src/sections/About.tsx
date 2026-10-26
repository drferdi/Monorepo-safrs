// Architected and built by the one and only Drferdi.

import { ArrowRight, Clock, MapPin, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SITE_INFO } from '@/config/site'

const About = () => {
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
      { threshold: 0.2 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const stats = [
    { icon: Clock, value: '24', unit: 'JAM', label: 'Layanan IGD & Rawat Inap' },
    {
      icon: Users,
      value: '80+',
      unit: 'NAKES',
      label: 'Dokter, Perawat, Bidan & Tenaga Kesehatan',
    },
    { icon: MapPin, value: '5', unit: 'WILAYAH', label: 'Area Kerja' },
  ]

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative w-full pb-14 lg:pb-20 bg-[#F8F5F2] overflow-hidden"
      style={{ paddingTop: '60px' }}
    >
      <div className="px-6 lg:px-[7vw]">
        {/* Eyebrow */}
        <div
          className={`mb-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <span className="text-xs uppercase tracking-[0.2em] text-[#8B7D6F] font-medium">
            Tentang Kami
          </span>
        </div>

        {/* Top: 2 kolom */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start mb-12">
          {/* Kiri: teks */}
          <div
            className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '100ms' }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2420] leading-tight mb-4">
              UPTD Puskesmas <span className="text-[#C9A87C]">Poned Balowerti</span>
            </h2>
            <p className="text-sm lg:text-base text-[#8B7D6F] leading-relaxed mb-6 max-w-md">
              Mendedikasikan standar medis tertinggi bagi warga Kediri melalui integrasi nakes ahli
              dan fasilitas modern, menghadirkan ekosistem kesehatan primer yang solutif, responsif,
              dan terpercaya.
            </p>
            <a
              href="#services"
              className="inline-flex items-center gap-2 text-[#C9A87C] font-medium hover:gap-4 transition-all duration-300"
            >
              <span>Lihat layanan kami</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Kanan: stats card */}
          <div
            className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '200ms' }}
          >
            <div className="rounded-2xl border border-[#E9DDD0] bg-white/70 px-6 py-8 grid grid-cols-3 gap-4">
              {stats.map(s => (
                <div key={s.unit} className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#FAF3EB] flex items-center justify-center">
                    <s.icon className="w-4 h-4 text-[#C9A87C]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#2D2420] leading-none">{s.value}</p>
                    <p className="text-[10px] font-semibold tracking-widest text-[#8B7D6F] mt-0.5">
                      {s.unit}
                    </p>
                    <p className="text-xs text-[#8B7D6F] mt-1 leading-tight">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Foto gedung full width */}
        <div
          className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-[1.02]'}`}
          style={{ transitionDelay: '400ms' }}
        >
          <div className="relative w-full h-[300px] lg:h-[500px] rounded-[30px] overflow-hidden neo-card neo-card-hover">
            <img
              src="/images/puskesmas-building.avif"
              alt="Puskesmas Balowerti - Gedung Utama"
              width="1440"
              height="500"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2D2420]/40 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 lg:bottom-8 lg:left-8">
              <div className="frosted-glass rounded-xl px-5 py-4 neo-card">
                <p className="text-lg font-bold text-[#2D2420]">Puskesmas Balowerti</p>
                <p className="text-sm text-[#8B7D6F]">{SITE_INFO.address}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-[#C9A87C] animate-pulse" />
                  <span className="text-xs text-[#C9A87C] font-medium">
                    Pemerintah Kota Kediri - Dinas Kesehatan
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
