// Architected and built by Drferdi.
// Konten diadaptasi & diringkas dari
// abyss-monorepo (legacy) apps\internal\wikirepo\src\pages\ArticlePage.tsx,
// dialihbahasakan ke Bahasa Indonesia profesional. Presentasi memakai token
// dark Sentraverse dengan scope "kertas krem" ([data-wiki-paper]).
'use client'

import { useEffect, useState } from 'react'

import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import {
  APP_ROWS,
  COMPLIANCE_ROWS,
  CROWN_JEWEL_POEM,
  ENGINES,
  INFOBOX_ROWS,
  REFERENCE_DOCS,
  SECTION_IDS,
  TECH_SPEC_CARDS,
  TOC_ITEMS,
  WORKFLOW_COMMANDS,
} from '@/components/sentrawiki/data'
import EngineCard from '@/components/sentrawiki/EngineCard'
import EngineGraph from '@/components/sentrawiki/EngineGraph'
import LibraryGrid from '@/components/sentrawiki/LibraryGrid'
import { layoutGovernance, typeGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

function useScrollSpy(sectionIds: string[], offset = 120) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + offset
      for (let i = sectionIds.length - 1; i >= 0; i -= 1) {
        const el = document.getElementById(sectionIds[i])
        if (el && el.offsetTop <= scrollPosition) {
          setActiveId(sectionIds[i])
          return
        }
      }
      setActiveId('')
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sectionIds, offset])

  return activeId
}

