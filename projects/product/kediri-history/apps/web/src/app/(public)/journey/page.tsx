import Link from "next/link";
import type { ReactElement } from "react";
import { ActHeaderReveal } from "../../../components/journey/act-header-reveal";
import { ActMilestoneTicker } from "../../../components/journey/act-milestone-ticker";
import { BrantasVisualThread } from "../../../components/journey/brantas-visual-thread";
import { DeepLinkLanding } from "../../../components/journey/deep-link-landing";
import {
  JourneyTimeline,
  type TimelineEntry,
} from "../../../components/journey/journey-timeline";
import { MotionRefreshGate } from "../../../components/journey/motion-refresh-gate";
import { PrologueInscriptionInterlude } from "../../../components/journey/prologue-inscription-interlude";
import {
  FramingStage,
  PrologueScene,
} from "../../../components/journey/prologue-scene";
import { SceneOpeningAddress } from "../../../components/journey/scene-opening-address";
import { SceneSection } from "../../../components/journey/scene-section";
import { SiteFooter } from "../../../components/site-footer";
import { JOURNEY_MILESTONES } from "../../../content/journey-milestones";
import {
  composeProductionJourney,
  PRODUCTION_FINALE,
  PRODUCTION_PROLOGUE,
} from "../../../content/production-narrative";
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
/**
 * Latar kartu judul act, mode pratinjau editorial saja (direktif Chief
 * 2026-08-28): "Panjalu Rises" memakai citra yang semula milik scene Daha —
 * scene Daha sendiri kini bergerak sebagai video dahanasada. "1,100+ Years
 * of Kediri" (revisi Chief 2026-08-30) memakai video Jayabaya dari
 * `project-video/Jayabaya.mp4`, disalin ke `public/journey-approved/` —
 * pola yang sama dengan video prolog (statis, tanpa gerbang route pratinjau).
 */
const ACT_HEADER_MEDIA: Readonly<Record<string, string>> = {
  "the-land-remembers": "/journey-approved/jayabaya.mp4",
  "panjalu-rises": "/api/editorial-preview/05-daha-centre-of-power.webp",
};

export const metadata = {
  title: "Journey",
  description:
    "Perjalanan sejarah Kediri dari 879 hingga 2026, satu halaman berkelanjutan dengan tautan dalam yang stabil untuk setiap masa.",
};

