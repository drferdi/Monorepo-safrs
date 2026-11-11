// Architected and built by Drferdi.
'use client'

import { Plus, Minus } from 'lucide-react'
import { useState } from 'react'

import { Reveal } from '@/components/ui/reveal'

// Section ini sengaja terang di atas situs dark-only — tinta di-hardcode
// (bukan token foreground/muted) karena token itu dikalibrasi untuk bg gelap.
const INK = '#002147'

const FAQ_ITEMS = [
  {
    q: 'Apa itu Sentra AI dan bagaimana cara kerjanya?',
    a: 'Sentra AI adalah platform Clinical Decision Support berbasis kecerdasan buatan yang membantu dokter dan tenaga kesehatan membuat keputusan klinis lebih cepat dan akurat. Sistem ini memproses data pasien secara real-time menggunakan 7 protokol klinis — mulai dari sintesis NLP anamnesis, algoritma Bayesian untuk probabilitas diagnosis, hingga pemodelan prognosis — dan menyajikan rekomendasi berbasis bukti dalam hitungan detik.',
  },
  {
    q: 'Apakah Sentra AI menggantikan peran dokter?',
    a: 'Tidak. Sentra AI adalah alat bantu keputusan klinis (co-pilot), bukan pengganti dokter. Tanggung jawab akhir atas setiap keputusan medis tetap berada sepenuhnya pada tenaga medis yang berwenang. Sistem ini dirancang untuk mengurangi beban kognitif dokter, bukan mengambil alih penilaian klinis mereka.',
  },
  {
    q: 'Siapa yang bisa menggunakan Sentra AI?',
    a: 'Sentra AI ditujukan untuk dokter, perawat, bidan, dan tenaga kesehatan berlisensi yang bekerja di fasilitas kesehatan — mulai dari Puskesmas, klinik pratama, hingga rumah sakit. Platform ini dirancang untuk lingkungan klinis Indonesia dengan antarmuka dalam Bahasa Indonesia dan pemahaman konteks medis lokal.',
  },
  {
    q: 'Bagaimana Sentra AI melindungi data pasien?',
    a: 'Sentra menerapkan kebijakan Zero PHI in Logs — data pasien tidak pernah muncul dalam log sistem atau analytics. Setiap interaksi klinis dilindungi oleh audit trail immutable dengan retensi 10 tahun. Infrastruktur kami menggunakan enkripsi HTTPS dengan HSTS preload, Content Security Policy ketat, dan edge server di Asia Tenggara.',
  },
  {
    q: 'Berapa akurasi sistem Sentra AI?',
    a: 'Berdasarkan validasi di pilot sites kami (RSIA Melinda DHAI dan Puskesmas Balowerti, Kediri), Sentra mencapai 97,2% akurasi triase emergensi, 40% penurunan tingkat misdiagnosis, dan mempercepat pengambilan keputusan klinis hingga 3× lebih cepat dibanding workflow konvensional.',
  },
  {
    q: 'Apakah Sentra AI dapat diintegrasikan dengan sistem EMR yang sudah ada?',
    a: 'Ya. Sentra dirancang modular dan dapat diintegrasikan dengan sistem EMR yang sudah ada di fasilitas kesehatan Anda. Sistem juga dapat berjalan secara standalone untuk fasilitas yang belum memiliki EMR. Tim kami akan memandu proses integrasi sesuai infrastruktur yang ada.',
  },
  {
    q: 'Bagaimana proses implementasi Sentra AI di fasilitas kami?',
    a: 'Implementasi dimulai dengan asesmen infrastruktur dan alur kerja klinis fasilitas, dilanjutkan konfigurasi modul sesuai kebutuhan, pelatihan tenaga medis, dan pendampingan langsung selama masa transisi awal hingga tim terbiasa dengan sistem.',
  },
  {
    q: 'Apakah Sentra AI memerlukan koneksi internet yang stabil?',
    a: 'Tidak selalu. Sebagian modul Sentra dirancang lokal-first sehingga tetap dapat berjalan meski koneksi internet terputus, dan akan menyinkronkan data begitu koneksi kembali tersedia — penting untuk fasilitas dengan infrastruktur jaringan terbatas.',
  },
  {
    q: 'Siapa pemilik data pasien yang diproses Sentra AI?',
    a: 'Fasilitas kesehatan Anda tetap menjadi pemilik penuh atas seluruh data pasien. Sentra hanya memproses data untuk mendukung keputusan klinis dan tidak membagikan atau menjual data tersebut kepada pihak ketiga mana pun.',
  },
  {
    q: 'Bagaimana dukungan teknis setelah implementasi?',
    a: 'Tim dukungan kami tersedia untuk menangani kendala teknis, memantau performa sistem secara berkelanjutan, dan merilis pembaruan berkala berdasarkan masukan langsung dari tenaga medis di lapangan.',
  },
  {
    q: 'Berapa lama waktu yang dibutuhkan untuk implementasi penuh?',
    a: 'Bergantung pada skala fasilitas dan kompleksitas integrasi dengan sistem yang sudah ada, namun sebagian besar fasilitas pilot kami mulai menggunakan modul inti dalam hitungan minggu, dengan penyesuaian lanjutan berjalan secara bertahap.',
  },
  {
    q: 'Apakah Sentra AI mengikuti regulasi kesehatan digital yang berlaku?',
    a: 'Ya. Sentra dikembangkan mengikuti prinsip kepatuhan dan tata kelola data kesehatan yang relevan, dan terus disesuaikan seiring perkembangan regulasi kesehatan digital di Indonesia.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }

  const columns = [FAQ_ITEMS.slice(0, 6), FAQ_ITEMS.slice(6, 12)]

  return (
    <section
      id="faq"
      className="relative overflow-hidden py-24 md:py-32 bg-[#f2ebe0]"
      style={{ color: INK }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Decorative hairline — non-interactive, behind content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-10 right-[6%] z-0 hidden lg:block"
      >
        <div className="relative h-full w-px overflow-hidden" style={{ background: `${INK}1a` }}>
          <span className="sentra-scan absolute left-0 top-0 block h-[10%] w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent" />
        </div>
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12">
        {/* Header */}
        <Reveal className="max-w-[600px] mb-16">
          <p className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: `${INK}99` }}>
            Pertanyaan Umum
          </p>
          <h2 className="text-4xl md:text-5xl font-bold font-jakarta tracking-tight">
            Frequently Asked Questions
          </h2>
        </Reveal>

        {/* Items — dua kolom */}
        <div className="grid gap-x-12 lg:grid-cols-2">
          {columns.map((column, colIndex) => (
            <div key={colIndex} className="divide-y" style={{ borderColor: `${INK}1f` }}>
              {column.map((item, itemIndex) => {
                const i = colIndex * 6 + itemIndex
                const isOpen = openIndex === i
                return (
                  <Reveal key={i} delay={Math.min(itemIndex * 0.05, 0.2)}>
                    <button
                      className="w-full flex items-start justify-between gap-4 py-6 text-left group"
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      aria-expanded={isOpen}
                    >
                      <span className="text-[17px] font-medium leading-snug group-hover:text-accent transition-colors">
                        {item.q}
                      </span>
                      <span
                        className="flex-shrink-0 mt-0.5 group-hover:text-accent transition-colors"
                        style={{ color: `${INK}80` }}
                      >
                        {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                      </span>
                    </button>

                    {isOpen && (
                      <p className="pb-6 leading-relaxed text-[15px]" style={{ color: `${INK}b3` }}>
                        {item.a}
                      </p>
                    )}
                  </Reveal>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
