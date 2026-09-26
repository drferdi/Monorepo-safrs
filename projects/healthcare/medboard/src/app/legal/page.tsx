'use client'

import { useEffect, useState } from 'react'

/* ── Types ── */

type LegalTab = 'disclaimer' | 'privacy' | 'terms' | 'security'

interface TabDef {
  key: LegalTab
  label: string
}

const TABS: TabDef[] = [
  { key: 'disclaimer', label: 'DISCLAIMER AI' },
  { key: 'privacy', label: 'PRIVASI DATA' },
  { key: 'terms', label: 'KETENTUAN' },
  { key: 'security', label: 'KEAMANAN' },
]

const ACCENT = 'var(--c-asesmen)'
const VERSION = '1.0'
const LAST_UPDATED = '9 Maret 2026'

/* ── Section Components ── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 16,
        fontWeight: 600,
        color: ACCENT,
        margin: '32px 0 12px',
        letterSpacing: '0.05em',
      }}
    >
      {children}
    </h3>
  )
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 15,
        lineHeight: 1.75,
        color: 'var(--text-main)',
        margin: '0 0 14px',
      }}
    >
      {children}
    </p>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul
      style={{
        margin: '8px 0 16px',
        paddingLeft: 24,
        listStyleType: 'disc',
      }}
    >
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            fontSize: 15,
            lineHeight: 1.75,
            color: 'var(--text-main)',
            marginBottom: 4,
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

function AlertBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderLeft: `3px solid ${ACCENT}`,
        background: 'color-mix(in srgb, var(--c-asesmen) 6%, transparent)',
        borderRadius: 4,
        margin: '16px 0 20px',
      }}
    >
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.75,
          color: 'var(--text-main)',
          margin: 0,
          fontWeight: 500,
        }}
      >
        {children}
      </p>
    </div>
  )
}

/* ── Tab Content ── */

function DisclaimerTab() {
  return (
    <div>
      <SectionHeading>Tentang Disclaimer Ini</SectionHeading>
      <Paragraph>
        Sentra Intelligence Dashboard mengintegrasikan beberapa teknologi kecerdasan buatan (AI)
        untuk mendukung alur kerja klinis. Disclaimer ini menjelaskan batasan, risiko, dan tanggung
        jawab terkait penggunaan fitur-fitur AI dalam sistem.
      </Paragraph>

      <SectionHeading>Fitur AI yang Terintegrasi</SectionHeading>
      <BulletList
        items={[
          'Iskandar Engine (CDSS) — Clinical Decision Support System untuk asesmen dan rekomendasi diagnosis berbasis gejala dan tanda klinis',
          'ICD-10 Autocomplete — Saran otomatis kode diagnosis ICD-10 (WHO 2010, 2016, 2019) berdasarkan input teks klinis',
          'Audrey Synthesia — Generasi narasi klinis otomatis (ringkasan anamnesa, asesmen) menggunakan model bahasa besar',
          'Clinical Inference Gates — Klasifikasi tanda vital (WHO/AHA), hipertensi (FKTP 2024), glukosa (PERKENI/ADA), dan deteksi syok okult (MSF) menggunakan rule-based engine',
          'Voice Consultation — konsultasi suara real-time menggunakan provider yang disetujui untuk diskusi klinis',
        ]}
      />

      <SectionHeading>Batasan Penting</SectionHeading>
      <AlertBox>
        Seluruh output AI bersifat INFORMATIF dan SUGESTIF semata — BUKAN merupakan diagnosis medis,
        BUKAN resep pengobatan, dan BUKAN pengganti penilaian klinis (clinical judgment) tenaga
        kesehatan.
      </AlertBox>

      <BulletList
        items={[
          'AI TIDAK menggantikan penilaian klinis dokter — tenaga kesehatan yang merawat pasien tetap bertanggung jawab penuh atas semua keputusan medis',
          'AI dapat menghasilkan kesalahan (error), halusinasi (hallucination), atau informasi yang sudah tidak relevan (outdated)',
          'Skor kepercayaan (confidence score) bersifat probabilistik, bukan diagnosis definitif',
          'Klinisi WAJIB memverifikasi secara independen semua saran AI sebelum mengambil tindakan klinis apa pun',
          'Fitur AI TIDAK divalidasi untuk keputusan klinis darurat atau kondisi yang mengancam jiwa',
          'Akurasi AI bergantung pada kualitas dan kelengkapan data input — data yang tidak lengkap atau tidak akurat akan menghasilkan output yang tidak dapat diandalkan',
        ]}
      />

      <SectionHeading>Penggunaan Layanan AI Eksternal</SectionHeading>
      <Paragraph>
        Beberapa fitur AI dapat menggunakan layanan pihak ketiga yang disetujui untuk pemrosesan.
        Data yang dikirim ke layanan eksternal diproses sesuai kebijakan privasi penyedia layanan
        tersebut. Tidak ada data identitas pasien (PII/PHI) yang dikirim ke layanan AI eksternal
        tanpa anonimisasi terlebih dahulu.
      </Paragraph>

      <SectionHeading>Tanggung Jawab Profesional</SectionHeading>
      <Paragraph>
        Sesuai dengan Kode Etik Kedokteran Indonesia (KODEKI) dan standar praktik profesi kesehatan
        yang berlaku, tanggung jawab atas keputusan klinis sepenuhnya berada pada tenaga kesehatan
        yang merawat pasien. Penggunaan alat bantu AI tidak mengalihkan, mengurangi, atau
        menghilangkan tanggung jawab profesional tersebut.
      </Paragraph>

      <AlertBox>
        Sentra Healthcare Solutions tidak bertanggung jawab atas keputusan klinis yang diambil
        berdasarkan output AI. Setiap tindakan medis harus didasarkan pada penilaian klinis
        profesional yang komprehensif.
      </AlertBox>
    </div>
  )
}

