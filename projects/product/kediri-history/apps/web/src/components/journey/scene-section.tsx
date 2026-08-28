import Link from "next/link";
import type { ReactElement } from "react";

import type { MediaDto, SceneDto } from "../../content/dto";
import { ClaimRecord } from "../evidence/claim-record";
import {
  dominantEvidenceClass,
  EvidenceClassBadge,
} from "../evidence/evidence-badge";
import { SceneCanvas } from "./scene-canvas";
import { SceneHandoff, type SceneHandoffKind } from "./scene-handoff";
import { SceneMedia, sceneMediaLabel } from "./scene-media";
import { SceneMotion } from "./scene-motion";
import { SceneNomenclature } from "./scene-nomenclature";

/** Motif yang masuk ke masing-masing dunia awal. */
const HANDOFF_BEFORE_SCENE: Readonly<
  Partial<Record<string, SceneHandoffKind>>
> = {
  "879-first-mark": "water-copper",
  "921-kadhiri": "inscription-mark",
  "1015-name-endures": "name-world",
  "1042-river-divides-kingdom": "record-territory",
};

/** Motif yang keluar menuju dunia berikutnya; 1042 hanya menyiapkan pusat. */
const HANDOFF_AFTER_SCENE: Readonly<Partial<Record<string, SceneHandoffKind>>> =
  {
    "879-first-mark": "inscription-mark",
    "921-kadhiri": "name-world",
    "1015-name-endures": "record-territory",
    "1042-river-divides-kingdom": "territory-centre",
  };

/**
 * Satu scene Journey: sebuah BIDIKAN, lalu dokumennya.
 *
 * Perbedaan itu yang sebelumnya hilang dan membuat Journey terbaca sebagai
 * situs biasa. Sebuah scene bukan paragraf yang dihiasi animasi. Ia punya dua
 * bagian yang berbeda sifatnya:
 *
 *   1. PANGGUNG (`.scene-stage`) — bingkai penuh layar yang dikomposisikan.
 *      Gulir adalah kameranya. Satu gagasan per layar, hadir bertahap: void,
 *      lalu permukaan yang disingkap cahaya menyudut, lalu tarikh, lalu judul,
 *      lalu kalimat yang memikulnya. Sebagian besar bingkai kosong sebagian
 *      besar waktu.
 *   2. BACAAN (`.scene-readout`) — dokumen sejarahnya, dalam alur normal
 *      setelah bidikan selesai. Di sinilah narasi, bukti, dan navigasi hidup
 *      (UX Bible bagian 7: kedalaman dikendalikan pengunjung).
 *
 * Ini tetap Server Component. Seluruh sejarahnya ada di HTML sebelum satu baris
 * JavaScript berjalan; tanpa JavaScript, panggung hanyalah komposisi statis
 * yang sudah utuh dan bacaannya ada persis di bawahnya.
 *
 * Atribut data-motion adalah kontrak antara markup dan koreografi. Yang
 * digerakkan koreografi adalah CAHAYA dan penyingkapan, bukan wadah teks.
 */
