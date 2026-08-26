import Link from "next/link";
import type { ReactElement } from "react";
import type { TimelineEntry } from "../../../components/journey/journey-timeline";
import { JourneyTimeline } from "../../../components/journey/journey-timeline";
import { SceneSection } from "../../../components/journey/scene-section";
import { SiteFooter } from "../../../components/site-footer";
import { getJourneyManifest } from "../../../content/queries";

/**
 * Journey adalah SATU rute dengan anchor yang stabil (UX Bible bagian 5).
 * Dua puluh enam scene bukan dua puluh enam rute — itulah yang menjaga
 * kesinambungan gulir sekaligus membuat setiap masa dapat ditautkan dan
 * dibagikan.
 *
 * Halaman ini Server Component. Seluruh sejarahnya ada di HTML sebelum satu
 * baris JavaScript berjalan; satu-satunya island klien adalah overlay Timeline,
 * dan bila ia gagal dimuat, /explore/timeline memuat kronologi yang sama.
 */
export const metadata = {
  title: "Journey",
  description:
    "Perjalanan sejarah Kediri dari 879 hingga 2026, satu halaman berkelanjutan dengan tautan dalam yang stabil untuk setiap masa.",
};

export default async function JourneyPage(): Promise<ReactElement> {
  const manifest = await getJourneyManifest();
  const orderedScenes = manifest.acts.flatMap((act) =>
    act.scenes.map((scene) => ({ scene, actTitle: act.title })),
  );

  const timelineEntries: TimelineEntry[] = orderedScenes.map(
    ({ scene, actTitle }) => ({
      slug: scene.slug,
      dateDisplay: scene.dateDisplay,
      title: scene.title,
      actTitle,
      isHero: scene.sceneType === "hero",
    }),
  );

  return (
    <div className="shell" data-journey="true">
      <nav className="site-nav" aria-label="Navigasi Journey">
        <Link href="/" className="wordmark">
          Kediri
        </Link>
        <ul>
          <li>
            <JourneyTimeline entries={timelineEntries} />
          </li>
          <li>
            <Link href="/explore/timeline">Explore</Link>
          </li>
          <li>
            <Link href="/sources">Sumber</Link>
          </li>
        </ul>
      </nav>

      <main id="historical-content">
        <header className="journey-intro">
          <p className="eyebrow">Kediri · 879 → 2026</p>
          <h1 className="title-page">Perjalanan</h1>
          <p className="lead measure">
            Sungai Brantas menyaksikan semuanya. Gulir untuk menyusurinya, atau
            buka Timeline untuk langsung menuju satu masa.
          </p>
          {manifest.sceneCount === 0 ? (
            <p className="measure prose">
              Belum ada scene yang diterbitkan. Kronologi lengkap yang sudah
              tersedia dapat dibaca di{" "}
              <Link href="/explore/timeline">Explore</Link>, dan seluruh catatan
              beserta buktinya ada di <Link href="/archive">Arsip</Link>.
            </p>
          ) : null}
        </header>

        {manifest.acts.map((act) => (
          <section
            key={act.id}
            className="journey-act"
            data-era={act.visualEraKey}
            aria-labelledby={`act-${act.slug}`}
          >
            <header>
              <p className="archive-label">{act.dateRangeDisplay}</p>
              <h2 id={`act-${act.slug}`} className="title-scene">
                {act.title}
              </h2>
              {act.introCopy ? (
                <p className="lead measure">{act.introCopy}</p>
              ) : null}
            </header>

            {act.scenes.map((scene, index) => (
              <SceneSection
                key={scene.id}
                scene={scene}
                nextSceneSlug={act.scenes[index + 1]?.slug}
              />
            ))}
          </section>
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}