function PrivacyTab() {
  return (
    <div>
      <SectionHeading>Pengendali Data</SectionHeading>
      <Paragraph>
        Pengelolaan data dalam sistem ini dilaksanakan secara bersama (joint controller) oleh:
      </Paragraph>
      <BulletList
        items={[
          'Sentra Healthcare Solutions — sebagai pengembang dan pengelola teknis platform',
          'UPTD Puskesmas Balowerti, Kota Kediri — sebagai fasilitas kesehatan dan pengendali data pasien sesuai regulasi',
        ]}
      />

      <SectionHeading>Dasar Hukum Pemrosesan Data</SectionHeading>
      <BulletList
        items={[
          'UU No. 27/2022 tentang Perlindungan Data Pribadi (UU PDP) — Pasal 20: pemrosesan untuk kepentingan kesehatan yang sah',
          'UU No. 17/2023 tentang Kesehatan — kewajiban EMR dan integrasi SATUSEHAT',
          'Permenkes No. 24/2022 — standar rekam medis elektronik, keamanan dan kerahasiaan data',
          'PP No. 28/2024 — peraturan pelaksanaan UU Kesehatan tentang tata kelola teknologi kesehatan',
        ]}
      />

      <SectionHeading>Jenis Data yang Dikumpulkan</SectionHeading>

      <Paragraph>
        <strong>Data Tenaga Kesehatan (Crew):</strong> nama, username, email, profesi, jabatan,
        institusi, foto profil, log aktivitas sistem.
      </Paragraph>
      <Paragraph>
        <strong>Data Pasien (melalui EMR):</strong> demografi, riwayat penyakit, anamnesa,
        pemeriksaan fisik, diagnosis (ICD-10), resep obat, hasil laboratorium, rujukan.
      </Paragraph>
      <Paragraph>
        <strong>Data Operasional:</strong> laporan LB1/SP3, log RPA, riwayat konversi ICD-10, metrik
        performa server.
      </Paragraph>

      <SectionHeading>Tujuan Pemrosesan</SectionHeading>
      <BulletList
        items={[
          'Dokumentasi rekam medis elektronik sesuai standar Permenkes 24/2022',
          'Pelaporan bulanan LB1 ke Dinas Kesehatan',
          'Dukungan keputusan klinis (CDSS) untuk meningkatkan mutu pelayanan',
          'Analitik operasional internal untuk optimasi layanan Puskesmas',
          'Komunikasi tim klinis melalui ACARS (chat internal)',
        ]}
      />

      <SectionHeading>Penerima Data</SectionHeading>
      <Paragraph>
        Data hanya dibagikan kepada pihak yang memiliki dasar hukum dan kepentingan klinis yang sah:
      </Paragraph>
      <BulletList
        items={[
          'SATUSEHAT (Kementerian Kesehatan) — integrasi data kesehatan nasional',
          'Dinas Kesehatan Kota Kediri — pelaporan rutin (LB1/SP3)',
          'TIDAK ADA pembagian data ke pihak ketiga komersial',
        ]}
      />

      <SectionHeading>Penyimpanan & Retensi</SectionHeading>
      <BulletList
        items={[
          'Data rekam medis disimpan sesuai ketentuan retensi Permenkes 24/2022',
          'Rekam medis aktif: minimal 5 tahun sejak kunjungan terakhir pasien',
          'Rekam medis inaktif: disimpan sebagai arsip sesuai peraturan yang berlaku',
          'Data server dan log operasional: retensi berdasarkan kebutuhan teknis dan audit',
          'Hosting: infrastruktur cloud dengan standar keamanan yang memadai',
        ]}
      />

      <SectionHeading>Langkah Keamanan Data</SectionHeading>
      <BulletList
        items={[
          'Enkripsi transmisi data melalui HTTPS/TLS',
          'Password hashing menggunakan scrypt (N=16384, r=8, p=1)',
          'Session token HMAC-SHA256 dengan masa berlaku 12 jam',
          'Role-based access control (RBAC) berdasarkan profesi dan peran',
          'Audit log untuk setiap akses dan perubahan data',
        ]}
      />

      <SectionHeading>Hak Subjek Data</SectionHeading>
      <Paragraph>Sesuai UU PDP, subjek data memiliki hak sebagai berikut:</Paragraph>
      <BulletList
        items={[
          'Hak akses — memperoleh informasi tentang data pribadi yang diproses',
          'Hak koreksi — meminta perbaikan data yang tidak akurat atau tidak lengkap',
          'Hak penghapusan — meminta penghapusan data (dalam batas ketentuan retensi rekam medis)',
          'Hak pembatasan — meminta pembatasan pemrosesan data dalam kondisi tertentu',
          'Hak keberatan — mengajukan keberatan atas pemrosesan data',
        ]}
      />

      <SectionHeading>Notifikasi Pelanggaran Data</SectionHeading>
      <AlertBox>
        Dalam hal terjadi pelanggaran data pribadi, Sentra Healthcare Solutions dan UPTD Puskesmas
        Balowerti berkomitmen untuk menyampaikan notifikasi kepada subjek data dan otoritas yang
        berwenang dalam waktu maksimal 72 jam setelah pelanggaran diketahui, sesuai UU PDP.
      </AlertBox>
    </div>
  )
}

