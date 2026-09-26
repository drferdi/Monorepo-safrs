// Architected and built by the one and only Drferdi.
// Chief's Diseases Section — Open Book Design
// 144 Penyakit wajib diselesaikan di Puskesmas (Permenkes No.28/2014)

import { BookOpen, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const categories = [
  {
    chapter: 'I',
    title: 'Saraf & Mental',
    color: '#7C6FCD',
    diseases: [
      'Kejang Demam',
      'Tetanus',
      'HIV AIDS tanpa komplikasi',
      'Tension headache',
      'Migren',
      "Bell's Palsy",
      'Vertigo (Benign paroxysmal positional Vertigo)',
      'Gangguan somatoform',
      'Insomnia',
    ],
  },
  {
    chapter: 'II',
    title: 'Mata',
    color: '#5B9BD5',
    diseases: [
      'Benda asing di konjungtiva',
      'Konjungtivitis',
      'Perdarahan subkonjungtiva',
      'Mata kering',
      'Blefaritis',
      'Hordeolum',
      'Trikiasis',
      'Episkleritis',
      'Hipermetropia ringan',
      'Miopia ringan',
      'Astigmatism ringan',
      'Presbiopia',
      'Buta senja',
    ],
  },
  {
    chapter: 'III',
    title: 'THT',
    color: '#E8965A',
    diseases: [
      'Otitis eksterna',
      'Otitis Media Akut',
      'Serumen prop',
      'Mabuk perjalanan',
      'Furunkel pada hidung',
      'Rhinitis akut',
      'Rhinitis vasomotor',
      'Benda asing (hidung)',
      'Epistaksis',
    ],
  },
  {
    chapter: 'IV',
    title: 'Pernapasan',
    color: '#5AAD8F',
    diseases: [
      'Influenza',
      'Pertusis',
      'Faringitis',
      'Tonsilitis',
      'Laringitis',
      'Asma bronchiale',
      'Bronchitis akut',
      'Pneumonia, bronkopneumonia',
      'Tuberkulosis paru tanpa komplikasi',
    ],
  },
  {
    chapter: 'V',
    title: 'Kardio & Mulut',
    color: '#D95757',
    diseases: [
      'Hipertensi esensial',
      'Kandidiasis mulut',
      'Ulcus mulut (aptosa, herpes)',
      'Parotitis',
      'Infeksi pada umbilikus',
    ],
  },
  {
    chapter: 'VI',
    title: 'Pencernaan',
    color: '#C9963A',
    diseases: [
      'Gastritis',
      'Gastroenteritis (termasuk kolera, giardiasis)',
      'Refluks gastroesofagus',
      'Demam tifoid',
      'Intoleransi makanan',
      'Alergi makanan',
      'Keracunan makanan',
      'Penyakit cacing tambang',
      'Strongiloidiasis',
      'Askariasis',
      'Skistosomiasis',
      'Taeniasis',
      'Hepatitis A',
      'Disentri basiler, disentri amuba',
      'Hemoroid grade ½',
    ],
  },
  {
    chapter: 'VII',
    title: 'Genitourinaria',
    color: '#9B6FBF',
    diseases: [
      'Infeksi saluran kemih',
      'Gonore',
      'Pielonefritis tanpa komplikasi',
      'Fimosis',
      'Parafimosis',
      'Sindroma duh (discharge) genital (Gonore dan non gonore)',
      'Infeksi saluran kemih bagian bawah',
      'Vulvitis',
      'Vaginitis',
      'Vaginosis bakterialis',
      'Salphingitis',
    ],
  },
  {
    chapter: 'VIII',
    title: 'Kehamilan & Laktasi',
    color: '#D4849A',
    diseases: [
      'Kehamilan normal',
      'Aborsi spontan komplit',
      'Anemia defisiensi besi pada kehamilan',
      'Ruptur perineum tingkat ½',
      'Abses folikel rambut/kelj sebasea',
      'Mastitis',
      'Cracked nipple',
      'Inverted nipple',
    ],
  },
  {
    chapter: 'IX',
    title: 'Metabolik & Endokrin',
    color: '#4FA8A8',
    diseases: [
      'DM tipe 1',
      'DM tipe 2',
      'Hipoglikemi ringan',
      'Malnutrisi energi protein',
      'Defisiensi vitamin',
      'Defisiensi mineral',
      'Dislipidemia',
      'Hiperurisemia',
      'Obesitas',
    ],
  },
  {
    chapter: 'X',
    title: 'Infeksi & Darah',
    color: '#B85C38',
    diseases: [
      'Anemia defisiensi besi',
      'Limphadenitis',
      'Demam dengue, DHF',
      'Malaria',
      'Leptospirosis (tanpa komplikasi)',
      'Reaksi anafilaktik',
      'Ulkus pada tungkai',
      'Lipoma',
      'Veruka vulgaris',
      'Moluskum kontangiosum',
      'Herpes zoster tanpa komplikasi',
      'Morbili tanpa komplikasi',
      'Varicella tanpa komplikasi',
      'Herpes simpleks tanpa komplikasi',
    ],
  },
  {
    chapter: 'XI',
    title: 'Kulit & Infeksi',
    color: '#7DAF5A',
    diseases: [
      'Impetigo',
      'Impetigo ulceratif (ektima)',
      'Folikulitis superfisialis',
      'Furunkel, karbunkel',
      'Eritrasma',
      'Erisipelas',
      'Skrofuloderma',
      'Lepra',
      'Sifilis stadium 1 dan 2',
      'Tinea kapitis',
      'Tinea barbe',
      'Tinea facialis',
      'Tinea corporis',
      'Tinea manus',
      'Tinea unguium',
      'Tinea cruris',
      'Tinea pedis',
      'Pitiriasis versicolor',
      'Candidiasis mucocutan ringan',
      'Cutaneus larvamigran',
      'Filariasis',
      'Pedikulosis kapitis',
      'Pediculosis pubis',
      'Scabies',
      'Veruka vulgaris',
    ],
  },
  {
    chapter: 'XII',
    title: 'Dermatitis & Luka',
    color: '#8B7D6F',
    diseases: [
      'Reaksi gigitan serangga',
      'Dermatitis kontak iritan',
      'Dermatitis atopik (kecuali recalcitrant)',
      'Dermatitis numularis',
      'Napkin ekzema',
      'Dermatitis seboroik',
      'Pitiriasis rosea',
      'Acne vulgaris ringan',
      'Hidradenitis supuratif',
      'Dermatitis perioral',
      'Miliaria',
      'Urtikaria akut',
      'Eksantemapous drug eruption, fixed drug eruption',
      'Vulnus laseraum, puctum',
      'Luka bakar derajat 1 dan 2',
      'Kekerasan tumpul',
      'Kekerasan tajam',
    ],
  },
]

const Diseases = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [currentChapter, setCurrentChapter] = useState(0)
  const [query, setQuery] = useState('')
  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const results: { cat: string; disease: string }[] = []
    categories.forEach(cat => {
      cat.diseases.forEach(d => {
        if (d.toLowerCase().includes(q)) results.push({ cat: cat.title, disease: d })
      })
    })
    return results
  }, [query])

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
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const cat = categories[currentChapter]
  const prev = () => setCurrentChapter(p => Math.max(0, p - 1))
  const next = () => setCurrentChapter(p => Math.min(categories.length - 1, p + 1))

  const totalDiseases = categories.reduce((a, c) => a + c.diseases.length, 0)
  const leftPage = cat.diseases.slice(0, Math.ceil(cat.diseases.length / 2))
  const rightPage = cat.diseases.slice(Math.ceil(cat.diseases.length / 2))

  return (
    <section
      ref={sectionRef}
      id="diseases"
      className="relative w-full py-14 lg:py-20 bg-[#F2EDE8] overflow-hidden"
    >
      <style>{`
        @keyframes page-turn { 0%{opacity:0;transform:rotateY(-8deg) translateX(-12px)} 100%{opacity:1;transform:rotateY(0deg) translateX(0)} }
        .page-turn { animation: page-turn 0.4s cubic-bezier(.25,.46,.45,.94) both; }
        .book-shadow { box-shadow: -8px 0 20px rgba(0,0,0,0.08), 8px 0 20px rgba(0,0,0,0.08), 0 20px 40px rgba(0,0,0,0.12); }
        .spine-shadow { box-shadow: inset -4px 0 8px rgba(0,0,0,0.08), inset 4px 0 8px rgba(0,0,0,0.08); }
        .paper-texture { background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.025'/%3E%3C/svg%3E"); }
      `}</style>

      <div className="px-6 lg:px-[7vw]">
        {/* Header */}
        <div
          className={`mb-10 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="text-xs uppercase tracking-[0.2em] text-[#8B7D6F] font-medium">
            Standar Pelayanan
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2420] mt-4 mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            <span className="text-[#C9A87C]">{totalDiseases}</span> Penyakit
            <br />
            Tuntas di Puskesmas
          </h2>
          <p className="text-sm text-[#8B7D6F] max-w-lg">
            Berdasarkan Permenkes No.28 Tahun 2014 — semua diagnosis ini wajib diselesaikan di
            Fasilitas Kesehatan Tingkat Pertama tanpa rujukan.
          </p>
        </div>

        {/* Search Bar */}
        <div
          className={`mb-8 max-w-sm transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '150ms' }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7D6F]" />
            <input
              type="text"
              placeholder="Cari penyakit..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-white/80 border border-[#EADDCB] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#2D2420] placeholder:text-[#8B7D6F]/50 focus:outline-none focus:ring-2 focus:ring-[#C9A87C]/30"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white rounded-xl border border-[#EADDCB] shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  className="px-4 py-2.5 hover:bg-[#FAF3EB] transition-colors border-b border-[#FAF3EB] last:border-0"
                >
                  <p className="text-xs font-semibold text-[#2D2420]">{r.disease}</p>
                  <p className="text-[10px] text-[#8B7D6F]">{r.cat}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Book */}
        <div
          className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
          style={{ transitionDelay: '200ms' }}
        >
          {/* Chapter tabs — small */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {categories.map((c, i) => (
              <button
                key={c.chapter}
                onClick={() => setCurrentChapter(i)}
                className="text-[10px] font-bold px-3 py-1 rounded-full transition-all duration-200"
                style={{
                  background: currentChapter === i ? c.color : 'rgba(0,0,0,0.06)',
                  color: currentChapter === i ? '#fff' : '#8B7D6F',
                }}
              >
                {c.chapter}
              </button>
            ))}
          </div>

          {/* Book body */}
          <div
            className="book-shadow rounded-2xl overflow-hidden"
            style={{ background: '#F5EFE8' }}
          >
            {/* Book top strip — chapter header */}
            <div
              className="flex items-center justify-between px-6 py-3"
              style={{ background: cat.color }}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-white/80" />
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">
                  Bab {cat.chapter}
                </span>
                <span className="text-white font-semibold text-sm">— {cat.title}</span>
              </div>
              <span className="text-[10px] text-white/70 font-medium">
                {cat.diseases.length} penyakit
              </span>
            </div>

            {/* Two-page spread */}
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: '420px' }}>
              {/* Left page */}
              <div
                className="page-turn paper-texture p-8 lg:p-10 border-b lg:border-b-0 lg:border-r"
                style={{ borderColor: 'rgba(0,0,0,0.06)' }}
                key={`left-${currentChapter}`}
              >
                {/* Page header decoration */}
                <div
                  className="flex items-center gap-2 mb-6 pb-3"
                  style={{ borderBottom: `2px solid ${cat.color}20` }}
                >
                  <div className="w-1 h-4 rounded-full" style={{ background: cat.color }} />
                  <span className="text-[10px] uppercase tracking-widest text-[#8B7D6F] font-semibold">
                    Halaman Kiri
                  </span>
                </div>

                <ol className="space-y-2.5">
                  {leftPage.map((disease, i) => (
                    <li key={disease} className="flex items-start gap-3 group">
                      <span
                        className="text-[10px] font-bold mt-0.5 w-5 text-right flex-shrink-0"
                        style={{ color: `${cat.color}99` }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm text-[#3D3028] leading-relaxed group-hover:text-[#2D2420] transition-colors">
                        {disease}
                      </span>
                    </li>
                  ))}
                </ol>

                {/* Page number */}
                <div className="mt-8 text-center">
                  <span className="text-[10px] text-[#8B7D6F]">{currentChapter * 2 + 1}</span>
                </div>
              </div>

              {/* Spine */}
              <div
                className="hidden lg:block absolute left-1/2 -translate-x-1/2 w-px h-full spine-shadow"
                style={{ background: 'rgba(0,0,0,0.06)' }}
              />

              {/* Right page */}
              <div
                className="page-turn paper-texture p-8 lg:p-10"
                key={`right-${currentChapter}`}
                style={{ animationDelay: '60ms' }}
              >
                <div
                  className="flex items-center gap-2 mb-6 pb-3"
                  style={{ borderBottom: `2px solid ${cat.color}20` }}
                >
                  <div className="w-1 h-4 rounded-full" style={{ background: cat.color }} />
                  <span className="text-[10px] uppercase tracking-widest text-[#8B7D6F] font-semibold">
                    Halaman Kanan
                  </span>
                </div>

                {rightPage.length > 0 ? (
                  <ol className="space-y-2.5" start={leftPage.length + 1}>
                    {rightPage.map((disease, i) => (
                      <li key={disease} className="flex items-start gap-3 group">
                        <span
                          className="text-[10px] font-bold mt-0.5 w-5 text-right flex-shrink-0"
                          style={{ color: `${cat.color}99` }}
                        >
                          {String(leftPage.length + i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm text-[#3D3028] leading-relaxed group-hover:text-[#2D2420] transition-colors">
                          {disease}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="flex items-center justify-center h-full opacity-30">
                    <BookOpen className="w-12 h-12 text-[#8B7D6F]" />
                  </div>
                )}

                <div className="mt-8 text-center">
                  <span className="text-[10px] text-[#8B7D6F]">{currentChapter * 2 + 2}</span>
                </div>
              </div>
            </div>

            {/* Book bottom — navigation */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ background: 'rgba(0,0,0,0.03)', borderTop: '1px solid rgba(0,0,0,0.06)' }}
            >
              <button
                onClick={prev}
                disabled={currentChapter === 0}
                className="flex items-center gap-2 text-sm font-medium transition-all disabled:opacity-30 hover:text-[#C9A87C]"
                style={{ color: cat.color }}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Bab Sebelumnya</span>
              </button>

              <div className="flex items-center gap-1">
                {categories.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentChapter(i)}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{ background: i === currentChapter ? cat.color : 'rgba(0,0,0,0.15)' }}
                  />
                ))}
              </div>

              <button
                onClick={next}
                disabled={currentChapter === categories.length - 1}
                className="flex items-center gap-2 text-sm font-medium transition-all disabled:opacity-30 hover:text-[#C9A87C]"
                style={{ color: cat.color }}
              >
                <span className="hidden sm:inline">Bab Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-[#8B7D6F] mt-4">
            Sumber: Permenkes No.28 Tahun 2014 · Daftar 144 Diagnosis FKTP BPJS Kesehatan
          </p>
        </div>
      </div>
    </section>
  )
}

export default Diseases
