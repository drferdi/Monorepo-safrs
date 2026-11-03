// Architected and built by the one and only Drferdi.
// Chief's Reservation Section - Zen Queue System & Informative Wait-Time

import { Calendar, CheckCircle2, Clock, Phone, User, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { buildWhatsAppUrl, OPERATIONAL_HOURS, QUEUE_INFO } from '@/config/site'
import { z } from 'zod'

const regularSchema = z.object({
  nama: z.string().min(3, 'Nama lengkap minimal 3 karakter.'),
  noHp: z.string().regex(/^08[0-9]{7,11}$/, 'Nomor HP tidak valid (harus diawali 08 dan 9-13 digit).').or(z.literal('').transform(() => '-')),
  layanan: z.string().min(1, 'Mohon pilih layanan.'),
  tanggal: z.string().min(1, 'Mohon pilih tanggal kunjungan.'),
  waktu: z.string().min(1, 'Mohon pilih waktu kunjungan.')
})

const telemedicineSchema = z.object({
  nama: z.string().min(3, 'Nama lengkap minimal 3 karakter.'),
  noHp: z.string().regex(/^08[0-9]{7,11}$/, 'Nomor HP tidak valid (harus diawali 08 dan 9-13 digit).'),
  usia: z.number().min(0, 'Usia tidak valid.').max(120, 'Usia tidak valid.'),
  poli: z.string().min(1, 'Mohon pilih poli.'),
  bpjs: z.string().optional(),
  keluhan: z.string().min(10, 'Keluhan minimal 10 karakter.')
})

const Reservation = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [nama, setNama] = useState('')
  const [noHp, setNoHp] = useState('')
  const [layanan, setLayanan] = useState('')
  const [tanggal, setTanggal] = useState('')
  const [waktu, setWaktu] = useState('')
  const [keluhan, setKeluhan] = useState('')
  const [usia, setUsia] = useState('')
  const [poli, setPoli] = useState('')
  const [bpjs, setBpjs] = useState('')
  const [consent, setConsent] = useState(false)

  const isTelemedicine = layanan === 'Konsultasi Online (Telemedicine)'

  function handleReservasi() {
    if (!consent) {
      alert('Mohon setujui Kebijakan Privasi sebelum melanjutkan.')
      return
    }

    if (isTelemedicine) {
      const result = telemedicineSchema.safeParse({
        nama,
        noHp,
        usia: usia === '' ? -1 : Number(usia),
        poli: poli || 'Poli Umum',
        bpjs,
        keluhan
      })
      if (!result.success) {
        alert(result.error.errors[0].message)
        return
      }
    } else {
      const result = regularSchema.safeParse({
        nama,
        noHp,
        layanan,
        tanggal,
        waktu
      })
      if (!result.success) {
        alert(result.error.errors[0].message)
        return
      }
    }

    let msg: string
    if (isTelemedicine) {
      const lines = [
        '*TELEMEDICINE*',
        '',
        'Nama: ' + nama,
        'Usia: ' + usia,
        'HP: ' + (noHp || '-'),
        'Poli: ' + (poli || 'Poli Umum'),
        'No. BPJS / Register: ' + (bpjs || '-'),
        'Keluhan: ' + keluhan,
        '',
        'Request: dr. Ferdi Iskandar',
      ]
      msg = lines.join('\n')
    } else {
      msg =
        `Halo Puskesmas Balowerti, saya ingin reservasi:\n\n` +
        `👤 Nama: ${nama}\n` +
        `📞 No HP: ${noHp || '-'}\n` +
        `🏥 Layanan: ${layanan}\n` +
        `📅 Tanggal: ${tanggal}\n` +
        `⏰ Waktu: ${waktu}\n\n` +
        `Mohon konfirmasinya. Terima kasih 🙏`
    }
    const url = buildWhatsAppUrl(msg)
    window.open(url, `wa_${Date.now()}`)
  }

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

  const renderZenOrbs = () => {
    const orbs = []
    const totalOrbs = 8
    const activeOrbs = QUEUE_INFO.realtimeEnabled ? 6 : 3

    for (let i = 0; i < totalOrbs; i++) {
      const isActive = i < activeOrbs
      orbs.push(
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-all duration-700 ${
            isActive ? 'zen-orb animate-pulse' : 'bg-[#FAF3EB]'
          }`}
          style={{
            animationDelay: `${i * 150}ms`,
            opacity: isActive ? 0.8 + i * 0.025 : 0.3,
          }}
        />
      )
    }
    return orbs
  }

  return (
    <section
      ref={sectionRef}
      id="reservation"
      className="relative w-full py-14 lg:py-20 bg-[#F8F5F2] neo-section"
    >
      <div className="px-6 lg:px-[7vw]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div
            className={`relative transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
            }`}
          >
            <div className="relative mx-auto lg:mx-0 w-full max-w-[450px] aspect-[3/4] rounded-[30px] overflow-hidden neo-card neo-card-hover">
              <img
                src="/images/reservation-portrait.avif"
                alt="Staf kesehatan Puskesmas Balowerti"
                width="450"
                height="600"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2D2420]/30 to-transparent" />

              <div className="absolute bottom-8 left-8 right-8">
                <div className="frosted-glass rounded-2xl px-6 py-4 neo-card">
                  <p className="text-lg font-bold text-[#2D2420]">Kesehatan Anda, Nafas Kami</p>
                  <p className="text-sm text-[#8B7D6F] mt-1">
                    Reservasi online untuk pelayanan terbaik
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div
              className={`mb-8 transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: '100ms' }}
            >
              <span className="text-xs uppercase tracking-[0.2em] text-[#8B7D6F] font-medium">
                Reservasi
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2420] mt-4 mb-4">
                Reservasi <span className="text-[#C9A87C]">Online</span>
              </h2>
              <p className="text-base text-[#8B7D6F] leading-relaxed">
                Isi data singkat, pilih layanan, dan dapatkan estimasi waktu pelayanan.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs bg-[#FAF3EB] text-[#8B7D6F] px-3 py-1.5 rounded-full">
                  🕐 {OPERATIONAL_HOURS.clinicCompact}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-full">
                  🚨 {OPERATIONAL_HOURS.emergency}
                </span>
              </div>
            </div>

            <div
              className={`frosted-glass rounded-[28px] p-6 lg:p-8 neo-card neo-card-hover mb-6
                transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}
              style={{ transitionDelay: '200ms' }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="rsv-nama"
                    className="block text-xs uppercase tracking-wider text-[#8B7D6F] mb-2"
                  >
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7D6F]"
                      aria-hidden="true"
                    />
                    <input
                      id="rsv-nama"
                      type="text"
                      placeholder="Masukkan nama lengkap"
                      value={nama}
                      onChange={e => setNama(e.target.value)}
                      className="w-full bg-white/50 border border-[#FAF3EB] rounded-xl pl-10 pr-4 py-3 text-sm text-[#2D2420] placeholder:text-[#8B7D6F]/50 focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/30 transition-all neo-control"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rsv-nohp"
                    className="block text-xs uppercase tracking-wider text-[#8B7D6F] mb-2"
                  >
                    Nomor HP
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7D6F]"
                      aria-hidden="true"
                    />
                    <input
                      id="rsv-nohp"
                      type="tel"
                      placeholder="0812xxxxxxx"
                      value={noHp}
                      onChange={e => setNoHp(e.target.value)}
                      className="w-full bg-white/50 border border-[#FAF3EB] rounded-xl pl-10 pr-4 py-3 text-sm text-[#2D2420] placeholder:text-[#8B7D6F]/50 focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/30 transition-all neo-control"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rsv-layanan"
                    className="block text-xs uppercase tracking-wider text-[#8B7D6F] mb-2"
                  >
                    Layanan
                  </label>
                  <div className="relative">
                    <CheckCircle2
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7D6F]"
                      aria-hidden="true"
                    />
                    <select
                      id="rsv-layanan"
                      value={layanan}
                      onChange={e => setLayanan(e.target.value)}
                      className="w-full bg-white/50 border border-[#FAF3EB] rounded-xl pl-10 pr-8 py-3 text-sm text-[#2D2420] appearance-none focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/30 transition-all neo-control"
                    >
                      <option value="">Pilih Layanan</option>
                      <option>Konsultasi Online (Telemedicine)</option>
                      <option disabled>──────────────</option>
                      <option>Poli Umum</option>
                      <option>Poli Gigi</option>
                      <option>KIA</option>
                      <option>Laboratorium</option>
                      <option>Imunisasi</option>
                      <option>KB</option>
                      <option>Kesehatan Jiwa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rsv-tanggal"
                    className="block text-xs uppercase tracking-wider text-[#8B7D6F] mb-2"
                  >
                    Tanggal
                  </label>
                  <div className="relative">
                    <Calendar
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7D6F]"
                      aria-hidden="true"
                    />
                    <input
                      id="rsv-tanggal"
                      type="date"
                      value={tanggal}
                      onChange={e => setTanggal(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-white/50 border border-[#FAF3EB] rounded-xl pl-10 pr-4 py-3 text-sm text-[#2D2420] focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/30 transition-all neo-control"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rsv-waktu"
                    className="block text-xs uppercase tracking-wider text-[#8B7D6F] mb-2"
                  >
                    Waktu
                  </label>
                  <div className="relative">
                    <Clock
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7D6F]"
                      aria-hidden="true"
                    />
                    <select
                      id="rsv-waktu"
                      value={waktu}
                      onChange={e => setWaktu(e.target.value)}
                      className="w-full bg-white/50 border border-[#FAF3EB] rounded-xl pl-10 pr-8 py-3 text-sm text-[#2D2420] appearance-none focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/30 transition-all neo-control"
                    >
                      <option value="">Pilih Waktu</option>
                      <option>07:30 - 09:00</option>
                      <option>09:00 - 11:00</option>
                      <option>11:00 - 13:00</option>
                      <option>13:00 - 15:00</option>
                      <option>15:00 - 17:00</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Field tambahan telemedicine — always in DOM, shown/hidden via style */}
              <div
                style={{
                  display: isTelemedicine ? 'flex' : 'none',
                  flexDirection: 'column',
                  gap: 16,
                  marginTop: 8,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label
                    htmlFor="rsv-usia"
                    style={{
                      display: 'block',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#8B7D6F',
                      marginBottom: 8,
                    }}
                  >
                    Usia *
                  </label>
                  <input
                    id="rsv-usia"
                    type="number"
                    min={1}
                    max={120}
                    placeholder="Contoh: 30"
                    value={usia}
                    onChange={e => setUsia(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      border: '1px solid #C9A87C',
                      borderRadius: 12,
                      fontSize: 14,
                      color: '#2D2420',
                      background: 'rgba(255,255,255,0.6)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="rsv-poli"
                    style={{
                      display: 'block',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#8B7D6F',
                      marginBottom: 8,
                    }}
                  >
                    Poli
                  </label>
                  <select
                    id="rsv-poli"
                    value={poli}
                    onChange={e => setPoli(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      border: '1px solid #C9A87C',
                      borderRadius: 12,
                      fontSize: 14,
                      color: '#2D2420',
                      background: 'rgba(255,255,255,0.6)',
                      outline: 'none',
                    }}
                  >
                    <option value="Poli Umum">Poli Umum</option>
                    <option value="Poli Gigi">Poli Gigi</option>
                    <option value="KIA">KIA</option>
                    <option value="Kesehatan Jiwa">Kesehatan Jiwa</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="rsv-bpjs"
                    style={{
                      display: 'block',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#8B7D6F',
                      marginBottom: 8,
                    }}
                  >
                    No. BPJS / Register
                  </label>
                  <input
                    id="rsv-bpjs"
                    type="text"
                    placeholder="Nomor BPJS atau nomor register pasien..."
                    value={bpjs}
                    onChange={e => setBpjs(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      border: '1px solid #C9A87C',
                      borderRadius: 12,
                      fontSize: 14,
                      color: '#2D2420',
                      background: 'rgba(255,255,255,0.6)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="rsv-keluhan"
                    style={{
                      display: 'block',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#8B7D6F',
                      marginBottom: 8,
                    }}
                  >
                    Keluhan *
                  </label>
                  <textarea
                    id="rsv-keluhan"
                    rows={3}
                    placeholder="Contoh: Nyeri kepala 2 hari, mual muntah..."
                    value={keluhan}
                    onChange={e => setKeluhan(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      border: '1px solid #C9A87C',
                      borderRadius: 12,
                      fontSize: 14,
                      color: '#2D2420',
                      background: 'rgba(255,255,255,0.6)',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    background: 'rgba(201,168,124,0.1)',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}
                >
                  <Video size={14} style={{ color: '#C9A87C', marginTop: 2, flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: '#8B7D6F', margin: 0 }}>
                    Admin akan menghubungi Anda untuk konfirmasi jadwal dan mengirimkan link
                    konsultasi video.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 mb-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#C9A87C] accent-[#C9A87C] flex-shrink-0 cursor-pointer"
                />
                <span className="text-xs text-[#8B7D6F]/80 leading-relaxed group-hover:text-[#8B7D6F] transition-colors">
                  Saya menyetujui{' '}
                  <a
                    href="/kebijakan-privasi.html"
                    onClick={e => e.stopPropagation()}
                    className="text-[#C9A87C] underline hover:text-[#B8956A]"
                  >
                    Kebijakan Privasi
                  </a>{' '}
                  dan mengizinkan Puskesmas Balowerti memproses data saya untuk keperluan pelayanan
                  kesehatan.
                </span>
              </label>

              <button
                onClick={handleReservasi}
                disabled={!consent}
                data-magnetic
                data-magnetic-strength="10"
                className={`w-full text-white font-medium py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 neo-card-hover ${
                  !consent
                    ? 'opacity-50 cursor-not-allowed bg-[#8B7D6F]'
                    : isTelemedicine
                      ? 'bg-[#2D7D9A] hover:bg-[#256B85] hover:shadow-lg hover:shadow-[#2D7D9A]/20'
                      : 'bg-[#C9A87C] hover:bg-[#B8956A] hover:shadow-lg hover:shadow-[#C9A87C]/20'
                }`}
              >
                {isTelemedicine ? (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Ajukan Konsultasi Online</span>
                  </>
                ) : (
                  <span>💬 Konfirmasi via WhatsApp</span>
                )}
              </button>
            </div>

            <div
              className={`frosted-glass rounded-[28px] p-6 neo-card
                transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '350ms' }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-wider text-[#8B7D6F]">Kondisi saat ini</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#C9A87C] animate-pulse" />
                  <span className="text-sm font-medium text-[#C9A87C]">
                    {QUEUE_INFO.realtimeEnabled ? 'Real-time' : 'Info Manual'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex gap-2">{renderZenOrbs()}</div>
                <span className="text-sm text-[#8B7D6F]">
                  Antrian poli umum:{' '}
                  <span className="font-medium text-[#2D2420]">{QUEUE_INFO.queueSnapshot}</span>
                </span>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#FAF3EB]">
                <Clock className="w-5 h-5 text-[#C9A87C]" />
                <span className="text-sm text-[#8B7D6F]">
                  Estimasi tunggu:{' '}
                  <span className="font-medium text-[#2D2420]">{QUEUE_INFO.waitEstimate}</span>
                </span>
              </div>
              <p className="text-xs text-[#8B7D6F] mt-2">{QUEUE_INFO.note}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Reservation