function TermsTab() {
  return (
    <div>
      <SectionHeading>Lingkup Layanan</SectionHeading>
      <Paragraph>
        Sentra Intelligence Dashboard menyediakan fitur-fitur berikut untuk mendukung operasional
        klinis harian di fasilitas kesehatan:
      </Paragraph>
      <BulletList
        items={[
          'Rekam Medis Elektronik (EMR) — dokumentasi klinis pasien rawat jalan',
          'Otomasi RPA — pengisian otomatis data ke sistem ePuskesmas',
          'Laporan LB1/SP3 — generasi laporan bulanan ke Dinas Kesehatan',
          'ICD-10 Converter — pencarian dan konversi kode diagnosis lintas versi',
          'CDSS — dukungan keputusan klinis berbasis AI (Iskandar Engine)',
          'Konsultasi Suara — diskusi klinis real-time (Audrey)',
          'ACARS — komunikasi tim klinis internal',
          'Clinical Inference — klasifikasi tanda vital, tekanan darah, glukosa, dan deteksi syok okult',
        ]}
      />

      <SectionHeading>Eligibilitas & Otorisasi</SectionHeading>
      <BulletList
        items={[
          'Pengguna harus merupakan tenaga kesehatan terdaftar dengan STR/SIP aktif yang berlaku',
          'Akun bersifat personal dan TIDAK BOLEH dipindahtangankan atau digunakan bersama',
          'Pendaftaran memerlukan persetujuan dari Administrator atau CEO',
          'Akses fitur disesuaikan berdasarkan profesi dan peran (RBAC)',
        ]}
      />

      <SectionHeading>Kewajiban Pengguna</SectionHeading>
      <BulletList
        items={[
          'Menjaga kerahasiaan kredensial akun (username dan password) — TIDAK berbagi dengan pihak lain',
          'Memasukkan data klinis secara akurat, lengkap, dan tepat waktu',
          'Melaporkan segera setiap insiden keamanan, akses tidak sah, atau dugaan penyalahgunaan sistem',
          'Menggunakan sistem sesuai standar operasional prosedur (SOP) yang berlaku',
          'Melakukan logout setelah selesai menggunakan sistem, terutama pada perangkat bersama',
        ]}
      />

      <SectionHeading>Penggunaan yang Dilarang</SectionHeading>
      <BulletList
        items={[
          'Mengakses data rekam medis pasien tanpa kepentingan klinis yang sah (need-to-know basis)',
          'Mengekspor, menyalin, atau memindahkan data pasien keluar dari sistem tanpa otorisasi tertulis',
          'Berbagi kredensial akun atau menggunakan akun milik orang lain',
          'Berupaya memanipulasi, menonaktifkan, atau melewati kontrol keamanan sistem',
          'Mengambil tangkapan layar (screenshot) data pasien ke perangkat pribadi',
          'Menggunakan sistem untuk tujuan selain pelayanan klinis yang sah',
        ]}
      />

      <SectionHeading>Hak Kekayaan Intelektual</SectionHeading>
      <Paragraph>
        Seluruh hak kekayaan intelektual atas platform Puskesmas Intelligence Dashboard — termasuk
        kode sumber, desain antarmuka, algoritma AI (Iskandar Engine, Audrey Synthesia),
        dokumentasi, dan konten terkait — merupakan milik eksklusif Sentra Healthcare Solutions dan
        dilindungi oleh hukum hak cipta yang berlaku.
      </Paragraph>
      <AlertBox>
        Dilarang keras menggandakan, mendistribusikan, memodifikasi, melakukan rekayasa balik
        (reverse engineering), atau menggunakan bagian mana pun dari sistem ini tanpa izin tertulis
        dari Sentra Healthcare Solutions.
      </AlertBox>

      <SectionHeading>Batasan Tanggung Jawab</SectionHeading>
      <Paragraph>
        Sentra Healthcare Solutions menyediakan platform ini sebagai alat bantu klinis. Platform
        tidak dimaksudkan untuk menggantikan penilaian profesional tenaga kesehatan. Sentra tidak
        bertanggung jawab atas:
      </Paragraph>
      <BulletList
        items={[
          'Keputusan klinis yang diambil berdasarkan output sistem',
          'Kerugian akibat ketidakakuratan data yang dimasukkan oleh pengguna',
          'Gangguan layanan akibat faktor di luar kendali (force majeure, gangguan jaringan)',
          'Konsekuensi dari penggunaan sistem yang tidak sesuai dengan SOP',
        ]}
      />

      <SectionHeading>Hukum yang Berlaku</SectionHeading>
      <Paragraph>
        Ketentuan penggunaan ini tunduk pada hukum Negara Republik Indonesia. Setiap perselisihan
        yang timbul akan diselesaikan secara musyawarah terlebih dahulu, dan jika tidak tercapai
        kesepakatan, melalui Pengadilan Negeri Kediri, Jawa Timur.
      </Paragraph>
    </div>
  )
}

