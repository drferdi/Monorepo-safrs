import Link from "next/link";
import type { ReactElement } from "react";

import { SiteFooter } from "../../components/site-footer";
import { SiteNav } from "../../components/site-nav";

/**
 * Beranda.
 *
 * Ia tidak menduplikasi Journey. Ia menjelaskan apa ini dan membiarkan
 * pengunjung memilih modenya (UX Bible bagian 4): tidak ada intro paksa,
 * tidak ada carousel berita, tidak ada sambutan wajib.
 */
export const metadata = {
  title: "Kediri — A Living Civilization",
  description:
    "Kerajaan berganti. Rezim berganti. Industri tumbuh. Brantas terus mengalir. Kediri bertahan. 879 hingga 2026.",
};

export default function HomePage(): ReactElement {
  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content">
        <header className="home-hero">
          <p className="eyebrow">Kota Kediri · Jawa Timur</p>
          <h1 className="title-page">A Living Civilization</h1>
          <p className="home-range archive-label">879 → 2026</p>
          <p className="lead measure">
            Kerajaan berganti. Rezim berganti. Industri tumbuh. Sungai Brantas
            terus mengalir. Kediri bertahan.
          </p>
          <p className="home-actions">
            <Link href="/journey" className="action-primary">
              Mulai perjalanan
            </Link>
            <Link href="/explore/timeline">Jelajahi sejarah</Link>
            <Link href="/sources">Telusuri sumber</Link>
          </p>
        </header>

        <section aria-labelledby="modes" className="home-modes">
          <h2 id="modes" className="visually-hidden">
            Tiga cara masuk
          </h2>
          <div className="card-grid">
            <article>
              <h3 className="record-title">Perjalanan waktu</h3>
              <p>
                Pengalaman sinematik berurutan, dari 879 sampai hari ini. Untuk
                yang ingin merasakan dan memahami cerita besarnya.
              </p>
              <Link href="/journey">Ke Journey</Link>
            </article>
            <article>
              <h3 className="record-title">Jelajahi Kediri</h3>
              <p>
                Kronologi, tempat yang masih berdiri, dan tema yang menyambung
                zaman. Untuk yang mencari satu hal tertentu.
              </p>
              <Link href="/explore/timeline">Ke Explore</Link>
            </article>
            <article>
              <h3 className="record-title">Arsip sejarah</h3>
              <p>
                Peristiwa, orang, tempat, objek, dan sumber — lengkap dengan apa
                yang ditopang setiap bukti dan apa yang tidak.
              </p>
              <Link href="/archive">Ke Arsip</Link>
            </article>
          </div>
        </section>

        <section aria-labelledby="how-we-know" className="measure">
          <h2 id="how-we-know" className="title-scene">
            Bagaimana kami tahu
          </h2>
          <p className="prose">
            Setiap klaim faktual di situs ini terhubung ke sumbernya, dan setiap
            sumber membawa kelas buktinya: catatan primer, fakta historis,
            interpretasi ilmiah, tradisi, folklor, atau data modern
            terverifikasi. Keenamnya tidak pernah dilebur.
          </p>
          <p className="prose">
            Folklor bukan sejarah yang gagal. Ia adalah bukti tentang apa yang
            diingat, ditakuti, dan dibayangkan orang. Karena itu ia ditampilkan
            sebagai folklor, bukan disamarkan sebagai fakta.
          </p>
          <p>
            <Link href="/methodology">Baca metodologi</Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
