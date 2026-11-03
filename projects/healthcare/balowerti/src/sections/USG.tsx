// Architected and built by the one and only Drferdi.
// USG Section - Dedicated Ultrasound Service Information
// Elegant layout with comprehensive information about USG services

import {
  Baby,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  HeartPulse,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const USG = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'schedule' | 'who' | 'prepare'>('schedule')

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

  const tabs = [
    { id: 'schedule' as const, label: 'Jadwal', icon: Calendar },
    { id: 'who' as const, label: 'Siapa Saja', icon: Users },
    { id: 'prepare' as const, label: 'Persiapan', icon: CheckCircle2 },
  ]

  const scheduleInfo = [
    { day: 'Senin - Jumat', time: '08.00 - 14.00 WIB', note: 'Pemeriksaan reguler' },
    { day: 'Sabtu', time: '08.00 - 12.00 WIB', note: 'Pemeriksaan sampai siang' },
    { day: 'Minggu', time: 'Tutup', note: 'Libur operasional' },
  ]

  const whoCanDo = [
    {
      icon: Baby,
      title: 'Ibu Hamil',
      desc: 'Trimester 1 dan 3 untuk memantau perkembangan janin',
      highlight: true,
    },
    {
      icon: HeartPulse,
      title: 'Pasien Umum',
      desc: 'Pemeriksaan organ abdomen, ginjal, hati, dan kantong empedu',
      highlight: false,
    },
    {
      icon: Stethoscope,
      title: 'Rujukan Dokter',
      desc: 'Pasien dengan rujungan dokter untuk diagnosis lebih lanjut',
      highlight: false,
    },
  ]

  const preparations = [
    'Datang dengan perut kosong (puasa 4-6 jam) untuk USG abdomen',
    'Minum banyak air dan menahan pipis untuk USG kehamilan',
    'Bawa rujukan dokter jika ada',
    'Bawa KTP/KK untuk administrasi',
    'Kenakan pakaian longgar dan nyaman',
  ]

  return (
    <section
      ref={sectionRef}
      id="usg"
      className="relative w-full py-14 lg:py-20 bg-gradient-to-b from-[#FAF8F6] to-[#F8F5F2] overflow-hidden neo-section"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C9A87C]/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#C9A87C]/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

      {/* Floating Decorative Circles */}
      <div
        className={`absolute top-20 left-[10%] w-20 h-20 border border-[#C9A87C]/20 rounded-full transition-all duration-1000 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
        style={{ transitionDelay: '200ms' }}
      />
      <div
        className={`absolute bottom-32 right-[15%] w-32 h-32 border border-[#C9A87C]/15 rounded-full transition-all duration-1000 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
        style={{ transitionDelay: '400ms' }}
      />

      <div className="relative px-6 lg:px-[7vw]">
        {/* Header Section */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          {/* Promo Badge */}
          <div
            className={`inline-flex items-center gap-2 bg-gradient-to-r from-[#C9A87C] to-[#B8976B] text-white px-4 py-2 rounded-full mb-6 shadow-lg transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-wide">LAYANAN TERBARU</span>
          </div>

          {/* Main Title */}
          <h2
            className={`text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2D2420] mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '100ms', fontFamily: "'Playfair Display', serif" }}
          >
            Pemeriksaan <span className="text-[#C9A87C]">USG</span>
          </h2>

          {/* Subtitle */}
          <p
            className={`text-lg text-[#8B7D6F] leading-relaxed transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            Layanan ultrasonografi modern dengan peralatan terkini dan tenaga ahli berpengalaman.
            Tersedia untuk pemeriksaan kehamilan dan diagnosis organ dalam.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto">
          {/* Left: Image & Quick Info */}
          <div
            className={`transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            {/* Main Image */}
            <div className="relative rounded-[28px] overflow-hidden neo-card neo-card-hover group">
              <img
                src="/images/usg.avif"
                alt="Layanan USG Puskesmas Balowerti"
                width="800"
                height="500"
                loading="lazy"
                decoding="async"
                className="w-full h-[400px] lg:h-[500px] object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#2D2420]/80 via-[#2D2420]/20 to-transparent" />

              {/* Floating Info Card */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="frosted-glass rounded-2xl p-5 neo-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A87C] to-[#B8976B] flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2D2420]">Jam Operasional USG</p>
                      <p className="text-xs text-[#8B7D6F]">Senin - Sabtu</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-white/50 rounded-lg px-3 py-2 neo-inset">
                      <p className="text-xs text-[#8B7D6F]">Senin-Jumat</p>
                      <p className="text-sm font-bold text-[#2D2420]">08.00 - 14.00</p>
                    </div>
                    <div className="bg-white/50 rounded-lg px-3 py-2 neo-inset">
                      <p className="text-xs text-[#8B7D6F]">Sabtu</p>
                      <p className="text-sm font-bold text-[#2D2420]">08.00 - 12.00</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Corner Badge */}
              <div className="absolute top-6 right-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                  <p className="text-xs font-semibold text-[#C9A87C]">✓ BPJS & Umum</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { value: '15+', label: 'Menit', desc: 'Durasi periksa' },
                { value: '2D', label: 'USG', desc: 'Standar kualitas' },
                { value: '100%', label: 'Aman', desc: 'Non-radiasi' },
              ].map((stat, idx) => (
                <div
                  key={stat.label}
                  className={`text-center p-4 frosted-glass rounded-2xl neo-card transition-all duration-700 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}
                  style={{ transitionDelay: `${500 + idx * 100}ms` }}
                >
                  <p className="text-2xl font-bold text-[#C9A87C]">{stat.value}</p>
                  <p className="text-sm font-semibold text-[#2D2420]">{stat.label}</p>
                  <p className="text-xs text-[#8B7D6F]">{stat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Tabbed Information */}
          <div
            className={`transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8 p-1.5 bg-[#F0EBE6] rounded-2xl neo-control">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-white shadow-md text-[#C9A87C] neo-card'
                      : 'text-[#8B7D6F] hover:text-[#2D2420]'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[#C9A87C]' : ''}`} />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {/* Schedule Tab */}
              {activeTab === 'schedule' && (
                <div className="space-y-4 animate-fadeIn">
                  <h3
                    className="text-2xl font-bold text-[#2D2420] mb-6"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Jadwal Pemeriksaan USG
                  </h3>

                  {scheduleInfo.map((item, idx) => (
                    <div
                      key={item.day}
                      className={`p-5 rounded-2xl border transition-all duration-500 hover:shadow-md neo-card-hover ${
                        item.day === 'Minggu'
                          ? 'bg-[#FDF8F3] border-[#C9A87C]/30 neo-card'
                          : 'bg-white border-[#E8E3DE] neo-card'
                      }`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              item.day === 'Minggu' ? 'bg-[#FAF3EB]' : 'bg-[#FAF3EB]'
                            }`}
                          >
                            <Calendar
                              className={`w-5 h-5 ${
                                item.day === 'Minggu' ? 'text-[#C9A87C]/60' : 'text-[#C9A87C]'
                              }`}
                            />
                          </div>
                          <div>
                            <p
                              className={`font-semibold ${
                                item.day === 'Minggu' ? 'text-[#8B7D6F]' : 'text-[#2D2420]'
                              }`}
                            >
                              {item.day}
                            </p>
                            <p className="text-sm text-[#8B7D6F]">{item.note}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold ${
                              item.day === 'Minggu' ? 'text-[#C9A87C]/60' : 'text-[#C9A87C]'
                            }`}
                          >
                            {item.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 p-4 bg-[#FAF3EB] rounded-xl border border-[#C9A87C]/20 neo-control">
                    <p className="text-sm text-[#8B7D6F]">
                      <span className="font-semibold text-[#C9A87C]">Catatan:</span> Untuk hasil
                      optimal, datanglah 15 menit lebih awal untuk registrasi dan persiapan.
                    </p>
                  </div>
                </div>
              )}

              {/* Who Can Do Tab */}
              {activeTab === 'who' && (
                <div className="space-y-4 animate-fadeIn">
                  <h3
                    className="text-2xl font-bold text-[#2D2420] mb-6"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Siapa Saja yang Bisa USG?
                  </h3>

                  {whoCanDo.map(item => (
                    <div
                      key={item.title}
                      className={`p-5 rounded-2xl border transition-all duration-500 hover:shadow-md neo-card-hover ${
                        item.highlight
                          ? 'bg-gradient-to-r from-[#FAF3EB] to-white border-[#C9A87C]/30 neo-card'
                          : 'bg-white border-[#E8E3DE] neo-card'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            item.highlight ? 'bg-[#C9A87C]' : 'bg-[#FAF3EB]'
                          }`}
                        >
                          <item.icon
                            className={`w-5 h-5 ${item.highlight ? 'text-white' : 'text-[#C9A87C]'}`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-[#2D2420]">{item.title}</p>
                            {item.highlight && (
                              <span className="text-[10px] bg-[#C9A87C] text-white px-2 py-0.5 rounded-full">
                                POPULER
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#8B7D6F] leading-relaxed">{item.desc}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#C9A87C] flex-shrink-0" />
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 p-4 bg-white rounded-xl border border-[#E8E3DE] neo-control">
                    <p className="text-sm text-[#8B7D6F]">
                      <span className="font-semibold text-[#C9A87C]">Informasi:</span> Semua
                      pemeriksaan dilakukan oleh tenaga ahli bersertifikat dengan peralatan USG
                      modern 2D terbaru.
                    </p>
                  </div>
                </div>
              )}

              {/* Preparation Tab */}
              {activeTab === 'prepare' && (
                <div className="space-y-4 animate-fadeIn">
                  <h3
                    className="text-2xl font-bold text-[#2D2420] mb-6"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Persiapan Sebelum USG
                  </h3>

                  <div className="space-y-3">
                    {preparations.map((prep, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-4 p-4 bg-white rounded-xl border border-[#E8E3DE] transition-all duration-300 hover:border-[#C9A87C]/30 hover:shadow-sm neo-control"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#C9A87C]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 text-[#C9A87C]" />
                        </div>
                        <p className="text-[#2D2420] text-sm leading-relaxed">{prep}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#FAF3EB] rounded-xl neo-control">
                      <p className="text-xs text-[#8B7D6F] mb-1">USG Kehamilan</p>
                      <p className="text-sm font-semibold text-[#2D2420]">Minum 3-4 gelas air</p>
                      <p className="text-xs text-[#8B7D6F] mt-1">30 menit sebelum pemeriksaan</p>
                    </div>
                    <div className="p-4 bg-[#F0F7FF] rounded-xl neo-control">
                      <p className="text-xs text-[#8B7D6F] mb-1">USG Abdomen</p>
                      <p className="text-sm font-semibold text-[#2D2420]">Puasa 4-6 jam</p>
                      <p className="text-xs text-[#8B7D6F] mt-1">Makanan & minuman manis</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <div className="mt-8">
              <a
                href="#reservation"
                className="group inline-flex items-center justify-center w-full gap-3 bg-gradient-to-r from-[#C9A87C] to-[#B8976B] text-white font-semibold py-4 px-8 rounded-2xl shadow-lg shadow-[#C9A87C]/25 hover:shadow-xl hover:shadow-[#C9A87C]/30 transition-all duration-300 neo-card-hover"
              >
                <Calendar className="w-5 h-5" />
                <span>Reservasi Jadwal USG</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <p className="text-center text-xs text-[#8B7D6F] mt-3">
                Reservasi online tersedia 24 jam • Konfirmasi via WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animation Style */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </section>
  )
}

export default USG