export default async function JourneyPage(): Promise<ReactElement> {
  const publishedManifest = await getJourneyManifest();
  // Naskah penuh adalah ruang kerja desain lokal, bukan shortcut publikasi.
  // Build produksi hanya merender scene yang sudah lolos CMS beserta rantai
  // bukti dan tata kelola medianya — kecuali `SHOW_EDITORIAL_PREVIEW=true`
  // diset eksplisit, saklar yang hanya menyala atas otorisasi Chief
  // in-session (lihat DECISIONS.md dan route editorial-preview).
  const editorialPreview =
    process.env.NODE_ENV !== "production" ||
    process.env.SHOW_EDITORIAL_PREVIEW === "true";
  const manifest = editorialPreview
    ? composeProductionJourney(publishedManifest)
    : publishedManifest;
  const orderedScenes = manifest.acts.flatMap((act) =>
    act.scenes.map((scene) => ({ scene, actTitle: act.title })),
  );
  const nextSceneBySlug = new Map(
    orderedScenes.map(({ scene }, index) => [
      scene.slug,
      orderedScenes[index + 1]?.scene.slug,
    ]),
  );
  const publishedRange =
    orderedScenes.length > 0
      ? `${orderedScenes[0]?.scene.dateDisplay} — ${orderedScenes.at(-1)?.scene.dateDisplay}`
      : "Arsip terbit";

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
      <DeepLinkLanding />
      {/*
       * Satu pemilik refresh ScrollTrigger (font + media kritis) dan pegangan
       * debug motion untuk seluruh halaman — bukan per island.
       */}
      <MotionRefreshGate />
      {/*
       * Nav journey adalah overlay `position: fixed` — ia dan panel Timeline
       * WAJIB hidup di luar #smooth-wrapper: elemen fixed di dalam konten
       * yang ditransformasikan ScrollSmoother menjadi relatif terhadap konten
       * dan ikut tergulir (aturan resmi ScrollSmoother; terbukti oleh e2e
       * "Timeline pushState lands on a readable early scene").
       */}
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
      {/*
       * Kerangka ScrollSmoother (100% GSAP, direktif Chief 2026-08-28).
       * Server hanya merender dua div ini; smoother-nya sendiri diciptakan
       * ber-refcount oleh island motion pertama pada varian desktop/tablet
       * (modules/motion/smooth.ts). Tanpa JavaScript atau pada mobile/reduced,
       * keduanya div biasa dan halaman menggulir native.
       */}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <BrantasVisualThread />
          <main id="historical-content">
            {editorialPreview ? (
              <>
                <PrologueScene narrative={PRODUCTION_PROLOGUE} />
                <PrologueInscriptionInterlude />
              </>
            ) : (
              <header className="journey-intro">
                <p className="eyebrow">Kediri · Kronologi terbit</p>
                <h1 className="title-page">Perjalanan</h1>
                <p className="journey-range">{publishedRange}</p>
                <p className="lead measure">
                  Setiap scene di halaman ini telah diterbitkan melalui arsip
                  dan rantai bukti Kediri.
                </p>
              </header>
            )}

            {manifest.acts.map((act) => (
              <section
                key={act.id}
                className="journey-act"
                data-era={act.visualEraKey}
                aria-labelledby={`act-${act.slug}`}
              >
                <header
                  data-header-media={
                    editorialPreview && ACT_HEADER_MEDIA[act.slug]
                      ? "true"
                      : undefined
                  }
                  data-opening-handoff-source={
                    editorialPreview && act.slug === "the-land-remembers"
                      ? "true"
                      : undefined
                  }
                >
                  <ActHeaderReveal
                    enabled={
                      editorialPreview && act.slug === "the-land-remembers"
                    }
                  >
                    {editorialPreview && ACT_HEADER_MEDIA[act.slug] ? (
                      <span className="act-header-media" aria-hidden="true">
                        {ACT_HEADER_MEDIA[act.slug]?.endsWith(".mp4") ? (
                          <video
                            src={ACT_HEADER_MEDIA[act.slug]}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          // biome-ignore lint/performance/noImgElement: aset pratinjau lokal disajikan route sendiri tanpa loader tambahan.
                          <img
                            src={ACT_HEADER_MEDIA[act.slug]}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </span>
                    ) : null}
                    <p className="archive-label">{act.dateRangeDisplay}</p>
                    <h2 id={`act-${act.slug}`} className="title-scene">
                      {act.title}
                    </h2>
                    {act.introCopy
                      ? (Array.isArray(act.introCopy)
                          ? act.introCopy
                          : [act.introCopy]
                        ).map((paragraph) => (
                          <p className="lead measure" key={paragraph}>
                            {paragraph}
                          </p>
                        ))
                      : null}
                    {editorialPreview && act.slug === "the-land-remembers" ? (
                      <ActMilestoneTicker milestones={JOURNEY_MILESTONES} />
                    ) : null}
                  </ActHeaderReveal>
                </header>

                {editorialPreview && act.slug === "the-land-remembers" ? (
                  <SceneOpeningAddress />
                ) : null}

                {act.scenes.map((scene) => (
                  <SceneSection
                    key={scene.id}
                    scene={scene}
                    nextSceneSlug={nextSceneBySlug.get(scene.slug)}
                    editorialPreview={editorialPreview}
                  />
                ))}
              </section>
            ))}

            {editorialPreview ? (
              <section
                className="journey-finale"
                aria-labelledby="journey-finale"
              >
                <div className="finale-frame">
                  {PRODUCTION_FINALE.media ? (
                    <FramingStage
                      media={PRODUCTION_FINALE.media}
                      framing="finale"
                    />
                  ) : null}
                  <p className="eyebrow">{PRODUCTION_FINALE.eyebrow}</p>
                  <h2 id="journey-finale" className="title-scene">
                    {PRODUCTION_FINALE.title}
                  </h2>
                  <p className="master-line">{PRODUCTION_FINALE.masterLine}</p>
                  <p className="journey-visual-label">Visualisasi artistik</p>
                </div>
                <div className="finale-readout">
                  <div className="narrative-stack">
                    {PRODUCTION_FINALE.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <div className="finale-coda">
                    <p>Bab berikutnya belum memiliki tanggal.</p>
                    <p>Kediri</p>
                    <p>Djojo ing Bojo</p>
                    <p>Kota ini terus berlanjut.</p>
                  </div>
                </div>
              </section>
            ) : null}
          </main>

          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
