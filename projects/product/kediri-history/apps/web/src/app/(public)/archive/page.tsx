import Link from "next/link";
import type { ReactElement } from "react";

import { SiteFooter } from "../../../components/site-footer";
import { SiteNav } from "../../../components/site-nav";
import { searchArchive } from "../../../content/queries";

/**
 * Arsip adalah katalog sejarah terkurasi, bukan grid basis data mentah
 * (UX Bible bagian 14).
 *
 * Pencariannya adalah formulir HTML biasa yang mengirim GET. Tanpa JavaScript
 * pun ia bekerja — dan itu bukan kompromi, itu memang yang dibutuhkan seorang
 * pelajar di jaringan yang buruk.
 */
export const metadata = {
  title: "Arsip",
  description:
    "Peristiwa, orang, tempat, objek, dan sumber sejarah Kediri, lengkap dengan bukti dan batas setiap bukti.",
  alternates: { canonical: "/archive" },
};

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<ReactElement> {
  const { q } = await searchParams;
  const term = q?.trim() ?? "";
  const hits = term.length >= 2 ? await searchArchive(term) : [];

  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content">
        <header className="archive-header">
          <p className="eyebrow">Arsip</p>
          <h1 className="title-page">Bagaimana kami tahu</h1>
          <p className="lead measure">
            Setiap catatan menyebut apa yang ditopang buktinya dan apa yang
            tidak. Mengajarkan batas sebuah sumber adalah bagian dari
            mengajarkan sejarah.
          </p>

          <search>
            <form className="search-form" action="/archive" method="get">
              <label htmlFor="q" className="visually-hidden">
                Cari arsip
              </label>
              <input
                type="search"
                id="q"
                name="q"
                defaultValue={term}
                placeholder="Jayabaya, Kadhiri, Panjalu, Jembatan Lama"
              />
              <button type="submit">Cari</button>
            </form>
          </search>
          <p className="archive-label">
            Ejaan historis dan alias ikut dicari: Jayabaya menemukan Jayabhaya,
            Kadhiri menemukan Kediri.
          </p>
        </header>

        {term.length >= 2 ? (
          <section aria-labelledby="results">
            <h2 id="results" className="title-scene">
              {hits.length} hasil untuk “{term}”
            </h2>
            {hits.length === 0 ? (
              <p className="prose measure">
                Tidak ada yang cocok. Coba ejaan lain, atau telusuri{" "}
                <Link href="/explore/timeline">kronologi</Link>. Kami tidak
                mengarang hasil yang tidak ada.
              </p>
            ) : (
              <ul className="record-list">
                {hits.map((hit) => (
                  <li key={`${hit.kind}-${hit.slug}`}>
                    <Link href={hit.href}>
                      <span className="record-title">{hit.title}</span>
                      <span className="record-meta">
                        {[hit.kind, hit.context].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section aria-labelledby="categories">
            <h2 id="categories" className="title-scene">
              Telusuri per kategori
            </h2>
            <div className="card-grid">
              <article>
                <h3 className="record-title">Kronologi</h3>
                <p>Setiap peristiwa yang sudah terverifikasi, berurut waktu.</p>
                <Link href="/explore/timeline">Buka kronologi</Link>
              </article>
              <article>
                <h3 className="record-title">Tempat</h3>
                <p>Di mana sejarah masih berdiri hari ini.</p>
                <Link href="/explore/places">Buka tempat</Link>
              </article>
              <article>
                <h3 className="record-title">Sumber</h3>
                <p>Prasasti, arsip, catatan resmi, dan penelitian akademik.</p>
                <Link href="/sources">Buka sumber</Link>
              </article>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
