// Architected and built by Drferdi.
'use client'

import { motion } from 'framer-motion'

import { Reveal } from '@/components/ui/reveal'
import { SketchLines } from '@/components/ui/sketch-lines'
import { layoutGovernance, typeGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

const PRINSIP = [
  {
    label: 'Manusia tetap memimpin',
    body: 'Dokter memegang konteks, empati, penalaran etik, tanggung jawab klinis, dan keputusan akhir.',
  },
  {
    label: 'AI bekerja mendukung',
    body: 'Membantu menyusun informasi, menandai red flag, mempercepat analisis, dan mengurangi beban kognitif di titik layanan.',
  },
]

export default function AboutSentra() {
  return (
    <section
      id="tentang-sentra"
      className={cn(
        'relative border-b border-muted/20 overflow-hidden',
        layoutGovernance.sectionY.spacious
      )}
    >
      {/* Garis konstruksi — draw lalu stay */}
      <SketchLines seed={20260214} count={8} colorClass="bg-foreground/15" persist />

      {/* Corner ticks */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-foreground/25" />
        <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-foreground/25" />
        <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-foreground/25" />
        <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-foreground/25" />
      </div>

      <div
        className={cn(
          'relative grid items-start gap-12 lg:grid-cols-[420px_1fr] lg:gap-0',
          layoutGovernance.container.wide,
          layoutGovernance.sectionX
        )}
      >
        {/* Kolom kiri — pernyataan */}
        <Reveal>
          <div className="lg:pr-12 xl:pr-16">
            <p className={typeGovernance.eyebrow}>Tentang Sentra</p>
            <p
              className={cn(
                typeGovernance.editorialBody,
                'mt-6 text-2xl md:text-[28px] leading-snug text-foreground'
              )}
            >
              Kami membangun kecerdasan klinis yang membantu dokter garis depan menemukan kejelasan
              di tengah data pasien yang terfragmentasi—lebih cepat, lebih tenang, dan lebih aman.
            </p>
            {/* Garis accent — ter-draw lalu stay */}
            <motion.div
              className="mt-6 h-px w-24 bg-accent origin-left"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              aria-hidden
            />
          </div>
        </Reveal>

        {/* Kolom kanan — narasi */}
        <Reveal delay={0.1}>
          <div className="lg:border-l lg:border-muted/20 lg:pl-12 xl:pl-16 flex flex-col gap-6">
            <h2 className={cn(typeGovernance.sectionTitle, 'text-[26px] md:text-[34px]')}>
              Sentra: Teknologi yang Menguatkan Naluri Klinis Manusia
            </h2>

            <p className={typeGovernance.body}>
              Sentra lahir dari kebutuhan yang sangat nyata di layanan kesehatan: dokter harus
              mengambil keputusan penting di tengah waktu yang terbatas, data pasien yang tersebar,
              dan tekanan klinis yang tinggi.
            </p>

            <p className={typeGovernance.body}>
              Dikembangkan dari visi strategis Dr. Ferdi Iskandar, Sentra menghadirkan Artificial
              Intelligence bukan sebagai pengganti dokter, tetapi sebagai lapisan pendukung yang
              membantu merapikan data, mengenali pola risiko, dan menghadirkan kejelasan klinis
              tepat saat dibutuhkan.
            </p>

            <ul className="flex flex-col gap-4 border-y border-muted/20 py-6">
              {PRINSIP.map((item) => (
                <li key={item.label} className="flex gap-4">
                  <span className="mt-3 h-px w-8 shrink-0 bg-accent" aria-hidden />
                  <p className={typeGovernance.body}>
                    <span className="font-bold text-foreground">{item.label}:</span> {item.body}
                  </p>
                </li>
              ))}
            </ul>

            <p className={typeGovernance.body}>
              Di Sentra, kami percaya teknologi terbaik bukan yang mengambil alih hubungan dokter
              dan pasien, tetapi yang memberi ruang agar dokter dapat melihat pasien lebih utuh,
              berpikir lebih jernih, dan bertindak lebih tepat.
            </p>

            <blockquote
              className={cn(
                typeGovernance.editorialDisplay,
                'mt-2 text-xl md:text-2xl leading-snug'
              )}
            >
              <span className="text-accent">&ldquo;</span>
              The doctor decides. Sentra clarifies.
              <span className="text-accent">&rdquo;</span>
            </blockquote>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