function SecurityTab() {
  return (
    <div>
      <SectionHeading>Kontrol Akses Berbasis Peran (RBAC)</SectionHeading>
      <Paragraph>
        Sistem menerapkan kontrol akses berlapis berdasarkan profesi dan peran organisasi:
      </Paragraph>

      <div
        style={{
          border: '1px solid var(--line-base, rgba(255,255,255,0.08))',
          borderRadius: 8,
          overflow: 'hidden',
          margin: '12px 0 20px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                background: 'color-mix(in srgb, var(--c-asesmen) 8%, transparent)',
              }}
            >
              <th
                style={{
                  padding: '10px 16px',
                  fontSize: 15,
                  fontWeight: 600,
                  textAlign: 'left',
                  color: ACCENT,
                  letterSpacing: '0.1em',
                }}
              >
                PERAN
              </th>
              <th
                style={{
                  padding: '10px 16px',
                  fontSize: 15,
                  fontWeight: 600,
                  textAlign: 'left',
                  color: ACCENT,
                  letterSpacing: '0.1em',
                }}
              >
                AKSES
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                'CEO',
                'Akses penuh ke seluruh modul, manajemen pengguna, persetujuan registrasi, konfigurasi sistem',
              ],
              [
                'ADMINISTRATOR',
                'Manajemen pengguna, monitoring operasional, persetujuan registrasi, konfigurasi',
              ],
              ['DOKTER', 'EMR, CDSS, ICD-10, konsultasi AI, laporan klinis'],
              ['PERAWAT', 'Triase, pengkajian awal, tanda vital, dokumentasi keperawatan'],
              ['BIDAN', 'Dokumentasi kebidanan, pelayanan KIA'],
              ['APOTEKER', 'Data resep, interaksi obat, farmasi klinis'],
            ].map(([role, access], i) => (
              <tr
                key={i}
                style={{
                  borderTop: '1px solid var(--line-base, rgba(255,255,255,0.06))',
                }}
              >
                <td
                  style={{
                    padding: '10px 16px',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--text-main)',
                  }}
                >
                  {role}
                </td>
                <td
                  style={{
                    padding: '10px 16px',
                    fontSize: 15,
                    color: 'var(--text-main)',
                  }}
                >
                  {access}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeading>Autentikasi & Manajemen Sesi</SectionHeading>
      <BulletList
        items={[
          'Password di-hash menggunakan algoritma scrypt (N=16384, r=8, p=1, 64-byte key) — tidak disimpan dalam bentuk teks biasa (plaintext)',
          'Session token ditandatangani dengan HMAC-SHA256 dan disimpan sebagai HTTP cookie',
          'Masa berlaku sesi: 12 jam — setelahnya pengguna harus login ulang',
          'Pendaftaran pengguna baru memerlukan persetujuan Administrator atau CEO',
        ]}
      />

      <SectionHeading>Enkripsi & Transmisi Data</SectionHeading>
      <BulletList
        items={[
          'Seluruh komunikasi data melalui HTTPS/TLS untuk enkripsi in-transit',
          'Komunikasi real-time (Socket.IO/ACARS) berjalan melalui koneksi terenkripsi',
          'API endpoints dilindungi oleh validasi session dan role-checking',
        ]}
      />

      <SectionHeading>Audit Trail & Monitoring</SectionHeading>
      <BulletList
        items={[
          'Setiap operasi LB1 dan EMR dicatat dalam riwayat (history log) dengan timestamp',
          'Log error menggunakan prefix modul ([LB1], [EMR], [CDSS], [Auth]) untuk traceability',
          'Monitoring kesehatan modul: status terakhir LB1, EMR, dan Voice',
          'Metrik server: penggunaan memori (Heap/RSS), uptime, versi runtime',
        ]}
      />

      <SectionHeading>Keamanan Otomasi RPA</SectionHeading>
      <Paragraph>
        Modul RPA (Robotic Process Automation) menggunakan Playwright untuk otomasi pengisian data
        ke sistem ePuskesmas. Langkah pengamanan yang diterapkan:
      </Paragraph>
      <BulletList
        items={[
          'Kredensial RPA disimpan sebagai environment variable (server-side only) — tidak tersimpan di kode sumber',
          'Session storage RPA dikelola secara terpisah dan tidak dapat diakses oleh pengguna',
          'Setiap run RPA dicatat dalam history dengan status (success/failed) dan detail error',
          'Bukti (evidence) tangkapan layar RPA disimpan di direktori runtime yang git-ignored',
        ]}
      />

      <SectionHeading>Prosedur Insiden Keamanan</SectionHeading>
      <Paragraph>Dalam hal terjadi insiden keamanan informasi:</Paragraph>
      <BulletList
        items={[
          'Identifikasi & Penahanan — isolasi sistem yang terdampak untuk mencegah penyebaran',
          'Notifikasi — pemberitahuan kepada CEO dan Administrator dalam 24 jam pertama',
          'Investigasi — analisis akar masalah (root cause analysis) dan dampak',
          'Notifikasi Regulasi — laporan ke otoritas terkait dan subjek data dalam 72 jam (sesuai UU PDP)',
          'Pemulihan — perbaikan kerentanan dan pemulihan layanan',
          'Dokumentasi — laporan insiden lengkap untuk arsip dan pembelajaran',
        ]}
      />

      <SectionHeading>Infrastruktur</SectionHeading>
      <BulletList
        items={[
          'Platform deployment: Railway (cloud hosting dengan isolasi container)',
          'Runtime: Node.js 20 LTS dengan TypeScript strict mode',
          'Restart policy: otomatis saat kegagalan, maksimal 3 percobaan ulang',
          'Health check: monitoring aktif untuk semua modul inti',
        ]}
      />
    </div>
  )
}