export function SceneSection({
  scene,
  nextSceneSlug,
  editorialPreview = false,
}: {
  readonly scene: SceneDto;
  readonly nextSceneSlug?: string;
  readonly editorialPreview?: boolean;
}): ReactElement {
  const badgeClass =
    scene.evidenceBadgeMode === "hidden"
      ? undefined
      : dominantEvidenceClass(scene.featuredClaims);
  const event = scene.primaryEvent;
  const featuredArtifact = event?.artifacts[0];
  const dateParts = stagedDate(scene);
  const narratives =
    scene.narrativeParagraphs ??
    (scene.narrativeShort ? [scene.narrativeShort] : []);
  // Beat editorial bila ada; tanpa itu tiap paragraf menjadi satu beat.
  const beats: readonly (readonly string[])[] =
    scene.narrativeBeats ?? narratives.map((paragraph) => [paragraph]);
  const mediaLabel = sceneMediaLabel(scene, editorialPreview);
  const incomingHandoff = HANDOFF_BEFORE_SCENE[scene.slug];
  const outgoingHandoff = HANDOFF_AFTER_SCENE[scene.slug];
  // Direktif runtime 2026-08-28: Scene 01-04 membuang chrome
  // "SCENE n · judul · label review" dari PANGGUNG — bukan dari dokumen.
  // Eyebrow dan judul tetap ada untuk pembaca layar (aria-labelledby, urutan
  // DOM); yang berhenti adalah kotak visualnya. Kalimat pemikul (masterLine)
  // membawa makna itu secara sinematik. Status pengetahuan tetap tampil utuh
  // di strip bacaan (.scene-readout) di bawah panggung.
  const stageChromeVisible = !(
    typeof scene.order === "number" && scene.order <= 4
  );

  const body = (
    <section
      className="scene"
      id={scene.slug}
      data-scene-type={scene.sceneType}
      data-visual={scene.visualVariant}
      data-choreography={scene.choreographyKey}
      data-media-slot={scene.mediaSlot?.key}
      aria-labelledby={`${scene.slug}-title`}
    >
      <div className="scene-shot">
        <div className="scene-stage" data-motion="stage">
          {incomingHandoff ? (
            <SceneHandoff kind={incomingHandoff} phase="incoming" />
          ) : null}

          {/*
           * Kehampaan nyaris hitam. Ia bukan latar belakang kosong — ia keadaan
           * awal bidikan, dan yang membuat cahaya berikutnya berarti.
           */}
          <div className="stage-void" aria-hidden="true" />

          {/*
           * Permukaan material. Tidak terlihat sampai cahaya menyapunya:
           * penyingkapannya dikerjakan mask yang dijalankan timeline, karena
           * yang bergerak memang cahayanya, bukan materialnya.
           */}
          <div className="stage-surface" data-motion="surface">
            <SceneMedia scene={scene} editorialPreview={editorialPreview} />
            <SceneCanvas
              variant={scene.visualVariant}
              choreographyKey={scene.choreographyKey}
            />
          </div>

          {/* Cahaya menyudut itu sendiri: pita yang melintasi bingkai. */}
          <div className="stage-light" data-motion="light" aria-hidden="true" />

          {/*
           * Nama tempat dan wilayah sebagai teks sungguhan di atas citra.
           * Aset produksi 921 dan 1042 dahulu memikul namanya sendiri di dalam
           * raster; jendela bingkai mengeluarkannya, dan lapisan inilah yang
           * mengembalikan maknanya — kini dapat dibaca pembaca layar,
           * diterjemahkan, dan dikoreksi (Authority Rule 1).
           */}
          <SceneNomenclature slug={scene.slug} />

          {mediaLabel ? (
            <p className="stage-visual-label">{mediaLabel}</p>
          ) : null}

          <div className="stage-plate">
            <time
              className="stage-date"
              dateTime={event ? String(event.chronology.startYear) : undefined}
            >
              {dateParts.map((part, index) => (
                <span className="date-unit" key={part}>
                  {index > 0 ? (
                    <span className="date-sep" aria-hidden="true">
                      ·
                    </span>
                  ) : null}
                  <span data-motion="date-part">{part}</span>
                </span>
              ))}
            </time>

            <div className="stage-context" data-motion="context">
              <p
                className={
                  stageChromeVisible ? "stage-sequence" : "visually-hidden"
                }
              >
                Scene {String(scene.order).padStart(2, "0")}
              </p>
              <h2
                className={
                  stageChromeVisible ? "title-scene" : "visually-hidden"
                }
                id={`${scene.slug}-title`}
                data-motion="title"
              >
                {scene.title}
              </h2>
              {featuredArtifact && stageChromeVisible ? (
                <p className="stage-object">
                  <span>Objek</span>
                  {featuredArtifact.name}
                  {featuredArtifact.inventoryNumber
                    ? ` · ${featuredArtifact.inventoryNumber}`
                    : ""}
                </p>
              ) : null}
              {badgeClass && stageChromeVisible ? (
                <EvidenceClassBadge evidenceClass={badgeClass} />
              ) : null}
              {scene.epistemicStatus && stageChromeVisible ? (
                <p className="scene-status">{scene.epistemicStatus}</p>
              ) : null}
            </div>

            {/*
             * Kalimat yang memikul scene. Ia hidup di keadaan istirahat, bukan
             * pada satu instan progres gulir yang mudah terlewat (UX Bible 39).
             */}
            {scene.masterLine ? (
              <p
                className="master-line scene-lead-line"
                data-motion="master"
                data-editorial-role="lead-line"
              >
                {scene.masterLine}
              </p>
            ) : null}

            {/*
             * NASKAH HIDUP DI ATAS CITRA sebagai BEAT editorial. Selama
             * dataran baca, tiap beat (satu-dua kalimat kanon) hadir
             * bergiliran dengan jeda hening di antaranya — citra tidak
             * pernah tayang dua kali, dan tidak ada "halaman teks" setelah
             * shot. Tanpa JavaScript (atau pada varian mobile/reduced)
             * seluruh beat tampil menumpuk statis: dokumennya selalu utuh.
             */}
            {beats.length > 0 ? (
              <div className="stage-passages">
                {beats.map((beat, index) => (
                  <div
                    className="stage-beat"
                    data-motion="passage"
                    data-beat-index={index}
                    key={beat.join("|")}
                  >
                    {beat.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/*
           * Sejajar dengan `.stage-plate`, BUKAN anaknya. GSAP memasang
           * `transform` pada plate sepanjang timeline (termasuk transisi
           * keluar `addLosingScaleExit`), dan elemen mana pun yang memiliki
           * transform menjadi containing block bagi anak `position:absolute`
           * — motif ini lalu terhitung relatif terhadap kotak plate yang
           * sempit, bukan seluruh panggung, dan bisa menabrak naskah yang
           * sedang tampil (terbukti pada tinjauan visual 2026-08-28 ronde
           * ketiga, scene 921). Menjadi saudara `.scene-stage > *` (seperti
           * handoff masuk) mengembalikannya ke posisi yang benar-benar
           * relatif terhadap panggung.
           */}
          {outgoingHandoff ? (
            <SceneHandoff kind={outgoingHandoff} phase="outgoing" />
          ) : null}
        </div>

        {scene.choreographyKey ? (
          <div className="scene-pin-space" aria-hidden="true" />
        ) : null}
      </div>

      {/*
       * Setelah shot selesai, yang tersisa hanyalah strip arsip: bukti,
       * status pengetahuan, dan navigasi. Naskah naratifnya sudah selesai
       * dibaca DI DALAM shot — tidak ada halaman teks kedua.
       */}
      <div className="scene-readout" data-motion="readout">
        {scene.epistemicStatus ? (
          <p className="epistemic-note">
            <span>Status pengetahuan</span>
            {scene.epistemicStatus}
          </p>
        ) : null}

        {/*
         * Scene 01-04: objek dan kelas bukti pindah ke sini dari panggung —
         * metadata tidak boleh memimpin sebuah shot sinematik (direktif
         * runtime 2026-08-28). Scene 05+ tetap menampilkannya di panggung
         * seperti semula.
         */}
        {!stageChromeVisible && (featuredArtifact || badgeClass) ? (
          <p className="readout-provenance">
            {badgeClass ? (
              <EvidenceClassBadge evidenceClass={badgeClass} />
            ) : null}
            {featuredArtifact ? (
              <span className="stage-object">
                <span>Objek</span>
                {featuredArtifact.name}
                {featuredArtifact.inventoryNumber
                  ? ` · ${featuredArtifact.inventoryNumber}`
                  : ""}
              </span>
            ) : null}
          </p>
        ) : null}

        <SceneMediaRecord media={scene.heroMedia} />

        {scene.featuredClaims.length > 0 ? (
          <details className="evidence-disclosure">
            <summary>Lihat bukti</summary>
            <div>
              {scene.featuredClaims.map((claim) => (
                <ClaimRecord key={claim.id} claim={claim} />
              ))}
            </div>
          </details>
        ) : null}

        <nav className="scene-actions" aria-label={`Aksi untuk ${scene.title}`}>
          {event ? (
            <Link href={`/archive/events/${event.slug}`}>
              Catatan arsip lengkap
            </Link>
          ) : null}
          {/*
           * UX Bible bagian 10: tidak ada pengunjung yang terjebak di dalam
           * rangkaian yang di-pin. Tautan ini jalan keluarnya, dan ia bekerja
           * tanpa JavaScript.
           */}
          {nextSceneSlug ? (
            <a href={`#${nextSceneSlug}`}>Lewati ke bab berikutnya</a>
          ) : null}
        </nav>
      </div>
    </section>
  );

  // Tanpa choreographyKey, tidak ada island klien sama sekali. Scene yang
  // belum punya koreografi tetap merupakan dokumen sejarah yang lengkap.
  if (!scene.choreographyKey) return body;

  return (
    <SceneMotion choreographyKey={scene.choreographyKey}>{body}</SceneMotion>
  );
}

/**
 * Catatan provenance tetap hadir di strip arsip, tetapi gambarnya tidak
 * diulang. Citra hero sudah menjadi permukaan tunggal di dalam stage; yang
 * tersisa di sini hanyalah caption, kredit, kelas hak, dan caveat media dari
 * DTO publik yang sama.
 */
function SceneMediaRecord({
  media,
}: {
  readonly media: MediaDto | undefined;
}): ReactElement | null {
  if (!media) return null;

  const provenance = [
    media.institution,
    media.creditLine,
    media.visualEvidenceClass,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="media-record" data-media-role="metadata">
      {media.caption ? <span className="prose">{media.caption}</span> : null}
      {provenance ? <span className="record-meta">{provenance}</span> : null}
      {media.rightsClass ? (
        <span className="record-meta">Hak media: {media.rightsClass}</span>
      ) : null}
      {media.uncertaintyNote ? (
        <span className="record-meta">
          Tidak menetapkan: {media.uncertaintyNote}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Tarikh yang dipecah menjadi ketukan.
 *
 * Bible 02 Scene 01 menuntut tarikh hadir BERTAHAP — `27 · JULI · 879` —
 * karena pengetahuan tentang tarikh itu pun sampai kepada kita bertahap.
 * Sumbernya tetap naskah CMS: subtitle bila ada (tarikh presisi), selain itu
 * dateDisplay. Kode hanya memutuskan tipografi dan ketukannya, tidak pernah
 * isinya. Scene tanpa tarikh presisi menerima satu ketukan, dan itu benar.
 */
function stagedDate(scene: SceneDto): readonly string[] {
  const source = (scene.subtitle ?? scene.dateDisplay).trim();
  const parts = source.split(/\s+/u).filter((part) => part.length > 0);
  return parts.length > 0 ? parts : [scene.dateDisplay];
}
