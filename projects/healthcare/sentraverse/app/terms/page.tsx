import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description:
    'Syarat dan ketentuan penggunaan platform Sentra Healthcare AI — panduan penggunaan layanan Clinical Decision Support.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
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
          Syarat &amp; Ketentuan
        </h1>
        <p className="text-muted text-sm mb-12">Terakhir diperbarui: Maret 2026</p>

        <div className="space-y-10 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">1. Penerimaan Syarat</h2>
            <p>
              Dengan mengakses dan menggunakan platform Sentra Healthcare AI (&quot;Layanan&quot;),
              Anda menyetujui untuk terikat oleh syarat dan ketentuan ini. Jika Anda tidak
              menyetujui syarat ini, mohon untuk tidak menggunakan Layanan kami.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">
              2. Sifat Layanan — Clinical Decision Support
            </h2>
            <p>
              Sentra AI adalah alat <strong>bantu keputusan klinis</strong> (Clinical Decision
              Support), <strong>bukan</strong> pengganti penilaian medis profesional. Teknologi ini
              dirancang untuk mendukung — bukan menggantikan — keputusan dokter dan tenaga
              kesehatan. Tanggung jawab akhir atas setiap keputusan klinis tetap berada pada tenaga
              medis yang berwenang.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">3. Pengguna yang Diizinkan</h2>
            <p className="mb-3">Layanan ini ditujukan untuk:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Tenaga kesehatan berlisensi (dokter, perawat, bidan) yang bekerja di fasilitas
                kesehatan terafiliasi.
              </li>
              <li>Administrator fasilitas kesehatan yang berwenang.</li>
              <li>Pihak yang secara eksplisit diizinkan oleh Sentra Healthcare Solutions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">4. Batasan Tanggung Jawab</h2>
            <p>
              Sentra Healthcare Solutions menyediakan Layanan &quot;sebagaimana adanya&quot;.
              Meskipun kami berupaya keras memastikan akurasi dan keandalan sistem AI kami (termasuk
              tingkat akurasi triase emergensi 97,2%), kami tidak menjamin bahwa Layanan akan selalu
              bebas dari error, gangguan, atau ketidakakuratan. Sentra tidak bertanggung jawab atas
              kerugian yang timbul dari keputusan klinis yang dibuat berdasarkan output sistem.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">5. Kekayaan Intelektual</h2>
            <p>
              Seluruh konten, algoritma, model AI, desain, dan kode sumber yang terkait dengan
              platform Sentra merupakan kekayaan intelektual Sentra Healthcare Solutions. Pengguna
              tidak diizinkan untuk menyalin, memodifikasi, mendistribusikan, atau merekayasa balik
              komponen apapun dari Layanan tanpa izin tertulis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">6. Keamanan Akun</h2>
            <p>
              Pengguna bertanggung jawab menjaga kerahasiaan kredensial akses mereka. Segala
              aktivitas yang terjadi melalui akun Anda menjadi tanggung jawab Anda. Laporkan segera
              kepada kami jika terjadi akses tidak sah.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">7. Audit Trail &amp; Kepatuhan</h2>
            <p>
              Sentra menerapkan audit trail yang tidak dapat diubah (immutable) dengan retensi 10
              tahun untuk setiap interaksi klinis. Ini merupakan bagian dari komitmen kami terhadap
              akuntabilitas dan kepatuhan regulasi kesehatan Indonesia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">8. Pengakhiran Layanan</h2>
            <p>
              Kami berhak menangguhkan atau mengakhiri akses Anda ke Layanan jika terjadi
              pelanggaran terhadap syarat ini, penggunaan yang tidak sah, atau atas permintaan
              otoritas yang berwenang.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">9. Hukum yang Berlaku</h2>
            <p>
              Syarat dan ketentuan ini diatur oleh dan ditafsirkan sesuai dengan hukum Republik
              Indonesia. Sengketa yang timbul akan diselesaikan melalui mekanisme yang ditentukan
              oleh peraturan perundang-undangan yang berlaku.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold font-jakarta mb-3">10. Kontak</h2>
            <p>
              Untuk pertanyaan terkait syarat dan ketentuan ini, hubungi:{' '}
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
