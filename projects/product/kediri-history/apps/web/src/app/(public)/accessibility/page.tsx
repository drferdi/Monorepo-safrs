import type { ReactElement } from "react";

import { SiteFooter } from "../../../components/site-footer";
import { SiteNav } from "../../../components/site-nav";

export const metadata = {
  title: "Aksesibilitas",
  description:
    "Komitmen aksesibilitas situs sejarah Kediri, termasuk reduced motion dan operasi keyboard penuh.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage(): ReactElement {
  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content" className="section-stack">
        <header className="archive-header">
          <p className="eyebrow">Aksesibilitas</p>
          <h1 className="title-page">Sejarah untuk semua orang</h1>
          <p className="lead measure">
            Target: WCAG 2.2 AA. Tontonan visual tidak pernah menjadi alasan
            untuk mengorbankan aksesibilitas.
          </p>
        </header>

        <section className="measure">
          <h2 className="title-scene">Yang berlaku hari ini</h2>
          <ul className="record-list">
            <li>
              <span className="record-title">Reduced motion</span>
              <span className="prose">
                Bila sistem Anda meminta gerak minimal, situs ini menghormatinya
                sepenuhnya. Itu bukan versi rusak: seluruh sejarahnya tetap ada,
                hanya tanpa gerak.
              </span>
            </li>
            <li>
              <span className="record-title">Tanpa JavaScript</span>
              <span className="prose">
                Bila JavaScript gagal dimuat, bioskopnya hilang dan situs
                sejarahnya tetap ada: tanggal, judul, narasi, gambar, dan tautan
                bukti.
              </span>
            </li>
            <li>
              <span className="record-title">Keyboard</span>
              <span className="prose">
                Tautan lompat ke konten adalah kontrol pertama. Tidak ada
                pembajakan tombol panah, dan fokus selalu terlihat.
              </span>
            </li>
            <li>
              <span className="record-title">
                Warna bukan satu-satunya makna
              </span>
              <span className="prose">
                Kelas bukti selalu membawa label tertulis dan bentuk, bukan
                hanya warna.
              </span>
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
