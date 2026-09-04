import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { SiteFooter } from "../../../../../components/site-footer";
import { SiteNav } from "../../../../../components/site-nav";
import { getPersonBySlug } from "../../../../../content/queries";

/**
 * Catatan orang.
 *
 * Kebijakan representasi ditampilkan terbuka. Ketika seorang tokoh tidak
 * memiliki rupa yang terdokumentasi, halaman ini mengatakannya — jauh lebih
 * jujur daripada memasang potret yang meyakinkan namun dikarang.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = await getPersonBySlug(slug);
  if (!person) return { title: "Catatan tidak ditemukan" };
  return {
    title: person.name,
    description: person.summary,
    alternates: { canonical: `/archive/people/${person.slug}` },
  };
}

const POLICY_COPY: Record<string, string> = {
  no_known_likeness:
    "Tidak ada rupa yang terdokumentasi. Situs ini tidak menampilkan wajah untuk tokoh ini.",
  symbolic_only:
    "Hanya representasi simbolik. Tidak ada citra yang mengaku sebagai rupa sebenarnya.",
  period_portrait: "Potret sezaman, dengan keterbatasan interpretatifnya.",
  historical_photograph: "Fotografi historis.",
  authenticated_likeness: "Rupa terautentikasi.",
};

export default async function PersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<ReactElement> {
  const { slug } = await params;
  const person = await getPersonBySlug(slug);
  if (!person) notFound();

  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content" className="section-stack">
        <header className="archive-header">
          <p className="eyebrow">Orang</p>
          <h1 className="title-page">{person.name}</h1>
          {person.aliases.length > 0 ? (
            <p className="archive-label">
              Juga dikenal: {person.aliases.join(" · ")}
            </p>
          ) : null}
          {person.summary ? (
            <p className="lead measure">{person.summary}</p>
          ) : null}
        </header>

        <section aria-labelledby="representation">
          <h2 id="representation" className="archive-label">
            Kebijakan representasi
          </h2>
          <p className="prose measure">
            {POLICY_COPY[person.representationPolicy] ??
              person.representationPolicy}
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
