// Architected and built by the one and only Drferdi.
// Chief's Testimonials Section - Sinkronisasi Google Reviews

import { ArrowRight, ExternalLink, PencilLine, Quote, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Testimonial = {
  quote: string
  name: string
  role: string
  avatar: string
  rating: number
  date: string
}

type GoogleReviewItem = {
  authorName?: string
  rating?: number
  relativeTimeDescription?: string
  text?: string
  authorAttribution?: {
    displayName?: string
  }
}

type GoogleReviewPayload = {
  updatedAt?: string
  place?: {
    id?: string
    name?: string
    rating?: number
    userRatingCount?: number
    googleMapsUri?: string
    reviewPageUri?: string
    writeReviewUri?: string
  }
  reviews?: GoogleReviewItem[]
}

const GOOGLE_REVIEW_PAGE_URL =
  'https://www.google.com/search?q=puskesmas+balowerti&oq=puskesmas+ba&gs_lcrp=EgZjaHJvbWUqDggAEEUYJxg7GIAEGIoFMg4IABBFGCcYOxiABBiKBTIICAEQRRgnGDsyBggCEEUYOTINCAMQLhivARjHARiABDINCAQQLhivARjHARiABDINCAUQLhivARjHARiABDIHCAYQABiABDIGCAcQRRg90gEIMjg0OWowajeoAgCwAgA&sourceid=chrome&ie=UTF-8#lrd=0x2e78573cbf91501f:0xd80210a4dfdeef47,1,,,,'

const fallbackTestimonials: Testimonial[] = [
  {
    quote:
      'Proses reservasinya mudah, datang, scan, langsung dilayani. Tidak perlu antri lama dan petugasnya ramah.',
    name: 'Rina Sutanto',
    role: 'Warga Balowerti',
    avatar: 'RS',
    rating: 5,
    date: '2 minggu lalu',
  },
  {
    quote:
      'Dokternya menjelaskan dengan sabar sehingga saya paham cara minum obat. Sangat direkomendasikan untuk keluarga.',
    name: 'Budi Hartono',
    role: 'Warga Semampir',
    avatar: 'BH',
    rating: 5,
    date: '1 bulan lalu',
  },
  {
    quote:
      'Poli umumnya asik, dokternya komunikatif dan santai tapi tetap detail. Konsultasi terasa nyaman dan tidak tegang.',
    name: 'Mulyani',
    role: 'Pegawai Swasta',
    avatar: 'MU',
    rating: 5,
    date: '2 bulan lalu',
  },
  {
    quote: 'Poli giginya bagus, alat lengkap dan higienis. Dokter giginya telaten saat scaling.',
    name: 'Ahmad Rizky',
    role: 'Mahasiswa',
    avatar: 'AR',
    rating: 4,
    date: '1 minggu lalu',
  },
  {
    quote:
      'Pelayanan UGD 24 jam sangat membantu. Tengah malam keluarga saya sakit dan langsung ditangani cepat.',
    name: 'Slamet Wijaya',
    role: 'Warga Kota Kediri',
    avatar: 'SW',
    rating: 5,
    date: '5 hari lalu',
  },
  {
    quote:
      'Anak saya tidak rewel saat imunisasi. Bidannya telaten dan komunikatif, jadi orang tua juga lebih tenang.',
    name: 'Dewi Kusuma',
    role: 'Ibu Rumah Tangga',
    avatar: 'DK',
    rating: 5,
    date: '3 minggu lalu',
  },
]

const getInitials = (fullName: string): string => {
  const parts = fullName
    .split(' ')
    .map(part => part.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return 'PG'
  }
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase()
}

const formatSyncedAt = (value?: string): string => {
  if (!value) {
    return '-'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }
  return parsed.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const fallbackRating =
  Math.round(
    (fallbackTestimonials.reduce((sum, item) => sum + item.rating, 0) /
      fallbackTestimonials.length) *
      10
  ) / 10

const Testimonials = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials)
  const [reviewSource, setReviewSource] = useState<'website' | 'google'>('website')
  const [googleMapsUrl, setGoogleMapsUrl] = useState(GOOGLE_REVIEW_PAGE_URL)
  const [writeReviewUrl, setWriteReviewUrl] = useState(GOOGLE_REVIEW_PAGE_URL)
  const [syncedAt, setSyncedAt] = useState<string | undefined>(undefined)
  const [aggregateRating, setAggregateRating] = useState<number>(fallbackRating)
  const [aggregateCount, setAggregateCount] = useState<number | null>(null)

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

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let isCancelled = false

    const loadSyncedGoogleReviews = async () => {
      try {
        const response = await fetch('/data/google-reviews.json', {
          cache: 'no-store',
        })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as GoogleReviewPayload

        const mappedReviews = (payload.reviews ?? [])
          .map((review): Testimonial | null => {
            const quote = (review.text ?? '').trim()
            if (!quote) {
              return null
            }

            const rawName = (
              review.authorName ??
              review.authorAttribution?.displayName ??
              'Pengunjung Google'
            ).trim()

            const normalizedName = rawName || 'Pengunjung Google'
            const normalizedRating = Math.min(5, Math.max(1, Math.round(review.rating ?? 5)))

            return {
              quote,
              name: normalizedName,
              role: 'Pengunjung Google',
              avatar: getInitials(normalizedName),
              rating: normalizedRating,
              date: (review.relativeTimeDescription ?? 'Baru saja').trim(),
            }
          })
          .filter((item): item is Testimonial => item !== null)
          .slice(0, 6)

        if (isCancelled || mappedReviews.length === 0) {
          return
        }

        setTestimonials(mappedReviews)
        setReviewSource('google')
        setSyncedAt(payload.updatedAt)
        setGoogleMapsUrl(
          payload.place?.reviewPageUri ?? payload.place?.googleMapsUri ?? GOOGLE_REVIEW_PAGE_URL
        )
        setWriteReviewUrl(
          payload.place?.writeReviewUri ??
            payload.place?.reviewPageUri ??
            payload.place?.googleMapsUri ??
            GOOGLE_REVIEW_PAGE_URL
        )

        if (
          typeof payload.place?.rating === 'number' &&
          typeof payload.place?.userRatingCount === 'number'
        ) {
          setAggregateRating(payload.place.rating)
          setAggregateCount(payload.place.userRatingCount)
          return
        }

        const average =
          mappedReviews.reduce((sum, item) => sum + item.rating, 0) / mappedReviews.length
        setAggregateRating(Math.round(average * 10) / 10)
        setAggregateCount(mappedReviews.length)
      } catch {
        /* silent — fallback testimonials tetap ditampilkan */
      }
    }

    void loadSyncedGoogleReviews()

    return () => {
      isCancelled = true
    }
  }, [])

  const roundedRatingForStars = Math.round(aggregateRating)
  const totalReviewLabel =
    aggregateCount !== null ? new Intl.NumberFormat('id-ID').format(aggregateCount) : '500+'

  const StarRating = ({ rating }: { rating: number }) => (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`Rating ${rating} dari 5 bintang`}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          aria-hidden="true"
          className={`w-4 h-4 ${
            star <= rating ? 'fill-[#C9A87C] text-[#C9A87C]' : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  )

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="relative w-full py-14 lg:py-20 bg-[#FAF3EB] overflow-hidden neo-section"
    >
      <div className="absolute top-20 right-10 w-32 h-32 bg-[#C9A87C]/10 rounded-full blur-2xl" />
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-[#C9A87C]/10 rounded-full blur-3xl" />

      <div className="relative px-6 lg:px-[7vw]">
        <div className="max-w-3xl mb-12">
          <span
            className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8B7D6F] font-medium
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <span className="w-8 h-[1px] bg-[#C9A87C]" />
            Testimoni Pasien
          </span>
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2420] mt-4 mb-6
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '100ms' }}
          >
            Komentar Pengunjung <span className="text-[#C9A87C]">Terintegrasi Google</span>
          </h2>
          <p
            className={`text-base text-[#8B7D6F] leading-relaxed
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '200ms' }}
          >
            Ulasan di website otomatis mengikuti data terbaru dari Google Reviews saat sinkronisasi
            dijalankan.
          </p>
          <div
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs neo-chip text-[#7E6A55]
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: '260ms' }}
          >
            <span className="w-2 h-2 rounded-full bg-[#C9A87C]" />
            Sumber: {reviewSource === 'google' ? 'Google Reviews (aktif)' : 'Fallback Website'}
            <span className="text-[#8B7D6F]">• Sync: {formatSyncedAt(syncedAt)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={`${testimonial.name}-${index}`}
              className={`group relative rounded-[24px] p-6 neo-card neo-card-hover
                transition-all duration-500 hover:-translate-y-1
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${300 + index * 90}ms` }}
            >
              <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-[#C9A87C] flex items-center justify-center shadow-lg">
                <Quote className="w-4 h-4 text-white" />
              </div>

              <div className="flex items-center justify-between mb-4">
                <StarRating rating={testimonial.rating} />
                <span className="text-xs text-[#8B7D6F]">{testimonial.date}</span>
              </div>

              <p className="text-[#2D2420] leading-relaxed mb-6 text-sm lg:text-base">
                "{testimonial.quote}"
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-[#FAF3EB]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A87C] to-[#B8956A] flex items-center justify-center shadow-md neo-inset">
                  <span className="text-white font-medium text-sm">{testimonial.avatar}</span>
                </div>
                <div>
                  <p className="font-medium text-[#2D2420] text-sm">{testimonial.name}</p>
                  <p className="text-xs text-[#8B7D6F]">{testimonial.role}</p>
                </div>
              </div>

              <div className="absolute top-6 right-6">
                <div
                  className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                  title="Terverifikasi"
                >
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`mt-8 grid grid-cols-2 md:grid-cols-4 gap-4
            transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionDelay: '760ms' }}
        >
          <div className="frosted-glass rounded-2xl p-4 text-center neo-card">
            <p className="text-2xl font-bold text-[#C9A87C]">{aggregateRating.toFixed(1)}</p>
            <div
              className="flex justify-center gap-0.5 my-1"
              role="img"
              aria-label={`Rating ${aggregateRating.toFixed(1)} dari 5`}
            >
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  aria-hidden="true"
                  className={`w-3 h-3 ${
                    star <= roundedRatingForStars
                      ? 'fill-[#C9A87C] text-[#C9A87C]'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-[#8B7D6F]">Rating Rata-rata</p>
          </div>
          <div className="frosted-glass rounded-2xl p-4 text-center neo-card">
            <p className="text-2xl font-bold text-[#2D2420]">{totalReviewLabel}</p>
            <p className="text-xs text-[#8B7D6F] mt-1">Total Ulasan</p>
          </div>
          <div className="frosted-glass rounded-2xl p-4 text-center neo-card">
            <p className="text-2xl font-bold text-[#2D2420]">98%</p>
            <p className="text-xs text-[#8B7D6F] mt-1">Puas</p>
          </div>
          <div className="frosted-glass rounded-2xl p-4 text-center neo-card">
            <p className="text-2xl font-bold text-[#2D2420]">15K+</p>
            <p className="text-xs text-[#8B7D6F] mt-1">Pasien/Tahun</p>
          </div>
        </div>

        <div
          className={`mt-8 flex flex-wrap gap-3 justify-center
            transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionDelay: '860ms' }}
        >
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#C9A87C] hover:bg-[#B8956A] text-white font-medium px-5 py-3 rounded-xl transition-all duration-300 neo-card-hover"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Lihat semua ulasan Google</span>
          </a>
          <a
            href={writeReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 frosted-glass text-[#2D2420] font-medium px-5 py-3 rounded-xl transition-all duration-300 neo-control"
          >
            <PencilLine className="w-4 h-4 text-[#C9A87C]" />
            <span>Tulis ulasan di Google</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}

export default Testimonials
