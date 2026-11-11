import type { ReactElement } from "react";

import { SiteFooter } from "../../../components/site-footer";
import { SiteNav } from "../../../components/site-nav";

export const metadata = {
  title: "Metodologi",
  description:
    "Bagaimana klaim sejarah di situs ini dinilai, diklasifikasikan, ditinjau, dan diterbitkan.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage(): ReactElement {
  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content" className="section-stack">
        <header className="archive-header">
          <p className="eyebrow">Metodologi</p>
          <h1 className="title-page">Bagaimana kami memutuskan</h1>
          <p className="lead measure">
            Penonton tidak seharusnya memilih antara kekaguman dan kebenaran.
            Situs ini memberi keduanya, tanpa pernah menukarnya.
          </p>
        </header>

        <section className="measure" aria-labelledby="classes">
          <h2 id="classes" className="title-scene">
            Enam kelas bukti
          </h2>
          <dl className="metadata">
            <div>
              <dt>Catatan primer</dt>
              <dd>
                Berdasar langsung pada prasasti, dokumen sezaman, undang-undang,
                sumber arsip, atau objek.
              </dd>
            </div>
            <div>
              <dt>Fakta historis</dt>
              <dd>
                Ditopang bukti kuat dan kesarjanaan arus utama, meski tidak
                dapat direduksi menjadi satu objek yang bertahan.
              </dd>
            </div>
            <div>
              <dt>Interpretasi ilmiah</dt>
              <dd>
                Rekonstruksi atau tafsir yang diajukan sejarawan, arkeolog, atau
                filolog.
              </dd>
            </div>
            <div>
              <dt>Tradisi</dt>
              <dd>
                Narasi yang diwariskan lewat teks kemudian, ritual, ingatan
                lisan, atau praktik budaya.
              </dd>
            </div>
            <div>
              <dt>Folklor</dt>
              <dd>
                Cerita yang bermakna secara budaya, yang isi supranatural atau
                literalnya tidak ditetapkan sebagai fakta historis.
              </dd>
            </div>
            <div>
              <dt>Data modern terverifikasi</dt>
              <dd>
                Statistik dan catatan resmi, dengan sumber, tahun, satuan, dan
                definisinya terbuka.
              </dd>
            </div>
          </dl>
        </section>

        <section className="measure" aria-labelledby="rules">
          <h2 id="rules" className="title-scene">
            Aturan yang tidak dapat ditawar
          </h2>
          <p className="prose">
            Kelas bukti dan tingkat keyakinan adalah dua hal berbeda. Sebuah
            tradisi dapat terdokumentasi dengan sangat kuat sebagai tradisi,
            tanpa satu pun isi supranaturalnya menjadi fakta.
          </p>
          <p className="prose">
            Ketika sumber-sumber tidak sepakat, ketidaksepakatan itu
            dipertahankan, bukan didamaikan diam-diam. Sebuah sumber yang
            membantah tetap dicatat sebagai bukti.
          </p>
          <p className="prose">
            Koreksi tidak menimpa. Klaim yang digantikan menunjuk ke
            penggantinya, sehingga jejak audit sejarah tetap utuh.
          </p>
          <p className="prose">
            Materi riset yang belum ditinjau tidak pernah terbit otomatis. Ia
            masuk sebagai draf, dipecah menjadi klaim atomik, ditautkan ke
            sumbernya, lalu menunggu tinjauan historis.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
