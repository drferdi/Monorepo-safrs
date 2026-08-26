import type { ReactElement } from "react";

import { SiteFooter } from "../../../components/site-footer";
import { SiteNav } from "../../../components/site-nav";

export const metadata = {
  title: "Hak dan kredit",
  description:
    "Bagaimana citra sejarah diperoleh, diklasifikasikan, dan dikreditkan.",
};

export default function RightsPage(): ReactElement {
  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content" className="section-stack">
        <header className="archive-header">
          <p className="eyebrow">Hak dan kredit</p>
          <h1 className="title-page">
            Sinemanya boleh baru. Buktinya harus nyata.
          </h1>
          <p className="lead measure">
            Autentisitas dan izin adalah dua pertanyaan berbeda. Sebuah citra
            dapat sepenuhnya asli dan tetap tidak boleh kami tampilkan.
          </p>
        </header>

        <section className="measure">
          <h2 className="title-scene">Yang tidak akan Anda temukan di sini</h2>
          <ul className="record-list">
            <li>
              <span className="prose">
                Potret raja hasil kecerdasan buatan yang disajikan sebagai rupa
                autentik.
              </span>
            </li>
            <li>
              <span className="prose">
                Prasasti, manuskrip, peta historis, atau foto dokumenter yang
                dibangkitkan mesin.
              </span>
            </li>
            <li>
              <span className="prose">
                Rekonstruksi spekulatif yang disajikan sebagai kepastian
                arkeologis.
              </span>
            </li>
            <li>
              <span className="prose">
                Citra kolonial atau masa perang generik yang diam-diam dilabeli
                sebagai Kediri.
              </span>
            </li>
          </ul>
          <p className="prose">
            Bila arsip tidak menyediakan sebuah gambar, ketiadaan yang jujur
            dapat diterima. Setiap aset publik membawa kelas buktinya, kelas
            haknya, kreditnya, dan catatan tentang apa yang tidak ditetapkannya.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
