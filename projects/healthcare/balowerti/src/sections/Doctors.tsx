// Architected and built by the one and only Drferdi.
// Chief's Doctors Section - The Guardians

import { ArrowRight, Award, Clock3, GraduationCap, Sparkles, Stethoscope } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { OPERATIONAL_HOURS } from '@/config/site'

const Doctors = () => {
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

  const doctors = [
    {
      name: 'dr. Ferdi Iskandar',
      credentials: 'S.H., M.Kn., CMDC., CLM.',
      role: 'Dokter Umum',
      specialty: 'Konsulan Kespro, KIA, USG, IGD, VCT, Jiwa',
      highlight: false,
      description:
        'Pelayanan komprehensif Poli Umum serta konsultasi Kespro, KIA, USG, IGD, VCT, dan Jiwa.',
      focus: ['Kespro', 'KIA', 'USG', 'IGD', 'VCT', 'Jiwa'],
    },
    {
      name: 'drg. Endah Retno W.',
      credentials: '',
      role: 'Dokter Gigi',
      specialty: 'Dental Care',
      highlight: true,
      description: 'Spesialis perawatan gigi dan mulut',
      focus: ['Scaling gigi', 'Edukasi oral care', 'Tindakan konservatif'],
    },
    {
      name: 'dr. Cica Lusiana',
      credentials: '',
      role: 'Dokter Umum',
      specialty: 'Layanan Lansia',
      highlight: false,
      description: 'Pelayanan kesehatan lansia dengan pemantauan rutin dan pendekatan holistik.',
      focus: ['Skrining lansia', 'Kontrol berkala', 'Konseling obat'],
    },
    {
      name: 'dr. Rachmad Juni Triyono',
      credentials: '',
      role: 'Dokter Umum IGD',
      specialty: 'Pelayanan IGD',
      highlight: false,
      description: 'Fokus penanganan kasus gawat darurat dan stabilisasi awal pasien di IGD.',
      focus: ['Triage cepat', 'Stabilisasi awal', 'Rujukan emergensi'],
    },
  ]
  const sharedSchedule = OPERATIONAL_HOURS.clinicFull

  return (
    <section
      ref={sectionRef}
      id="doctors"
      className="relative w-full py-14 lg:py-20 bg-[#F8F5F2] overflow-hidden neo-section"
    >
      <div className="px-6 lg:px-[7vw]">
        <div className="max-w-2xl mb-12">
          <span
            className={`text-xs uppercase tracking-[0.2em] text-[#8B7D6F] font-medium
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            Tim Medis
          </span>
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2420] mt-4 mb-6
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '100ms' }}
          >
            Tim dokter kami
          </h2>
          <p
            className={`text-base text-[#8B7D6F] leading-relaxed
              transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '200ms' }}
          >
            Dokter dan perawat yang siap mendengarkan, memeriksa, dan merencanakan perawatan yang
            tepat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {doctors.map((doctor, index) => (
            <Card
              key={doctor.name}
              className={`group relative overflow-hidden rounded-md py-0 neo-card neo-card-hover
                transition-all duration-300 hover:-translate-y-0.5
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}
              style={{ transitionDelay: `${300 + index * 120}ms` }}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[#C9A87C]" />
              <CardHeader className="px-6 pt-6 pb-4 border-b border-[#EFE4D6]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#DCCCB7]
                        bg-[#FAF3EB] neo-inset"
                    >
                      <img
                        src="/images/idi.avif"
                        alt="Logo IDI"
                        width="32"
                        height="32"
                        loading="lazy"
                        decoding="async"
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                    <div>
                      <CardTitle className="font-['Playfair_Display'] text-xl text-[#2D2420]">
                        {doctor.name}
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm text-[#8B7D6F]">
                        {doctor.role}
                      </CardDescription>
                    </div>
                  </div>
                  {doctor.highlight && (
                    <Badge className="gap-1.5 rounded-sm bg-[#C9A87C] px-2.5 py-1 text-white hover:bg-[#B8956A]">
                      <Award className="h-3.5 w-3.5" />
                      Lead
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-6 pb-4">
                {doctor.credentials && (
                  <div className="flex items-center gap-2 rounded-md bg-[#FAF3EB] px-3 py-2 neo-inset">
                    <GraduationCap className="h-4 w-4 text-[#C9A87C]" />
                    <span className="text-xs tracking-wide text-[#7E6A55]">
                      {doctor.credentials}
                    </span>
                  </div>
                )}

                <p className="text-sm leading-relaxed text-[#6F5C4A]">{doctor.description}</p>

                <div className="flex items-center gap-2 rounded-md border border-[#E7DAC9] bg-[#FFF9F3] px-3 py-2 neo-inset">
                  <Clock3 className="h-4 w-4 text-[#C9A87C]" />
                  <span className="text-xs font-medium tracking-wide text-[#7E6A55]">
                    Jadwal kerja: {sharedSchedule}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-sm border-[#E6DACA] bg-[#FAF3EB] text-[#7E6A55] neo-chip"
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                    {doctor.specialty}
                  </Badge>
                  {doctor.focus.map(item => (
                    <Badge
                      key={`${doctor.name}-${item}`}
                      variant="outline"
                      className="rounded-sm border-[#EFE5D8] bg-white text-[#8B7D6F] neo-chip"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="border-t border-[#F1E7DB] px-6 py-4">
                <Button
                  asChild
                  variant="outline"
                  className="h-9 rounded-md border-[#DCCCB7] text-sm font-medium text-[#9F7E53] hover:bg-[#FAF3EB] hover:text-[#8D6E45] neo-control"
                >
                  <a href="#reservation" className="inline-flex items-center gap-2">
                    Konsultasi dengan tim ini
                    <Sparkles className="h-4 w-4" />
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div
          className={`mt-8
            transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionDelay: '800ms' }}
        >
          <a
            href="#reservation"
            className="inline-flex items-center gap-2 text-[#C9A87C] font-medium hover:gap-4 transition-all duration-300"
          >
            <span>Lihat jadwal dokter</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}

export default Doctors
