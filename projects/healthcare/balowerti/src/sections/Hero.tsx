// Architected and built by the one and only Drferdi.
// Hero Section - Efficient & Clean Design

import { buildWhatsAppUrl, DASHBOARD_URL, OPERATIONAL_HOURS } from '@/config/site'
import {
  Calendar,
  ChevronDown,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Siren,
  Stethoscope,
  User,
  Video,
} from 'lucide-react'
import { useEffect, useId, useState } from 'react'

type Mode = 'kunjungan' | 'telemedicine' | 'darurat'

interface SelectOption {
  id: string
  label: string
}

interface InputProps {
  id?: string
  icon?: React.ComponentType<{ className?: string }>
  type?: string
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  min?: string
}

interface TextareaProps {
  id?: string
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  rows?: number
  required?: boolean
}

interface SelectFieldProps {
  id?: string
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder: string
  compact?: boolean
  required?: boolean
}

const doctors = [
  {
    name: 'dr. Ferdi Iskandar',
    poli: 'Poli Umum',
    shift: OPERATIONAL_HOURS.doctorShift,
    img: '/images/ferdi.avif',
  },
  {
    name: 'dr. Cica Lusiana',
    poli: 'Poli Lansia',
    shift: OPERATIONAL_HOURS.doctorShift,
    img: '/images/cica.avif',
  },
  {
    name: 'dr. Rachmad Juni T.',
    poli: 'IGD',
    shift: OPERATIONAL_HOURS.emergency,
    img: '/images/rachmad.avif',
  },
  {
    name: 'drg. Endah Retno W.',
    poli: 'Poli Gigi',
    shift: OPERATIONAL_HOURS.doctorShift,
    img: '/images/endah.avif',
  },
]

const layananList: SelectOption[] = [
  { id: 'Poli Umum', label: 'Poli Umum' },
  { id: 'Poli Lansia', label: 'Poli Lansia' },
  { id: 'Poli Gigi', label: 'Poli Gigi' },
  { id: 'KIA', label: 'KIA / Anak' },
  { id: 'VCT', label: 'VCT' },
  { id: 'Laboratorium', label: 'Laboratorium' },
  { id: 'IGD', label: 'IGD' },
]

const poliList: SelectOption[] = [
  { id: 'Poli Umum', label: 'Poli Umum' },
  { id: 'Poli Gigi', label: 'Poli Gigi' },
  { id: 'Poli Lansia', label: 'Poli Lansia' },
  { id: 'KIA / Anak', label: 'KIA / Anak' },
  { id: 'Kesehatan Jiwa', label: 'Kesehatan Jiwa' },
]

const waktuList: SelectOption[] = [
  { id: '07:30 - 09:00', label: '07:30 - 09:00' },
  { id: '09:00 - 11:00', label: '09:00 - 11:00' },
  { id: '11:00 - 13:00', label: '11:00 - 13:00' },
  { id: '13:00 - 15:00', label: '13:00 - 15:00' },
  { id: '15:00 - 17:00', label: '15:00 - 17:00' },
]