/* ── Main Component ── */

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState<LegalTab>('disclaimer')

  /* Support hash-based tab switching (e.g., /legal#privacy) */
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as LegalTab
    if (TABS.some(t => t.key === hash)) setActiveTab(hash)
  }, [])

  return (
    <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 8 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
          }}
        >
          LEGAL & GOVERNANCE
        </p>
        <h1
          style={{
            margin: '6px 0 0',
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--text-main)',
          }}
        >
          Hukum & Kepatuhan
        </h1>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 15,
            color: 'var(--text-muted)',
          }}
        >
          Halaman ini memuat informasi hukum, disclaimer, kebijakan privasi, dan ketentuan
          penggunaan sistem Sentra Intelligence Dashboard.
        </p>
      </div>

      {/* ── Tab Navigation ── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '16px 0 24px',
          borderBottom: '1px solid var(--line-base, rgba(255,255,255,0.08))',
        }}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                window.history.replaceState(null, '', `#${tab.key}`)
              }}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: isActive
                  ? '1px solid color-mix(in srgb, var(--c-asesmen) 40%, transparent)'
                  : '1px solid var(--line-base, rgba(255,255,255,0.08))',
                background: isActive
                  ? 'color-mix(in srgb, var(--c-asesmen) 8%, transparent)'
                  : 'transparent',
                color: isActive ? ACCENT : 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ padding: '8px 0 40px' }}>
        {activeTab === 'disclaimer' && <DisclaimerTab />}
        {activeTab === 'privacy' && <PrivacyTab />}
        {activeTab === 'terms' && <TermsTab />}
        {activeTab === 'security' && <SecurityTab />}
      </div>

      {/* ── Document Footer ── */}
      <div
        style={{
          borderTop: '1px solid var(--line-base, rgba(255,255,255,0.08))',
          padding: '20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 15,
            color: 'var(--text-muted)',
          }}
        >
          Terakhir diperbarui: {LAST_UPDATED} &middot; Versi {VERSION}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            color: 'var(--text-muted)',
          }}
        >
          &copy; {new Date().getFullYear()} Sentra Healthcare Solutions
        </p>
      </div>
    </div>
  )
}