// Ubah **bold** markdown ringan (dipakai di puisi) → <b>.
function renderPoemStanza(stanza: string) {
  const html = stanza
    .replace(/\n/g, '<br />')
    .replace(/\*\*(.+?)\*\*/g, '<b class="text-foreground">$1</b>')
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function SectionHeading({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2
      id={id}
      className={cn(
        typeGovernance.editorialDisplay,
        'mb-4 scroll-mt-28 border-b border-muted/20 pb-2 text-[28px] md:text-[36px]'
      )}
    >
      {children}
    </h2>
  )
}

function SubHeading({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      className={cn(
        typeGovernance.editorialDisplay,
        'mb-2 mt-6 scroll-mt-28 text-lg font-semibold'
      )}
    >
      {children}
    </h3>
  )
}

const HEADER_CELL =
  'px-3 py-2.5 text-left font-jakarta text-[10px] font-bold uppercase tracking-widest text-muted'

const CODE = 'rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs text-foreground'

// Body artikel dipatok 16px (bukan text-lg/18px di desktop) sesuai permintaan.
const BODY = 'font-inter text-[16px] leading-relaxed text-muted'

export default function SentraWikiPage() {
  const activeId = useScrollSpy(SECTION_IDS)

  return (
    <>
      <Navbar />
      <main data-wiki-paper className="bg-background text-foreground">
        <div className={cn(layoutGovernance.container.wide, layoutGovernance.sectionX, 'pt-32')}>
          <div className="grid grid-cols-1 gap-12 pb-24 lg:grid-cols-[240px_1fr]">
            {/* ═══ Sidebar TOC, sticky, scroll-spy ═══ */}
            <aside className="hidden lg:block">
              <div className="sticky top-32 flex max-h-[calc(100vh-10rem)] flex-col gap-0.5 overflow-y-auto border-l border-muted/20 pl-4">
                {TOC_ITEMS.map((item) => {
                  const id = item.href.replace('#', '')
                  return (
                    <div key={item.href}>
                      <a
                        href={item.href}
                        className={cn(
                          'block py-1 text-sm transition-colors',
                          activeId === id
                            ? 'font-semibold text-accent'
                            : 'text-muted hover:text-foreground'
                        )}
                      >
                        {item.label}
                      </a>
                      {item.children && (
                        <div className="ml-3 flex flex-col gap-0.5 border-l border-muted/10 pl-3">
                          {item.children.map((child) => (
                            <a
                              key={child.href}
                              href={child.href}
                              className="block py-0.5 text-xs text-muted/70 transition-colors hover:text-foreground"
                            >
                              {child.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </aside>

            {/* ═══ Article ═══ */}
            <article className="min-w-0 max-w-[960px]">
              <p className={typeGovernance.eyebrow}>SentraWiki</p>
              <h1
                className={cn(
                  typeGovernance.editorialDisplay,
                  'mt-3 text-[40px] leading-[1.05] md:text-[56px]'
                )}
              >
                Abyss Monorepo
              </h1>
              <p className={cn(typeGovernance.bodySm, 'mt-3 italic')}>
                Basis pengetahuan utama platform Sentra Healthcare AI yang AI-native.
              </p>

              {/* Garis, titik, garis, andalan Sentra */}
              <div className="mt-6 flex max-w-[280px] items-center gap-4" aria-hidden="true">
                <span className="h-px flex-1 bg-accent/60" />
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span className="h-px flex-1 bg-accent/60" />
              </div>

              {/* Infobox, mengambang kanan di desktop */}
              <aside className="mt-8 w-full overflow-hidden rounded-xl border border-muted/20 md:float-right md:ml-6 md:w-[300px]">
                <div className="border-b border-muted/20 bg-foreground/[0.03] px-4 py-2.5 text-center font-jakarta text-sm font-semibold">
                  Abyss Monorepo
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {INFOBOX_ROWS.map((row, i) => (
                      <tr
                        key={row.field}
                        className={i % 2 === 0 ? 'bg-transparent' : 'bg-foreground/[0.02]'}
                      >
                        <td className="w-[45%] px-3 py-1.5 font-semibold text-foreground/90">
                          {row.field}
                        </td>
                        <td className="px-3 py-1.5 text-muted">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </aside>

              {/* Lead paragraphs */}
              <p className={cn(BODY, 'mt-8')}>
                <b className="text-foreground">Abyss Monorepo</b> adalah ekosistem perangkat lunak
                dan kerangka arsitektur terpadu yang dikembangkan untuk platform{' '}
                <b className="text-foreground">Sentra Healthcare AI</b>. Ia mengintegrasikan engine
                penalaran klinis, pipeline retrieval-augmented generation (RAG), dan rangkaian
                aplikasi kesehatan ke dalam satu repositori dengan batas yang ditegakkan, dirancang
                dan dibangun sepenuhnya oleh <b className="text-foreground">dr. Ferdi Iskandar</b>{' '}
                selaku developer tunggal sekaligus Founder-CEO Sentra Healthcare AI.
              </p>
              <p className={cn(BODY, 'mt-4')}>
                Platform ini bercirikan filosofi <b className="text-foreground">AI-native</b>:
                setiap komponen, dari skema basis data hingga alur aplikasi, diatur oleh satu set
                instruksi terpusat (<code className={CODE}>AGENTS.md</code>) dan dikelola oleh agen
                otonom. Keputusan arsitektur ini menempatkan Abyss bukan sekadar basis kode,
                melainkan <em>infrastruktur kecerdasan yang hidup dan mengatur dirinya sendiri</em>{' '}
                untuk layanan kesehatan berskala nasional.
              </p>

              {/* Founder quote */}
              <blockquote className="my-6 rounded-r-md border-l-[3px] border-accent bg-foreground/[0.03] px-6 py-5">
                <p
                  className={cn(
                    typeGovernance.editorialBody,
                    'mb-2 text-base italic text-foreground/90'
                  )}
                >
                  &ldquo;Platform ini bukan sekadar artefak teknis. Ia adalah puncak dari perjalanan
                  seorang dokter di persimpangan praktik klinis, tata kelola hukum, dan keyakinan
                  bahwa rakyat Indonesia berhak atas layanan kesehatan yang lebih baik daripada yang
                  selama ini dibatasi oleh geografi dan keterbatasan sumber daya.&rdquo;
                </p>
                <p className="text-right text-xs text-muted">dr. Ferdi Iskandar</p>
              </blockquote>

              <p className={cn(BODY, 'mt-4')}>
                Abyss bukan produk startup yang dioptimalkan untuk penguasaan pasar, bukan pula
                prototipe riset untuk sitasi akademik. Ia adalah{' '}
                <b className="text-foreground">wujud dedikasi berskala nasional</b>, penerjemahan
                bertahun-tahun observasi klinis, kajian hukum, dan studi teknologi menjadi satu
                sistem koheren yang siap dijalankan hingga ke pelosok layanan kesehatan Indonesia
                yang paling kurang terlayani.
              </p>
              <p className={cn(BODY, 'mt-4')}>
                Indonesia adalah negara berpenduduk lebih dari{' '}
                <b className="text-foreground">270 juta jiwa</b> yang tersebar di{' '}
                <b className="text-foreground">17.000 pulau</b>, dilayani jaringan lebih dari{' '}
                <b className="text-foreground">10.000 Puskesmas</b> sebagai titik kontak klinis
                pertama, dan seringkali satu-satunya. Kesenjangan antara kecerdasan klinis di rumah
                sakit rujukan besar dan di fasilitas primer daerah terpencil bukan sekadar soal
                peralatan atau anggaran, melainkan{' '}
                <b className="text-foreground">kesenjangan pengetahuan</b>: sintesis bukti medis
                real-time, penalaran terstruktur terhadap diagnosis banding, dan pengenalan dini
                trajektori perburukan yang menentukan nyawa pasien. Kesenjangan inilah yang hendak
                ditutup oleh Abyss.
              </p>

              {/* ══ 1. ORIGIN ══ */}
              <section className="mt-12">
                <SectionHeading id="origin">Asal Mula &amp; Latar Belakang</SectionHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Abyss Monorepo lahir dari pertemuan antara keresahan klinis, peluang teknologi,
                  dan satu visi tunggal: bahwa kecerdasan buatan yang di-grounding pada kedokteran
                  berbasis bukti dan disiplin rekayasa yang ketat dapat mengubah cara layanan
                  kesehatan diberikan di Indonesia, dan pada akhirnya di negara berkembang secara
                  luas.
                </p>

                <SubHeading id="founder">Profil Pendiri</SubHeading>
                <p className={cn(BODY, 'mb-4')}>
                  <b className="text-foreground">dr. Ferdi Iskandar</b> adalah Founder-CEO sekaligus
                  developer tunggal Abyss Monorepo dan platform Sentra Healthcare AI. Profilnya
                  lintas disiplin secara tak lazim, memadukan pendidikan kedokteran (MD) dengan
                  gelar hukum kenotariatan (MKN), sertifikasi kedokteran asuransi jiwa (CLM), dan
                  pengakuan sebagai Certified Medical Doctor Consultant (CMDC). Sintesis langka
                  antara keahlian klinis, ketajaman hukum, dan desain sistem AI ini menjiwai setiap
                  keputusan arsitektur Abyss.
                </p>
                <p className={cn(BODY, 'mb-4')}>
                  Keputusan membangun Abyss sebagai proyek solo, alih-alih mendelegasikan rekayasa
                  ke tim konvensional, mencerminkan sikap filosofis yang tegas: sistem AI klinis
                  harus dibangun oleh mereka yang memahami secara mendalam <em>baik</em> substrat
                  teknis <em>maupun</em> konteks klinis tempatnya beroperasi. Absennya perantara
                  antara pikiran klinis dan basis kode menghilangkan satu kelas kesalahan
                  penerjemahan yang secara historis membelenggu sistem informatika kesehatan.
                </p>

                <SubHeading id="motivation">Motivasi Pendirian</SubHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Platform ini berawal dari observasi klinis langsung atas inefisiensi sistemik
                  dalam layanan kesehatan Indonesia: rekam medis yang terfragmentasi, rantai rujukan
                  yang lambat pada kondisi kritis-waktu, nyaris tiadanya dukungan keputusan di titik
                  layanan, dan sulitnya dokter primer mengakses pengetahuan medis mutakhir secara
                  real-time. Ini bukan masalah teoretis, melainkan realitas harian di praktik
                  klinis.
                </p>
                <p className={cn(BODY, 'mb-4')}>
                  Bersamaan itu, kemunculan large language model yang mampu melakukan penalaran
                  klinis canggih menciptakan fondasi teknis yang kredibel untuk menutup kesenjangan
                  tersebut. Pertemuan antara masalah dan solusi inilah yang memicu pendirian Sentra
                  Healthcare AI, dan bersamanya, kelahiran Abyss Monorepo sebagai tulang punggung
                  rekayasanya.
                </p>
                <p className={cn(BODY, 'mb-4')}>
                  Faktor pendorong lainnya adalah kesadaran bahwa Indonesia menghadapi tantangan
                  struktural yang lazim di negara berpendapatan menengah: populasi besar yang
                  tersebar secara geografis dengan akses sangat beragam ke layanan spesialis.
                  Dukungan keputusan klinis ber-AI yang dijalankan pada skala platform yang tertata
                  menawarkan mekanisme untuk memperluas kapabilitas penalaran setara spesialis ke
                  layanan primer di seluruh negeri, sebuah lapisan &ldquo;infrastruktur
                  kognitif&rdquo;.
                </p>

                <SubHeading id="naming">Penamaan &amp; Simbolisme</SubHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Nama <b className="text-foreground">Abyss</b> memikul bobot simbolis yang
                  disengaja: merujuk konsep klasik tentang kedalaman, substrat luas, tanpa batas,
                  dan fundamental tempat struktur bermunculan. Dalam konteks ini, ia menandai
                  repositori pengetahuan tanpa batas artifisial: yang ditakdirkan tumbuh, mendalam,
                  dan pada akhirnya merangkum totalitas kecerdasan klinis bagi layanan kesehatan
                  yang menyeluruh.
                </p>
                <p className={cn(BODY, 'mb-4')}>
                  Kelima engine Crown Jewel Sentra dinamai dalam{' '}
                  <b className="text-foreground">Bahasa Indonesia</b>, membumikan teknologi kelas
                  internasional pada konteks budaya dan bahasa lokalnya:{' '}
                  <b className="text-foreground">Nada</b> (nada/melodi, pengenalan pola penalaran
                  klinis), <b className="text-foreground">Pustaka</b> (perpustakaan, penyimpan
                  pengetahuan medis), <b className="text-foreground">Sandi</b> (kode/sandi, lapisan
                  interoperabilitas dan kepatuhan), <b className="text-foreground">Bentara</b>{' '}
                  (herald/penjaga, lapisan akses dan keamanan), dan{' '}
                  <b className="text-foreground">Cermin</b> (pantulan, engine vector embedding dan
                  kemiripan semantik).
                </p>
              </section>

              {/* ══ 2. ARCHITECTURE ══ */}
              <section className="mt-12">
                <SectionHeading id="architecture">Arsitektur</SectionHeading>

                <SubHeading id="design-philosophy">Filosofi Desain</SubHeading>
                <p className={cn(BODY, 'mb-3')}>
                  Abyss dibangun di atas tiga prinsip arsitektur fondasional yang membedakannya dari
                  platform informatika kesehatan konvensional:
                </p>
                <ul className={cn(BODY, 'mb-4 list-disc space-y-2 pl-6')}>
                  <li>
                    <b className="text-foreground">AI-Native sejak Desain.</b> Berbeda dari sistem
                    tempat AI sekadar fitur tambahan, setiap komponen Abyss, dari skema basis data
                    hingga kontrak API, dirancang dengan penalaran AI sebagai warga kelas satu. Set
                    instruksi <code className={CODE}>AGENTS.md</code> mengatur agen otonom yang
                    mengelola basis kode itu sendiri, sehingga sistem mendokumentasikan dan
                    menjaga-konsistensi dirinya.
                  </li>
                  <li>
                    <b className="text-foreground">Penegakan Batas sebagai Keselamatan.</b> Pada
                    sistem kritis-keselamatan, penggandengan komponen yang tidak sengaja bisa
                    berakibat fatal. Abyss menerapkan batas arsitektur keras, ditegakkan oleh graph
                    paket Turborepo, yang mencegah akses tak sah ke logika Crown Jewel. Ini bukan
                    konvensi, melainkan batasan arsitektur yang ditegakkan.
                  </li>
                  <li>
                    <b className="text-foreground">
                      Monorepo sebagai Single Source of Truth (SSOT).
                    </b>{' '}
                    Seluruh logika, tipe, skema, dan dokumentasi platform Sentra berada dalam satu
                    repositori. Ini menghapus drift versi antar-layanan, sumber umum bug halus pada
                    sistem kesehatan terdistribusi, dan memungkinkan perubahan lintas-lapisan yang
                    atomik.
                  </li>
                </ul>

                <SubHeading id="layer-model">Model Lapisan</SubHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Abyss memakai{' '}
                  <b className="text-foreground">
                    arsitektur berlapis dengan batas yang ditegakkan
                  </b>
                  , diorkestrasi oleh Turborepo 2.x. Basis kode ditata dalam hierarki paket yang
                  ketat: lapisan lebih tinggi bergantung pada yang lebih rendah, tidak pernah
                  sebaliknya. Graph dependensi searah inilah mekanisme utama penjaga integritas
                  arsitektur.
                </p>
                <EngineGraph />

                <SubHeading id="boundary-enforcement">Penegakan Batas</SubHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Sistem penegakan batas diwujudkan melalui kombinasi kendala workspace Turborepo,
                  aturan import ESLint, dan paket <code className={CODE}>boundary-manager</code>{' '}
                  khusus. Pelanggaran batas arsitektur diperlakukan sebagai kegagalan build, tidak
                  bisa di-merge ke branch utama.
                </p>
                <p className={cn(BODY, 'mb-4')}>
                  Paket Crown Jewel memikul tingkat proteksi tertinggi. Ia boleh dikonsumsi oleh
                  paket lapisan aplikasi, tetapi tidak boleh dimodifikasi langsung oleh proses
                  otomatis mana pun tanpa otorisasi eksplisit lewat alur tata kelola yang
                  didefinisikan di <code className={CODE}>AGENTS.md</code>. Setiap perubahan pada
                  logika Crown Jewel memerlukan tinjauan manusia.
                </p>
              </section>

              {/* ══ 3. CROWN JEWEL ENGINES ══ */}
              <section className="mt-12">
                <SectionHeading id="engines">Engine Permata Mahkota</SectionHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Istilah <em>Crown Jewels</em>, dipinjam dari leksikon manajemen risiko dan
                  keamanan, menandai aset dalam sistem yang bila terkompromikan akan menimbulkan
                  kerugian tak terpulihkan. Di Abyss, kelima engine Crown Jewel merepresentasikan
                  kecerdasan klinis dan operasional inti platform. Ia dipelihara di bawah disiplin
                  version control paling ketat, didokumentasikan pada standar tertinggi, dan
                  diisolasi di balik berlapis kontrol akses. Semuanya berada di namespace{' '}
                  <code className={CODE}>@sentra/*</code>.
                </p>

                {/* Poem block */}
                <div className="my-6 rounded-r-md border border-l-[3px] border-muted/20 border-l-accent bg-foreground/[0.03] px-6 py-6 md:columns-2 md:gap-8">
                  <h4 className="mb-4 text-center text-sm font-bold text-foreground md:[column-span:all]">
                    The Crown Jewels of Sentra
                  </h4>
                  {CROWN_JEWEL_POEM.map((stanza, i) => (
                    <p
                      key={i}
                      className={cn(
                        typeGovernance.editorialBody,
                        'mb-3 break-inside-avoid text-sm italic'
                      )}
                    >
                      {renderPoemStanza(stanza)}
                    </p>
                  ))}
                </div>

                {/* Engine cards */}
                {ENGINES.map((engine) => (
                  <EngineCard key={engine.id} {...engine} />
                ))}
              </section>

              {/* ══ 4. PLATFORM SERVICES ══ */}
              <section className="mt-12">
                <SectionHeading id="platform">Layanan Platform</SectionHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Lapisan Layanan Platform menyediakan infrastruktur operasional yang menopang
                  engine Crown Jewel dan lapisan aplikasi. Layanan ini menangani perhatian
                  lintas-potong, orkestrasi, persistensi, messaging, observabilitas, dan integrasi ,
                  secara agnostik terhadap klinis namun kritis secara operasional.
                </p>
                <ul className={cn(BODY, 'mb-4 list-disc space-y-3 pl-6')}>
                  <li>
                    <b className="text-foreground">Orchestration Engine (NestJS):</b>{' '}
                    Mengoordinasikan alur klinis multi-langkah berdurasi panjang sebagai saga
                    terdistribusi via Apache Kafka, menjamin operasi multi-layanan selesai atomik
                    atau terkompensasi deterministik saat gagal.
                  </li>
                  <li>
                    <b className="text-foreground">Sentra Portal (Next.js):</b> Dashboard
                    operasional dengan visibilitas real-time atas kesehatan platform, status alur
                    kerja, performa engine AI, dan aliran data klinis, disajikan sesuai peran
                    pengguna.
                  </li>
                  <li>
                    <b className="text-foreground">Lapisan Basis Data &amp; Persistensi:</b>{' '}
                    PostgreSQL 16+ dengan ekstensi <code className={CODE}>pgvector</code> untuk
                    pencarian kemiripan vektor berkinerja tinggi; Redis untuk caching dan state sesi
                    berkecepatan tinggi.
                  </li>
                  <li>
                    <b className="text-foreground">Platform Integrasi:</b> Mengelola konektivitas
                    antara Abyss dan sistem kesehatan eksternal, SIMRS, sistem laboratorium (LIS),
                    dan infrastruktur data nasional termasuk P-Care dan SATUSEHAT, di balik
                    antarmuka konektor terpadu.
                  </li>
                  <li>
                    <b className="text-foreground">Infrastruktur Messaging (Apache Kafka):</b>{' '}
                    Manajemen topik, integrasi schema registry, dan koordinasi consumer group untuk
                    pengiriman event yang andal dan berurutan, tulang punggung komunikasi asinkron
                    antar-layanan.
                  </li>
                </ul>
              </section>

              {/* ══ 5. APPLICATION ECOSYSTEM ══ */}
              <section className="mt-12">
                <SectionHeading id="apps">Ekosistem Aplikasi</SectionHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Lapisan aplikasi mencakup seluruh produk yang berhadapan langsung dengan pengguna
                  akhir. Aplikasi ditata per domain, masing-masing melayani kelompok pemangku
                  kepentingan berbeda sambil berbagi fondasi engine, platform, dan primitif monorepo
                  yang sama.
                </p>
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full rounded-md border border-muted/20 text-sm">
                    <thead>
                      <tr className="border-b border-muted/20 bg-foreground/[0.03]">
                        <th className={HEADER_CELL}>Domain</th>
                        <th className={HEADER_CELL}>Aplikasi Utama</th>
                        <th className={HEADER_CELL}>Pengguna Utama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {APP_ROWS.map((row, i) => (
                        <tr
                          key={row.domain}
                          className={cn(
                            'border-b border-muted/10',
                            i % 2 === 1 && 'bg-foreground/[0.02]'
                          )}
                        >
                          <td className="px-3 py-2.5 font-semibold text-foreground/90">
                            {row.domain}
                          </td>
                          <td className="px-3 py-2.5 text-muted">{row.apps}</td>
                          <td className="px-3 py-2.5 text-muted">{row.users}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={cn(BODY, 'mb-4')}>
                  Aplikasi andalan, <b className="text-foreground">Sentra Main</b>, adalah aplikasi
                  Next.js full-stack yang mengekspos kapabilitas penalaran klinis, pengambilan
                  pengetahuan RAG, dan manajemen pasien melalui antarmuka bagi klinisi, menghadirkan
                  insight AI di titik layanan dengan tingkat keyakinan dan sitasi sumber.{' '}
                  <b className="text-foreground">ReferraLink</b> mengelola alur koordinasi rujukan
                  ujung-ke-ujung, sedangkan{' '}
                  <b className="text-foreground">Intelligence Analytics Board</b> menyediakan
                  intelijen klinis tingkat populasi bagi administrator dan pejabat kesehatan
                  masyarakat.
                </p>
              </section>

              {/* ══ 6. DEVELOPMENT WORKFLOW ══ */}
              <section className="mt-12">
                <SectionHeading id="workflow">Alur Kerja Pengembangan</SectionHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Pengembangan di Abyss Monorepo diatur oleh alur kerja terstruktur yang menjaga
                  standar tertinggi mutu kode, keselamatan klinis, dan integritas arsitektur.
                  Sebagai proyek solo-developer, alurnya sengaja dioptimalkan untuk siklus berfokus
                  dan berkecepatan tinggi sambil menegakkan gerbang mutu yang diperlukan sistem
                  kesehatan kritis-keselamatan.
                </p>
                <p className={cn(BODY, 'mb-4')}>
                  Seluruh tugas pengembangan dikelola lewat skrip pnpm level-root yang
                  mendelegasikan ke Turborepo untuk penjadwalan, caching, dan paralelisasi tugas:
                </p>
                <div className="mb-4 overflow-x-auto rounded-md border border-muted/20 bg-foreground/[0.03] p-4 font-mono text-[13px] leading-[1.8]">
                  {WORKFLOW_COMMANDS.map((line) => (
                    <div key={line.cmd} className="whitespace-nowrap text-foreground/90">
                      {line.cmd} <span className="italic text-muted/60">{line.comment}</span>
                    </div>
                  ))}
                </div>
                <p className={cn(BODY, 'mb-4')}>
                  Pipeline CI/CD, via GitHub Actions, menegakkan urutan gerbang wajib sebelum
                  perubahan mencapai branch utama: pemeriksaan tipe, validasi batas, unit test,
                  integration test, dan audit keamanan. Perubahan pada paket Crown Jewel memicu
                  checklist tinjauan logika klinis tambahan yang harus ditandatangani secara
                  eksplisit. Lingkungan pengembangan terkontainerisasi dipelihara via Docker
                  Compose.
                </p>
              </section>

              {/* ══ 7. GOVERNANCE ══ */}
              <section className="mt-12">
                <SectionHeading id="governance">Tata Kelola &amp; Keselamatan</SectionHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Model tata kelola adalah salah satu ciri paling khas Abyss. Bagi platform AI
                  kesehatan, benar secara teknis saja tidak cukup, sistem harus terbukti dikelola,
                  dengan rantai akuntabilitas yang jelas, kerangka keputusan terdokumentasi, dan
                  riwayat perubahan yang dapat diaudit.
                </p>
                <SubHeading>AGENTS.md, Set Instruksi Tertinggi</SubHeading>
                <p className={cn(BODY, 'mb-4')}>
                  <code className={CODE}>AGENTS.md</code> adalah dokumen tata kelola pusat Abyss
                  Monorepo. Ia berfungsi sekaligus sebagai spesifikasi konfigurasi bagi agen AI
                  otonom dan sebagai dokumen konstitusional yang mengikat, mendefinisikan aturan,
                  batas, dan struktur akuntabilitas sistem. Seluruh proses otomatis di dalam
                  repositori terikat oleh ketentuannya; konflik antara perubahan agen dan AGENTS.md
                  diperlakukan sebagai error, bukan peringatan.
                </p>
                <SubHeading>Kebijakan Single Source of Truth (SSOT)</SubHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Kebijakan SSOT mewajibkan tidak ada satu pun informasi, definisi skema, deklarasi
                  tipe, data referensi klinis, atau nilai konfigurasi, yang berada di lebih dari
                  satu lokasi kanonik. Semua konsumen wajib merujuk ke lokasi kanonik tersebut.
                  Sinkronisasi state dikelola lewat hierarki <code className={CODE}>.agent/</code>,
                  direktori terstruktur berisi manifes state yang dapat dibaca agen untuk
                  memvalidasi kepatuhan SSOT secara otonom.
                </p>
                <SubHeading>Keselamatan AI &amp; Akuntabilitas Manusia</SubHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Selaras dengan prinsip AI yang bertanggung jawab, seluruh keluaran AI klinis di
                  Abyss secara eksplisit ditetapkan sebagai <em>dukungan keputusan</em>, bukan
                  pengganti keputusan. Tidak ada keluaran AI klinis yang ditampilkan tanpa ruang
                  tinjauan manusia, indikator keyakinan, sitasi bukti, dan disclaimer klinis.
                  Keputusan klinis otomatis, tanpa konfirmasi manusia, dilarang secara arsitektur
                  untuk aksi apa pun yang memengaruhi perawatan pasien.
                </p>
                <p className={cn(BODY, 'mb-4')}>
                  Pemantauan bias diperlakukan sebagai perhatian utama. Kerangka evaluasi
                  Sentra-Nada dan Sentra-Pustaka mencakup disagregasi metrik performa berdasarkan
                  demografi untuk mendeteksi perbedaan performa antar-subkelompok populasi. Bias
                  yang teridentifikasi dicatat dalam register bias dan wajib ditinjau untuk
                  remediasi.
                </p>
              </section>

              {/* ══ 8. REGULATORY ══ */}
              <section className="mt-12">
                <SectionHeading id="regulatory">Postur Regulasi &amp; Kepatuhan</SectionHeading>
                <p className={cn(BODY, 'mb-4')}>
                  Pengembangan Abyss dilakukan dengan kesadaran penuh atas lanskap regulasi
                  perangkat lunak medis berbasis AI yang terus berkembang. Platform ini dirancang
                  dan didokumentasikan untuk memfasilitasi pengajuan regulasi seiring matangnya
                  kerangka regulasi alat kesehatan AI di Indonesia, serta selaras dengan standar
                  internasional paling ketat yang relevan.
                </p>
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full rounded-md border border-muted/20 text-sm">
                    <thead>
                      <tr className="border-b border-muted/20 bg-foreground/[0.03]">
                        <th className={HEADER_CELL}>Kerangka</th>
                        <th className={HEADER_CELL}>Domain</th>
                        <th className={HEADER_CELL}>Relevansi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPLIANCE_ROWS.map((row, i) => (
                        <tr
                          key={row.framework}
                          className={cn(
                            'border-b border-muted/10',
                            i % 2 === 1 && 'bg-foreground/[0.02]'
                          )}
                        >
                          <td className="px-3 py-2.5 font-semibold text-foreground/90">
                            {row.framework}
                          </td>
                          <td className="px-3 py-2.5 text-muted">{row.domain}</td>
                          <td className="px-3 py-2.5 text-muted">{row.relevance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={cn(typeGovernance.bodySm, 'mt-4 text-sm italic text-muted/70')}>
                  Platform Abyss dan komponen AI klinisnya saat ini dalam pengembangan aktif. Belum
                  ada komponen yang memiliki izin edar resmi sebagai alat kesehatan. Seluruh
                  keluaran klinis bersifat informasional dan bukan nasihat medis. Konsultasikan
                  selalu dengan klinisi berkualifikasi untuk setiap keputusan klinis.
                </p>
              </section>

              {/* ══ 9. DOCUMENTATION LIBRARY ══ */}
              <section className="mt-12">
                <SectionHeading id="library">Pustaka Dokumentasi Lengkap</SectionHeading>
                <p className={cn(BODY, 'mb-6')}>
                  Berikut indeks menyeluruh seluruh berkas dokumentasi yang tersedia di dalam Abyss
                  Monorepo, ditata per domain dan paket.
                </p>
                <LibraryGrid />
              </section>

              {/* ══ 10. TECHNICAL SPECIFICATIONS ══ */}
              <section className="mt-12">
                <SectionHeading id="tech-specs">Spesifikasi Teknis</SectionHeading>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {TECH_SPEC_CARDS.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-md border border-muted/20 bg-foreground/[0.02] p-5 transition-colors hover:border-accent/40"
                    >
                      <h4 className="mb-3 text-sm font-bold text-foreground">{card.title}</h4>
                      <ul className="space-y-1.5 text-sm">
                        {card.items.map((item) => (
                          <li key={item.label} className="text-muted">
                            <b className="text-foreground">{item.label}:</b> {item.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* ══ 11. REFERENCES ══ */}
              <section className="mb-4 mt-12">
                <SectionHeading id="references">Referensi</SectionHeading>
                <ol className={cn(typeGovernance.bodySm, 'list-decimal space-y-1.5 pl-6')}>
                  {REFERENCE_DOCS.map((doc) => (
                    <li key={doc}>{doc}</li>
                  ))}
                </ol>
              </section>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