function TabButton({
  icon: Icon,
  label,
  color,
  isActive,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-w-0 flex-1 rounded-xl px-2 py-2.5 text-[11px] font-semibold transition-all sm:px-3 sm:py-3 sm:text-sm ${
        isActive ? `${color} text-white shadow-lg` : 'text-[#8B7D6F] hover:text-[#2D2420]'
      }`}
    >
      <span className="flex items-center justify-center gap-1.5 sm:gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    </button>
  )
}

export default function Hero() {
  const [mode, setMode] = useState<Mode>('telemedicine')
  const [loaded, setLoaded] = useState(false)
  const [layanan, setLayanan] = useState('')
  const [showDoctors, setShowDoctors] = useState(false)

  // Form states
  const [form, setForm] = useState({ nama: '', hp: '', tanggal: '', waktu: '' })
  const [tele, setTele] = useState({ nama: '', usia: '', hp: '', poli: '', bpjs: '', keluhan: '' })
  const [onlineDoctors, setOnlineDoctors] = useState<string[]>([])
  const [teleSubmitting, setTeleSubmitting] = useState(false)
  const [teleSuccess, setTeleSuccess] = useState(false)
  const [teleError, setTeleError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const availableDoctors = layanan
    ? doctors.filter(
        (doctor) => doctor.poli.includes(layanan.replace('Poli ', '')) || layanan === 'IGD'
      )
    : []

  useEffect(() => {
    const timerId = window.setTimeout(() => setLoaded(true), 100)
    return () => window.clearTimeout(timerId)
  }, [])

  // Fetch dokter online dari dashboard
  useEffect(() => {
    const abortController = new AbortController()

    const loadOnlineDoctors = async () => {
      try {
        const response = await fetch(`${DASHBOARD_URL}/api/telemedicine/doctor-status`, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { doctors?: { doctorName: string }[] }
        setOnlineDoctors((data.doctors ?? []).map((doctor) => doctor.doctorName))
      } catch (error) {
        if ((error as DOMException).name !== 'AbortError') {
          setOnlineDoctors([])
        }
      }
    }

    void loadOnlineDoctors()
    return () => abortController.abort()
  }, [])

  const sendWA = (text: string) => window.open(buildWhatsAppUrl(text), '_blank')

  const handleKunjungan = () => {
    if (!layanan || !form.nama || !form.hp || !form.tanggal || !form.waktu) {
      alert('Lengkapi data reservasi terlebih dahulu.')
      return
    }

    sendWA(
      `*RESERVASI KUNJUNGAN*\n\nNama: ${form.nama}\nHP: ${form.hp}\nLayanan: ${layanan}\nTanggal: ${form.tanggal}\nWaktu: ${form.waktu}`
    )
  }

  const handleTele = async () => {
    if (!tele.nama || !tele.hp || !tele.keluhan) {
      alert('Lengkapi nama, HP, dan keluhan terlebih dahulu.')
      return
    }

    setTeleSubmitting(true)
    setTeleError(null)
    const waMsg = `*TELEMEDICINE*\n\nNama: ${tele.nama}\nUsia: ${tele.usia}\nHP: ${tele.hp}\nPoli: ${tele.poli || 'Poli Umum'}\nNo. BPJS / Register: ${tele.bpjs || '-'}\nKeluhan: ${tele.keluhan}\n\nRequest: dr. Ferdi Iskandar`

    const [requestResult] = await Promise.allSettled([
      fetch(`${DASHBOARD_URL}/api/telemedicine/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: tele.nama,
          usia: tele.usia,
          hp: tele.hp,
          poli: tele.poli || 'Poli Umum',
          bpjs: tele.bpjs,
          keluhan: tele.keluhan,
        }),
      }),
      Promise.resolve(sendWA(waMsg)),
    ])

    const requestSuccess = requestResult.status === 'fulfilled' && requestResult.value.ok

    setTeleSubmitting(false)
    if (!requestSuccess) {
      setTeleSuccess(false)
      setTeleError('Permintaan telemedicine gagal tersimpan. Silakan coba lagi.')
      return
    }

    setTeleSuccess(true)
    setTeleError(null)
    setTele({ nama: '', usia: '', hp: '', poli: '', bpjs: '', keluhan: '' })
    window.setTimeout(() => setTeleSuccess(false), 4000)
  }

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden bg-[#F8F5F2] pb-14 pt-16 sm:pb-16 sm:pt-[4.5rem] md:pb-20 md:pt-24"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(201,168,124,0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(201,168,124,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-20 top-20 h-96 w-96 rounded-full bg-[#C9A87C]/5 blur-3xl" />
        <div className="absolute bottom-20 left-20 h-72 w-72 rounded-full bg-[#C9A87C]/5 blur-3xl" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-[7vw]">
        <div
          className={`mx-auto mb-7 max-w-3xl text-center transition-all duration-700 sm:mb-8 md:mb-10 ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        >
          <span className="mb-3 inline-block rounded-full border border-[#EADDCB] bg-white/70 px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#8B7D6F] sm:mb-4">
            Puskesmas Balowerti Kediri
          </span>
          <h1 className="mb-3 text-[2rem] font-black leading-[1.08] text-[#2D2420] sm:mb-4 sm:text-5xl lg:text-6xl">
            Layanan kesehatan yang sigap,
            <br />
            <span className="text-[#C9A87C]">hangat, dan mudah dijangkau</span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-[#6F6257] sm:text-base sm:leading-7">
            Pendaftaran kunjungan, konsultasi telemedicine, dan bantuan gawat darurat tersedia dalam
            satu alur yang lebih jelas untuk warga Balowerti dan sekitarnya.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:mt-5">
            <span className="rounded-full border border-[#EADDCB] bg-white/80 px-3 py-1.5 text-[11px] font-medium text-[#6F6257]">
              Reservasi lebih cepat
            </span>
            <span className="rounded-full border border-[#EADDCB] bg-white/80 px-3 py-1.5 text-[11px] font-medium text-[#6F6257]">
              Telemedicine via WhatsApp
            </span>
            <span className="rounded-full border border-[#EADDCB] bg-white/80 px-3 py-1.5 text-[11px] font-medium text-[#6F6257]">
              IGD 24 jam
            </span>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2 lg:gap-8">
          <div
            className={`transition-all delay-100 duration-700 ${loaded ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'}`}
          >
            <div className="relative h-[360px] overflow-hidden rounded-[28px] border border-[#EADDCB] bg-gradient-to-br from-[#FAF3EB] to-[#F8F5F2] shadow-xl sm:h-[500px] lg:h-[560px]">
              <img
                src="/images/doc.avif"
                alt="Dokter Puskesmas Balowerti"
                width="600"
                height="560"
                className="h-full w-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="sync"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2D2420]/60 via-transparent to-transparent" />

              <div className="absolute bottom-3 left-3 right-3 grid grid-cols-2 gap-2.5 sm:bottom-6 sm:left-6 sm:right-6 sm:gap-3">
                <div className="rounded-2xl border border-[#EADDCB] bg-white/95 p-3 sm:p-4">
                  <Clock className="mb-1.5 h-4 w-4 text-[#C9A87C] sm:mb-2 sm:h-5 sm:w-5" />
                  <p className="text-[11px] text-[#8B7D6F] sm:text-xs">Jam Operasional</p>
                  <p className="text-xs font-bold text-[#2D2420] sm:text-sm">
                    {OPERATIONAL_HOURS.clinicWindow}
                  </p>
                  <p className="text-[10px] text-[#C9A87C]">{OPERATIONAL_HOURS.emergency}</p>
                </div>
                <div className="rounded-2xl border border-[#EADDCB] bg-white/95 p-3 sm:p-4">
                  <Stethoscope className="mb-1.5 h-4 w-4 text-[#C9A87C] sm:mb-2 sm:h-5 sm:w-5" />
                  <p className="text-[11px] text-[#8B7D6F] sm:text-xs">Tenaga Nakes</p>
                  <p className="text-xs font-bold text-[#2D2420] sm:text-sm">80+</p>
                  <p className="text-[10px] text-[#C9A87C]">
                    Dokter, perawat, bidan, dan tenaga kesehatan
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`transition-all delay-200 duration-700 ${loaded ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
          >
            <div className="flex min-h-[500px] flex-col rounded-[28px] border border-[#EADDCB] bg-white shadow-xl sm:min-h-[520px] lg:h-[560px]">
              <div className="m-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-[#FAF3EB]/60 p-1.5 sm:m-4 sm:gap-2 sm:p-2">
                <TabButton
                  icon={Video}
                  label="Telemedicine"
                  color="bg-[#2D2420]"
                  isActive={mode === 'telemedicine'}
                  onSelect={() => setMode('telemedicine')}
                />
                <TabButton
                  icon={MapPin}
                  label="Kunjungan"
                  color="bg-[#C9A87C]"
                  isActive={mode === 'kunjungan'}
                  onSelect={() => setMode('kunjungan')}
                />
                <TabButton
                  icon={Siren}
                  label="Darurat"
                  color="bg-red-600"
                  isActive={mode === 'darurat'}
                  onSelect={() => setMode('darurat')}
                />
              </div>

              <div className="flex-1 overflow-visible px-4 pb-4 sm:px-6 sm:pb-6 lg:overflow-y-auto">
                {mode === 'kunjungan' && (
                  <div className="space-y-3.5 sm:space-y-4">
                    <SelectField
                      icon={MapPin}
                      label="Layanan"
                      value={layanan}
                      onChange={(value) => {
                        setLayanan(value)
                        setShowDoctors(false)
                      }}
                      options={layananList}
                      placeholder="Pilih layanan yang dibutuhkan"
                      required
                    />

                    <div className="rounded-xl border border-[#C9A87C]/20 bg-[#C9A87C]/10 p-3.5 sm:p-4">
                      <p className="text-sm leading-relaxed text-[#2D2420]">
                        <span className="font-semibold">Informasi:</span> Datang 15 menit lebih awal
                        agar proses verifikasi dan antrean di loket berjalan lebih nyaman.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDoctors(true)}
                      data-magnetic
                      data-magnetic-strength="8"
                      disabled={!layanan}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2D2420] py-3 font-medium text-white transition-colors hover:bg-[#1C1917] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Clock className="h-4 w-4" />
                      Cari Jadwal Dokter
                    </button>

                    {showDoctors && layanan && (
                      <div className="space-y-2">
                        {availableDoctors.length > 0 ? (
                          availableDoctors.map((doctor) => (
                            <div
                              key={doctor.name}
                              className="flex items-center gap-3 rounded-xl border border-[#EADDCB] bg-[#FAF3EB]/70 p-3 transition-colors hover:border-[#C9A87C]/30"
                            >
                              <img
                                src={doctor.img}
                                alt={doctor.name}
                                width="40"
                                height="40"
                                loading="lazy"
                                decoding="async"
                                className="h-10 w-10 rounded-full border border-[#EADDCB] object-cover"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-[#2D2420]">
                                  {doctor.name}
                                </p>
                                <p className="text-xs text-[#8B7D6F]">
                                  {doctor.poli} • {doctor.shift}
                                </p>
                              </div>
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A87C]/10">
                                <ChevronDown className="-rotate-90 h-4 w-4 text-[#C9A87C]" />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-[#EADDCB] bg-[#FAF3EB]/55 p-4 text-sm text-[#8B7D6F]">
                            Jadwal dokter untuk layanan ini belum tampil di hero. Reservasi tetap
                            bisa dilanjutkan, dan tim loket akan membantu konfirmasi jadwal yang
                            tersedia.
                          </div>
                        )}
                      </div>
                    )}

                    {showDoctors && (
                      <div className="grid grid-cols-1 gap-3 border-t border-[#EADDCB] pt-4 sm:grid-cols-2">
                        <Input
                          icon={User}
                          label="Nama lengkap"
                          placeholder="Nama pasien"
                          value={form.nama}
                          onChange={(value) => setForm({ ...form, nama: value })}
                          required
                          autoComplete="name"
                        />
                        <Input
                          icon={Phone}
                          label="Nomor HP"
                          placeholder="08xxxxxxxxxx"
                          value={form.hp}
                          onChange={(value) => setForm({ ...form, hp: value })}
                          required
                          autoComplete="tel"
                          inputMode="tel"
                        />
                        <Input
                          icon={Calendar}
                          label="Tanggal kunjungan"
                          type="date"
                          value={form.tanggal}
                          onChange={(value) => setForm({ ...form, tanggal: value })}
                          required
                          min={today}
                        />
                        <SelectField
                          icon={Clock}
                          label="Jam kunjungan"
                          value={form.waktu}
                          onChange={(value) => setForm({ ...form, waktu: value })}
                          options={waktuList}
                          placeholder="Pilih waktu kunjungan"
                          compact
                          required
                        />
                      </div>
                    )}

                    {showDoctors && (
                      <button
                        type="button"
                        onClick={handleKunjungan}
                        data-magnetic
                        data-magnetic-strength="10"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C9A87C] py-3.5 font-semibold text-white shadow-lg shadow-[#C9A87C]/25 transition-all hover:bg-[#B8956A]"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Konfirmasi via WhatsApp
                      </button>
                    )}
                  </div>
                )}

                {mode === 'telemedicine' && (
                  <div className="space-y-3.5 sm:space-y-4">
                    <div className="flex items-start gap-3 rounded-xl border border-[#EADDCB] bg-[#FAF3EB] p-3.5 sm:p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2D2420]">
                        <Video className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-6 text-[#8B7D6F]">
                          <span className="font-semibold text-[#2D2420]">
                            Konsultasi dari rumah
                          </span>{' '}
                          untuk keluhan awal, tindak lanjut ringan, atau saat pasien belum sempat
                          datang langsung ke puskesmas.
                        </p>
                        {onlineDoctors.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {onlineDoctors.map((name) => (
                              <span
                                key={name}
                                className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700"
                              >
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-[#8B7D6F] opacity-60">
                            Dokter belum online saat ini, tetapi permintaan tetap diterima dan akan
                            ditindaklanjuti.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Input
                          icon={User}
                          label="Nama lengkap"
                          placeholder="Nama pasien"
                          value={tele.nama}
                          onChange={(value) => setTele({ ...tele, nama: value })}
                          required
                          autoComplete="name"
                        />
                      </div>
                      <Input
                        label="Usia"
                        placeholder="Contoh: 34"
                        value={tele.usia}
                        onChange={(value) => setTele({ ...tele, usia: value })}
                        inputMode="numeric"
                      />
                      <Input
                        icon={Phone}
                        label="Nomor HP"
                        placeholder="08xxxxxxxxxx"
                        value={tele.hp}
                        onChange={(value) => setTele({ ...tele, hp: value })}
                        required
                        autoComplete="tel"
                        inputMode="tel"
                      />
                    </div>

                    <SelectField
                      icon={Stethoscope}
                      label="Poli tujuan"
                      value={tele.poli}
                      onChange={(value) => setTele({ ...tele, poli: value })}
                      options={poliList}
                      placeholder="Pilih poli tujuan"
                    />

                    <Input
                      label="No. BPJS / Register"
                      placeholder="Opsional, bila tersedia"
                      value={tele.bpjs}
                      onChange={(value) => setTele({ ...tele, bpjs: value })}
                      autoComplete="off"
                    />

                    <TextareaField
                      label="Keluhan utama"
                      placeholder="Jelaskan keluhan yang sedang dirasakan"
                      value={tele.keluhan}
                      onChange={(value) => setTele({ ...tele, keluhan: value })}
                      rows={2}
                      required
                    />

                    {teleSuccess ? (
                      <div
                        role="status"
                        aria-live="polite"
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 py-3.5 text-sm font-semibold text-green-700"
                      >
                        ✓ Request terkirim! Cek WhatsApp Anda.
                      </div>
                    ) : (
                      <>
                        {teleError && (
                          <div
                            role="alert"
                            aria-live="assertive"
                            className="flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 py-3.5 text-sm font-semibold text-red-700"
                          >
                            {teleError}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleTele()}
                          disabled={teleSubmitting}
                          data-magnetic
                          data-magnetic-strength="10"
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2D2420] py-3.5 font-semibold text-white transition-all hover:bg-[#1C1917] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {teleSubmitting ? 'Mengirim...' : 'Kirim Permintaan Konsultasi'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {mode === 'darurat' && (
                  <div className="flex h-full flex-col items-center justify-center space-y-6 text-center">
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-600 shadow-xl shadow-red-500/40">
                        <Siren className="h-12 w-12 text-white" />
                      </div>
                      <div className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-red-500 animate-ping" />
                    </div>

                    <div>
                      <h3 className="mb-2 text-2xl font-bold text-red-700">Gawat Darurat</h3>
                      <p className="text-sm text-red-600">IGD siap 24 jam</p>
                      <p className="mx-auto mt-2 max-w-xs text-xs text-[#8B7D6F]">
                        Gunakan tombol ini saat membutuhkan bantuan segera. Sistem akan membantu
                        mengirim informasi lokasi ke petugas IGD.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              const mapsUrl = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`
                              sendWA(
                                `*🚨 ALERT DARURAT IGD 🚨*\n\nLokasi Pasien:\n${mapsUrl}\n\nMohon bantuan segera!`
                              )
                            },
                            () => {
                              sendWA(
                                `*🚨 ALERT DARURAT IGD 🚨*\n\nPasien membutuhkan bantuan segera!\n\nMohon hubungi kembali untuk lokasi.\n\nTerima kasih.`
                              )
                            }
                          )
                        } else {
                          sendWA(
                            `*🚨 ALERT DARURAT IGD 🚨*\n\nPasien membutuhkan bantuan segera!\n\nMohon hubungi kembali untuk lokasi.`
                          )
                        }
                      }}
                      data-magnetic
                      data-magnetic-strength="12"
                      className="flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-red-600 py-5 text-lg font-bold text-white shadow-2xl shadow-red-500/40 transition-transform hover:scale-[1.02] hover:bg-red-700"
                    >
                      <Siren className="h-6 w-6" />
                      Hubungi Petugas IGD
                    </button>

                    <div className="flex items-center gap-2 text-red-600">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-sm font-medium">Respons &lt; 5 menit</span>
                    </div>

                    <p className="text-[10px] text-[#8B7D6F]">
                      Sistem akan otomatis mengirim lokasi pasien ke petugas IGD.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FieldLabel({
  htmlFor,
  label,
  required = false,
  className = '',
}: {
  htmlFor: string
  label: string
  required?: boolean
  className?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-xs font-medium uppercase tracking-[0.12em] text-[#8B7D6F] ${className}`.trim()}
    >
      {label}
      {required && <span className="ml-1 text-[#C9A87C]">*</span>}
    </label>
  )
}

function Input({
  id,
  icon: Icon,
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  required = false,
  autoComplete,
  inputMode,
  min,
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={inputId} label={label} required={required} />
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B7D6F]" />
        )}
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border border-[#EADDCB] bg-[#FAF3EB]/50 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/30 ${Icon ? 'pl-10' : 'pl-3'} pr-3`}
        />
      </div>
    </div>
  )
}

function TextareaField({
  id,
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
  required = false,
}: TextareaProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId

  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={textareaId} label={label} required={required} />
      <textarea
        id={textareaId}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full resize-none rounded-xl border border-[#EADDCB] bg-[#FAF3EB]/50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/30"
      />
    </div>
  )
}

function SelectField({
  id,
  icon: Icon,
  label,
  value,
  onChange,
  options,
  placeholder,
  compact = false,
  required = false,
}: SelectFieldProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <div className="space-y-2">
      <FieldLabel
        htmlFor={selectId}
        label={label}
        required={required}
        className={compact ? 'sr-only' : ''}
      />
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B7D6F]" />
        )}
        <select
          id={selectId}
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full appearance-none rounded-xl border border-[#EADDCB] bg-white/90 text-sm text-[#2D2420] shadow-sm transition-colors hover:border-[#C9A87C]/40 focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/20 ${Icon ? 'pl-10' : 'pl-3'} pr-10 ${compact ? 'py-2.5' : 'py-3'}`}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B7D6F]" />
      </div>
    </div>
  )
}
