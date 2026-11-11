import type { ReactElement } from "react";

import { SiteFooter } from "../../../components/site-footer";
import { SiteNav } from "../../../components/site-nav";
import { listSources } from "../../../content/queries";

/**
 * Halaman sumber. Scene sinematik memakai penanda bukti yang halus; kutipan
 * lengkapnya berjarak satu interaksi, dan di sinilah ia tinggal
 * (UX Bible bagian 23).
 */
export const metadata = {
  title: "Sumber",
  description:
    "Prasasti, manuskrip, arsip, catatan resmi, dan penelitian yang menopang sejarah Kediri.",
  alternates: { canonical: "/sources" },
};

export default async function SourcesPage(): Promise<ReactElement> {
  const sources = await listSources();

  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content">
        <header className="archive-header">
          <p className="eyebrow">Sumber</p>
          <h1 className="title-page">Dari mana sejarah ini berasal</h1>
          <p className="lead measure">
            Sebuah sumber bukan otomatis sebuah klaim. Hubungan antara keduanya
            dicatat terpisah, lengkap dengan peran dan kekuatannya — termasuk
            ketika sebuah sumber justru membantah.
          </p>
        </header>

        {sources.length === 0 ? (
          <p className="prose measure">Belum ada sumber yang diterbitkan.</p>
        ) : (
          <ul className="record-list">
            {sources.map((source) => (
              <li key={source.id} id={`source-${source.id}`}>
                <span className="record-title">{source.title}</span>
                <span className="record-meta">
                  {[
                    source.sourceType,
                    source.institution,
                    source.inventoryNumber,
                    source.publicationYear,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {source.citation ? (
                  <span className="prose">{source.citation}</span>
                ) : null}
                {source.url ? (
                  <a href={source.url} rel="noreferrer">
                    Katalog daring
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
