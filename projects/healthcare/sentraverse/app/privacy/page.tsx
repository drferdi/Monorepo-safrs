import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description:
    'Kebijakan privasi Sentra Healthcare AI — bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-[800px] mx-auto px-6 md:px-12 py-32">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent transition-colors mb-12"
        >
          <ArrowLeft size={16} />
          Kembali ke Beranda
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold font-jakarta tracking-tight mb-4">
          Kebijakan Privasi
        </h1>
        <p className="text-muted text-sm mb-12">Terakhir diperbarui: Maret 2026</p>

        <div className="space-y-10 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">1. Pendahuluan</h2>
            <p>
              Sentra Healthcare Solutions (&quot;Sentra&quot;, &quot;kami&quot;) berkomitmen
              melindungi privasi pengguna layanan kami. Kebijakan ini menjelaskan bagaimana kami
              mengumpulkan, menggunakan, menyimpan, dan melindungi informasi Anda saat menggunakan
              platform Sentra AI Healthcare.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">
              2. Informasi yang Kami Kumpulkan
            </h2>
            <p className="mb-3">Kami dapat mengumpulkan informasi berikut:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Informasi Identitas:</strong> Nama, alamat email, jabatan, dan afiliasi
                institusi kesehatan.
              </li>
              <li>
                <strong>Data Penggunaan:</strong> Interaksi dengan platform, halaman yang
                dikunjungi, dan fitur yang digunakan.
              </li>
              <li>
                <strong>Data Teknis:</strong> Alamat IP, jenis browser, sistem operasi, dan
                informasi perangkat.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">
              3. Perlindungan Data Kesehatan (PHI)
            </h2>
            <p>
              Sentra menerapkan kebijakan <strong>Zero PHI in Logs</strong>. Data pasien tidak
              pernah muncul dalam log sistem, laporan error, atau analytics. Semua data klinis
              diproses secara lokal pada infrastruktur fasilitas kesehatan yang bersangkutan dan
              dilindungi oleh audit trail yang tidak dapat diubah (immutable).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">4. Penggunaan Informasi</h2>
            <p className="mb-3">Informasi yang kami kumpulkan digunakan untuk:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Menyediakan dan meningkatkan layanan Clinical Decision Support.</li>
              <li>Mengembangkan fitur baru berdasarkan kebutuhan klinis.</li>
              <li>Mengirim pembaruan penting terkait layanan dan keamanan.</li>
              <li>Memenuhi kewajiban hukum dan regulasi kesehatan Indonesia.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">5. Keamanan Data</h2>
            <p>
              Kami menerapkan standar keamanan tingkat enterprise: enkripsi HTTPS dengan HSTS
              preload, Content Security Policy, proteksi XSS dan clickjacking, serta audit trail 10
              tahun yang tidak dapat diubah. Infrastruktur kami di-deploy pada Railway dengan CDN
              Fastly dan edge server di Asia Tenggara.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">
              6. Berbagi Data dengan Pihak Ketiga
            </h2>
            <p>
              Kami <strong>tidak menjual</strong> data pengguna kepada pihak ketiga. Data hanya
              dibagikan ketika diwajibkan oleh hukum Indonesia atau diperlukan untuk penyediaan
              layanan (misalnya, hosting infrastructure).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">7. Hak Pengguna</h2>
            <p className="mb-3">Sesuai dengan regulasi perlindungan data Indonesia, Anda berhak:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Mengakses data pribadi yang kami simpan tentang Anda.</li>
              <li>Meminta koreksi data yang tidak akurat.</li>
              <li>Meminta penghapusan data pribadi Anda.</li>
              <li>Menarik persetujuan pemrosesan data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">8. Cookie</h2>
            <p>
              Website ini menggunakan cookie teknis yang diperlukan untuk fungsi dasar situs. Kami
              tidak menggunakan cookie pelacakan pihak ketiga atau cookie iklan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">9. Kontak</h2>
            <p>
              Untuk pertanyaan terkait privasi, hubungi kami di:{' '}
              <a
                href="mailto:drferdiiskandar@sentrahai.com"
                className="text-accent hover:underline"
              >
                drferdiiskandar@sentrahai.com
              </a>
            </p>
            <p className="mt-2">
              Sentra Healthcare Solutions
              <br />
              Laboratorium Technology RSIA Melinda DHAI
              <br />
              Kediri, Jawa Timur, Indonesia
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
