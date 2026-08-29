import { createReadingDirector } from "./director";
import { gsap, MOTION, ScrollTrigger } from "./gsap";
import type { ChoreographyKey, MotionVariant } from "./registry";
import { ensureSmoother, releaseSmoother } from "./smooth";

/**
 * Penyutradaraan shot.
 *
 * Unit di berkas ini adalah SHOT, bukan section. Sebuah shot punya bingkai,
 * kehendak kamera, perilaku cahaya, ketukan waktu, argumen historis, objek
 * utama, teks yang muncul sebagai akibat, dan transisi keluar. Breakdown-nya
 * ditulis lebih dulu di `docs/shots/` — kalau breakdown-nya tidak sinematik,
 * kodenya hampir pasti juga tidak.
 *
 * HUKUM MOTION GLOBAL: setiap gerakan harus menjawab satu pertanyaan — gagasan
 * historis apa yang disampaikannya? Bila tidak ada jawabannya, gerakan itu
 * dihapus (Cinematic Bible bagian 3).
 *
 * Aturan yang mengikat setiap shot di berkas ini:
 *   - satu shot memiliki SATU timeline utama, dinormalkan ke durasi 1 sehingga
 *     posisi ketukan terbaca langsung sebagai progres;
 *   - timeline dibangun lebih dulu, ScrollTrigger dipasang belakangan;
 *   - hanya transform, opacity, dan custom property yang dianimasikan;
 *   - gerak yang di-scrub memakai easing linear;
 *   - TEKS TIDAK PERNAH memakai autoAlpha. autoAlpha menyetel
 *     `visibility: hidden`, yang mengeluarkan naskah sejarah dari pohon
 *     aksesibilitas sampai pengunjung menggulir ke sana;
 *   - varian reduced bukan versi rusak: ia langsung menampilkan keadaan baca;
 *   - tidak ada teks yang dibuat atau diubah maknanya di sini. Seluruh sejarah
 *     sudah ada di HTML sebelum berkas ini berjalan.
 */

export interface SceneMotionContext {
  readonly root: HTMLElement;
  readonly variant: MotionVariant;
}

export type SceneTimelineFactory = (
  context: SceneMotionContext,
) => gsap.core.Timeline | undefined;

/** Elemen ditemukan lewat data-attribute, bukan lewat kelas presentasi. */
const q = (root: HTMLElement, name: string) =>
  Array.from(root.querySelectorAll<HTMLElement>(`[data-motion="${name}"]`));

const one = (root: HTMLElement, selector: string) =>
  root.querySelector<HTMLElement>(selector);

function travelFor(variant: MotionVariant): number {
  if (variant === "mobile") return MOTION.travel.mobile;
  if (variant === "tablet") return MOTION.travel.tablet;
  return MOTION.travel.desktop;
}

/**
 * Ketukan shot, dalam progres 0..1.
 *
 * Dua tahanan bukan kemewahan. Yang pertama memberi objek waktu berbicara
 * sebelum teks masuk; yang kedua keadaan baca yang stabil, dan itulah keadaan
 * yang dituju tautan dalam. Tanpa tahanan kedua, naskah penting hanya utuh
 * pada satu instan progres gulir (UX Bible bagian 39).
 */
const REST_LEAVE = 0.84;

/**
 * Prolog 2026 — kota yang masih hidup berubah menjadi permukaan air.
 *
 * Prolog memakai citra yang sama dari awal sampai handoff. Timeline hanya
 * mengubah jarak pandang, pantulan, dan urutan editorial; ia tidak menciptakan
 * fakta baru di luar naskah yang sudah dirender server.
 */
const prologueReveal: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".prologue-surface");
  const waterLine = one(root, '[data-motion="water-line"]');
  const metadata = q(root, "metadata");
  const plate = one(root, ".prologue-plate");
  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    /*
     * KEMUNCULAN permukaan (gelap 2 detik → video mulai → cahaya membuka)
     * bukan milik jam kamera ini — ia intro berbasis WAKTU milik director
     * (direktif Chief 2026-08-28). Scrub menjaga dolly tetap 1 sampai
     * transisi keluar, supaya dua jam tidak berebut opacity maupun skala.
     */
    timeline.set(surface, { "--dolly": 1 }, 0);
  }
  if (waterLine) {
    timeline.fromTo(
      waterLine,
      { opacity: 0, scaleX: 0.24, xPercent: -10 },
      {
        opacity: 0.78,
        scaleX: 1,
        xPercent: 0,
        ease: MOTION.scrubEase,
        duration: 0.28,
      },
      0.16,
    );
  }
  // Naskah (konteks, kalimat pemikul, beat) milik Jam 2 — director.ts.
  if (variant === "desktop" || variant === "tablet") {
    timeline.fromTo(
      metadata,
      { opacity: 0 },
      { opacity: 1, ease: MOTION.scrubEase, duration: 0.06 },
      REST_LEAVE + 0.01,
    );
  }
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/**
 * SHOT 879 — Tanda Pertama.
 *
 * Breakdown: `docs/shots/879-first-mark.md`.
 *
 * Argumen historisnya: catatan mendahului kerajaan, dan KETERBACAAN ADALAH
 * PERISTIWA. Karena itu tidak ada satu pun elemen yang sekadar fade in.
 * Cahaya menyapu permukaan; apa yang dilewatinya menjadi terbaca dan tetap
 * terbaca; tarikh muncul sebagai akibat permukaan yang kini dapat dibaca; dan
 * kamera terus mendekat sepanjang shot — yang membesar permukaannya, bukan
 * halamannya.
 *
 * Yang TIDAK dilakukan: menganimasikan aksara seolah urutan goresannya
 * diketahui. Di kanvas ini memang tidak ada satu glyph pun.
 */
const inscriptionReveal: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const light = one(root, ".stage-light");
  const plate = one(root, ".stage-plate");
  if (!surface) return undefined;

  const timeline = gsap.timeline({ paused: true });

  // Ketukan 1 — kehampaan melepaskan tekstur samar; kamera mulai bergerak.
  timeline.fromTo(
    surface,
    { opacity: 0 },
    { opacity: 0.3, ease: MOTION.scrubEase, duration: 0.12 },
    0,
  );
  // Kamera: satu dolly panjang yang tidak berhenti sampai shot selesai.
  timeline.fromTo(
    surface,
    { "--dolly": 1 },
    { "--dolly": 1.24, ease: MOTION.scrubEase, duration: REST_LEAVE },
    0,
  );

  // Ketukan 2 — pita cahaya menyapu; permukaan menjadi terbaca di belakangnya.
  timeline.fromTo(
    surface,
    { "--lit": 0 },
    { "--lit": 1, ease: MOTION.scrubEase, duration: 0.38 },
    0.08,
  );
  timeline.to(
    surface,
    { opacity: 1, ease: MOTION.scrubEase, duration: 0.3 },
    0.12,
  );
  if (light) {
    timeline.fromTo(
      light,
      { xPercent: -58, opacity: 0 },
      { opacity: 1, ease: MOTION.scrubEase, duration: 0.08 },
      0.08,
    );
    timeline.to(
      light,
      { xPercent: 58, ease: MOTION.scrubEase, duration: 0.38 },
      0.08,
    );
    timeline.to(
      light,
      { opacity: 0, ease: MOTION.scrubEase, duration: 0.08 },
      0.42,
    );
  }

  // Ketukan 3–5 — tarikh (tahun lebih dulu), konteks, dan kalimat pemikul
  // kini milik Jam 2: director.ts men-trigger-nya pada ambang progres, dengan
  // ease ekspresif — bukan menumpang jam kamera ini.

  // Ketukan 6 — tahanan baca. Komposisi diam; tautan dalam mendarat di sini.

  // Ketukan 7 — permukaan KEHILANGAN SKALA: material menjadi bentang.
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/**
 * SHOT Daha — pusat kekuasaan yang masih bernapas.
 *
 * Permukaannya video: kota yang hidup. Kamera hanya mendorong pelan dan
 * membiarkan footage bekerja — dolly halus, cahaya membuka, tidak ada gerak
 * dekoratif yang bersaing dengan gambar bergerak. Naskah (termasuk baris
 * Jawa "Kene tau ana sawijining nagara") milik Jam 2 dan tampil lembut di
 * dataran baca tanpa mengganggu visual.
 */
const dahaLiving: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  if (!surface) return undefined;

  const timeline = gsap.timeline({ paused: true });
  timeline.fromTo(
    surface,
    { opacity: 0, "--dolly": 1.1, "--lit": 0 },
    {
      opacity: 1,
      "--dolly": 1.02,
      "--lit": 1,
      ease: MOTION.scrubEase,
      duration: 0.46,
    },
    0,
  );
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/**
 * SHOT 1135 — otoritas yang tercerai-berai menyatu.
 *
 * Argumen historisnya: kerajaan yang pernah dibelah menemukan satu suara.
 * Potongan tarikh datang dari kedalaman yang berbeda lalu menyatu menjadi satu
 * baris. Konsolidasinya adalah argumennya.
 *
 * Yang TIDAK dilakukan: pertempuran istana rekaan.
 */
const royalConsolidation: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  if (!surface) return undefined;

  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    timeline.fromTo(
      surface,
      { opacity: 0, "--lit": 0, "--dolly": 1.14 },
      {
        opacity: 1,
        "--lit": 1,
        "--dolly": 1,
        ease: MOTION.scrubEase,
        duration: 0.46,
      },
      0,
    );
  }
  // Konsolidasi tarikh dari dua sisi kini Jam 2 (director.ts,
  // gaya khusus royalConsolidation) — di-trigger, bukan di-scrub.
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/**
 * SHOT 1869 — struktur terakit dari logika rekayasa.
 *
 * Argumen historisnya: sungai berhenti menjadi halangan dan menjadi soal
 * rekayasa. Geometri menggambar dirinya dari logika struktur — penopang lebih
 * dulu, lalu dek, lalu pilar — sehingga urutannya sendiri menjelaskan
 * bagaimana beban disalurkan.
 *
 * Catatan bukti: gerak ini menyampaikan konsep "terakit", bukan detail teknis
 * yang belum terverifikasi.
 */
const bridgeConstruction: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  const strokes = Array.from(
    root.querySelectorAll<SVGPathElement | SVGLineElement>(
      "[data-motion-draw]",
    ),
  );

  const timeline = gsap.timeline({ paused: true });
  if (surface) {
    timeline.fromTo(
      surface,
      { opacity: 0, "--lit": 0 },
      { opacity: 1, "--lit": 1, ease: MOTION.scrubEase, duration: 0.22 },
      0,
    );
  }

  let cursor = 0.1;
  for (const stroke of strokes) {
    const length = stroke.getTotalLength?.() ?? 0;
    if (length === 0) continue;
    gsap.set(stroke, { strokeDasharray: length, strokeDashoffset: length });
    timeline.to(
      stroke,
      { strokeDashoffset: 0, ease: MOTION.scrubEase, duration: 0.2 },
      cursor,
    );
    cursor += 0.05;
  }

  // Tarikh, judul, dan kalimat pemikul: Jam 2 (director.ts).
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/**
 * SHOT 921 — nama memperoleh bobot dan hadir dari kedalaman.
 *
 * Argumen historisnya: sebuah catatan menjadi sebuah nama. Karena itu KADHIRI
 * tidak boleh sudah ada di bingkai sejak awal. Ia harus TIBA — terurai dari
 * goresan yang ditinggalkan 879, lalu mengeras menjadi identitas yang dapat
 * diwariskan.
 *
 * Namanya adalah teks DOM, bukan piksel di dalam citra (Authority Rule 1).
 * Konsekuensi teknisnya penting: hanya opacity dan transform yang dipakai,
 * tidak pernah autoAlpha, sehingga nama historis tidak pernah keluar dari
 * pohon aksesibilitas hanya karena pengunjung belum menggulir sampai sana.
 */
const nameEmerges: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    timeline.fromTo(
      surface,
      { opacity: 0, "--dolly": 1.18, "--lit": 0 },
      {
        opacity: 1,
        "--dolly": 1,
        "--lit": 1,
        ease: MOTION.scrubEase,
        duration: 0.42,
      },
      0,
    );
  }
  /*
   * Ketukan nama, tarikh, dan kalimat pemikul kini Jam 2 (director.ts).
   * KADHIRI tiba sebagai peristiwa lewat SplitText per-huruf yang di-trigger
   * pada ambang 0.34 — ia datang SEBELUM judul dan kalimat pemikul, karena
   * di scene ini namanya adalah peristiwanya.
   */
  addLosingScaleExit(timeline, surface, plate, variant);
  /*
   * KADHIRI sendiri tidak pernah dianimasikan keluar — ia menetap solid di
   * tengah bingkai sepanjang timeline. Saat transisi keluar menggeser
   * `.stage-plate` ke atas (addLosingScaleExit), kalimat pemikul dapat lewat
   * tepat di baris nama yang diam itu dan bertabrakan — terbukti pada
   * tinjauan visual 2026-08-28 ronde ketiga. Nama ikut meredup pada jendela
   * keluar yang SAMA, sehingga teks yang lewat tidak pernah menabrak kata
   * solid.
   */
  const names = q(root, "scene-name");
  if (names.length > 0) {
    timeline.to(
      names,
      { opacity: 0.12, ease: MOTION.scrubEase, duration: 1 - REST_LEAVE },
      REST_LEAVE,
    );
  }
  return timeline;
};

/**
 * SHOT 1015 — nama yang bertahan (Research Hold).
 *
 * Argumen historisnya: dunia di sekeliling catatan berubah, namanya tidak.
 * Maka kameranya nyaris DIAM — inilah shot paling hening di Act I. Permukaan
 * arsip hadir redup sejak awal dan tidak pernah pergi; yang bergeser pelan
 * hanyalah dunia di sekitarnya (kanvas hanyut hampir tak terasa). Tarikh 1015
 * muncul tanpa gerakan, hanya menjadi ada — karena klaimnya sendiri masih
 * tertahan riset, shot ini menolak dramatisasi.
 */
const nameEndures: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  const canvas = one(root, ".stage-surface svg");
  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    // Permukaan tidak "tiba" — ia sudah ada, hanya perlahan menjadi terbaca.
    timeline.fromTo(
      surface,
      { opacity: 0.42, "--lit": 0.5, "--dolly": 1.06 },
      {
        opacity: 1,
        "--lit": 1,
        "--dolly": 1.02,
        ease: MOTION.scrubEase,
        duration: 0.5,
      },
      0,
    );
  }
  if (canvas) {
    // Dunia di sekitar nama bergeser; namanya tetap di tempatnya.
    timeline.fromTo(
      canvas,
      { xPercent: -2.5 },
      { xPercent: 2.5, ease: MOTION.scrubEase, duration: REST_LEAVE },
      0,
    );
  }
  // Tarikh dan naskah menjadi ada tanpa perpindahan (Jam 2, gaya "still"
  // Research Hold di director.ts): keheningan adalah argumennya.
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/**
 * SHOT 1042 — dua bidang menjauh sementara garis sungai tetap menjadi konstanta.
 *
 * Argumen historisnya: identitas yang tercatat menjadi geografi politik. Maka
 * pembagiannya harus terjadi SECARA SPASIAL, bukan diumumkan lewat kapsi —
 * Panjalu bergerak ke barat, Janggala ke timur, dan Brantas tinggal di
 * tengah sebagai satu-satunya yang tidak berpindah.
 *
 * Nama-namanya teks DOM dengan ejaan kanon (Janggala, bukan Jenggala), bukan
 * label yang terbakar di dalam citra. Karena terpisah, lapisan Sejarah dapat
 * dibedakan dari lapisan Tradisi — 04_VISUAL_ACCEPTANCE menuntut Mpu Bharada
 * tidak pernah tampil sebagai fakta geologis, dan itu mustahil dijamin bila
 * keduanya sudah menyatu di dalam raster.
 */
const dividedKingdom: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  const strokes = Array.from(
    root.querySelectorAll<SVGPathElement | SVGLineElement>(
      "[data-motion-draw]",
    ),
  );
  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    timeline.fromTo(
      surface,
      { opacity: 0, scaleX: 0.82, "--lit": 0 },
      {
        opacity: 1,
        scaleX: 1,
        "--lit": 1,
        ease: MOTION.scrubEase,
        duration: 0.42,
      },
      0,
    );
  }
  revealStrokes(timeline, strokes, 0.12, 0.18, 0.06);
  // Bidang bersatu lebih dulu, baru terbelah: pemisahan hanya berarti kalau
  // kesatuan sebelumnya sempat terbaca (checkpoint 04: unified field readable
  // before separation).
  separateTerritories(timeline, root, 0.3, 0.2);
  // Tarikh dan naskah pembuka: Jam 2 (director.ts).
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/** 1157 — garis arsip terurai seperti halaman yang sedang dibuka. */
const manuscriptWorld: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  const strokes = Array.from(
    root.querySelectorAll<SVGPathElement | SVGLineElement>(
      "[data-motion-draw]",
    ),
  );
  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    timeline.fromTo(
      surface,
      { opacity: 0, xPercent: -5, "--lit": 0 },
      {
        opacity: 1,
        xPercent: 0,
        "--lit": 1,
        ease: MOTION.scrubEase,
        duration: 0.38,
      },
      0,
    );
  }
  revealStrokes(timeline, strokes, 0.1, 0.16, 0.045);
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/** 1222 — keseimbangan bidang bergeser; pusat sejarah tidak lagi di tempat lama. */
const politicalFracture: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    timeline.fromTo(
      surface,
      { opacity: 0, xPercent: -8, "--lit": 0 },
      {
        opacity: 1,
        xPercent: 6,
        "--lit": 1,
        ease: MOTION.scrubEase,
        duration: 0.5,
      },
      0,
    );
  }
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/** 1912 — geometri yang sudah selesai beradaptasi secara vertikal. */
const bridgeLift: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  const strokes = Array.from(
    root.querySelectorAll<SVGPathElement | SVGLineElement>(
      "[data-motion-draw]",
    ),
  );
  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    timeline.fromTo(
      surface,
      { opacity: 0, yPercent: 7, "--lit": 0 },
      {
        opacity: 1,
        yPercent: -3,
        "--lit": 1,
        ease: MOTION.scrubEase,
        duration: 0.48,
      },
      0,
    );
  }
  revealStrokes(timeline, strokes, 0.08, 0.16, 0.04);
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/** 1947–1948 — ritme mesin menjadi tegang tanpa mengarang bentuk senjata. */
const revolutionMachine: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  const strokes = Array.from(
    root.querySelectorAll<SVGPathElement | SVGLineElement>(
      "[data-motion-draw]",
    ),
  );
  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    timeline.fromTo(
      surface,
      { opacity: 0, xPercent: -4, "--lit": 0 },
      {
        opacity: 1,
        xPercent: 0,
        "--lit": 1,
        ease: MOTION.scrubEase,
        duration: 0.34,
      },
      0,
    );
  }
  revealStrokes(timeline, strokes, 0.08, 0.13, 0.035);
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/** 1958 — tapak kecil melebar menjadi jaringan yang mengubah skala kota. */
const industrialExpansion: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  const strokes = Array.from(
    root.querySelectorAll<SVGPathElement | SVGLineElement>(
      "[data-motion-draw]",
    ),
  );
  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    timeline.fromTo(
      surface,
      { opacity: 0, scale: 0.72, "--lit": 0 },
      {
        opacity: 1,
        scale: 1,
        "--lit": 1,
        ease: MOTION.scrubEase,
        duration: 0.48,
      },
      0,
    );
  }
  revealStrokes(timeline, strokes, 0.1, 0.15, 0.04);
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/** 2024–2026 — satu garis hubungan memanjang dari bentang menuju cakrawala. */
const runwayTransition: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  const strokes = Array.from(
    root.querySelectorAll<SVGPathElement | SVGLineElement>(
      "[data-motion-draw]",
    ),
  );
  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    timeline.fromTo(
      surface,
      { opacity: 0, "--dolly": 1.12, "--lit": 0 },
      {
        opacity: 1,
        "--dolly": 1,
        "--lit": 1,
        ease: MOTION.scrubEase,
        duration: 0.4,
      },
      0,
    );
  }
  revealStrokes(timeline, strokes, 0.08, 0.21, 0.055);
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/**
 * Pembagian wilayah dikerjakan oleh RUANG, bukan oleh kapsi.
 *
 * Dipakai 1042. Panjalu dan Janggala berangkat dari posisi yang berimpit lalu
 * bergerak ke tepian masing-masing; Brantas tidak ikut bergerak sama sekali —
 * satu-satunya konstanta di dalam shot, persis seperti argumen kanonnya.
 * Perjalanan mengikuti varian, karena bingkai mobile jauh lebih sempit dan
 * jarak desktop akan mendorong nama keluar bingkai.
 */
function separateTerritories(
  timeline: gsap.core.Timeline,
  root: HTMLElement,
  at: number,
  duration: number,
): void {
  const names = q(root, "scene-name");
  if (names.length === 0) return;

  timeline.fromTo(
    names,
    { opacity: 0 },
    { opacity: 1, ease: MOTION.scrubEase, duration: duration * 0.4 },
    at,
  );

  for (const name of names) {
    const anchor = name.dataset.anchor;
    // Sungai adalah konstanta: ia hadir, lalu diam.
    if (anchor === "river") continue;
    const direction = anchor === "west" ? -1 : 1;
    timeline.fromTo(
      name,
      { xPercent: 0 },
      {
        xPercent: direction * 100,
        ease: MOTION.scrubEase,
        duration,
      },
      at,
    );
  }
}

/** Menyiapkan dan menggambar garis tanpa membuat fakta visual baru. */
function revealStrokes(
  timeline: gsap.core.Timeline,
  strokes: readonly (SVGPathElement | SVGLineElement)[],
  start: number,
  duration: number,
  step: number,
): void {
  let cursor = start;
  for (const stroke of strokes) {
    const length = stroke.getTotalLength?.() ?? 0;
    if (length === 0) continue;
    gsap.set(stroke, { strokeDasharray: length, strokeDashoffset: length });
    timeline.to(
      stroke,
      { strokeDashoffset: 0, ease: MOTION.scrubEase, duration },
      cursor,
    );
    cursor += step;
  }
}

/**
 * Transisi keluar: permukaan kehilangan skala.
 *
 * Ia terus membesar sampai berhenti terbaca sebagai material dan mulai terbaca
 * sebagai bentang — dari situ era berikutnya lahir. Yang meredup hanya
 * PERMUKAAN; teksnya sekadar bergeser dan tidak pernah hilang, karena naskah
 * historis tidak boleh lenyap hanya karena pengunjung terus menggulir.
 */
function addLosingScaleExit(
  timeline: gsap.core.Timeline,
  surface: HTMLElement | null,
  plate: HTMLElement | null,
  variant: MotionVariant,
): void {
  const duration = 1 - REST_LEAVE;
  if (surface) {
    timeline.to(
      surface,
      { "--dolly": 1.7, opacity: 0.16, ease: MOTION.scrubEase, duration },
      REST_LEAVE,
    );
  }
  if (plate) {
    timeline.to(
      plate,
      { yPercent: -travelFor(variant) / 5, ease: MOTION.scrubEase, duration },
      REST_LEAVE,
    );
  }
  // Jaminan durasi 1 walau sebuah shot tidak punya permukaan maupun pelat.
  timeline.set({}, {}, 1);
}

const FACTORIES: Partial<Record<ChoreographyKey, SceneTimelineFactory>> = {
  prologueReveal,
  inscriptionReveal,
  nameEmerges,
  nameEndures,
  dividedKingdom,
  dahaLiving,
  royalConsolidation,
  manuscriptWorld,
  politicalFracture,
  bridgeConstruction,
  bridgeLift,
  revolutionMachine,
  industrialExpansion,
  runwayTransition,
};

export function sceneTimelineFactory(
  key: string,
): SceneTimelineFactory | undefined {
  return FACTORIES[key as ChoreographyKey];
}

/**
 * Peta pacing per shot, dalam persen tinggi viewport.
 *
 * Direktif sinematik §19: jangan memberi setiap scene durasi identik. Shot
 * kontemplatif (penyingkapan prasasti, perakitan jembatan) menahan layar lebih
 * lama; shot transisi bergerak lebih cepat. Nilainya milik kode, bukan CMS —
 * dan dicerminkan `.scene-pin-space` per koreografi di globals.css, karena
 * ruang pin dirender server supaya tidak ada CLS.
 *
 * Mobile novel grafis dengan alur vertikal asli (UX Bible bagian 26). Reduced
 * motion tidak pernah di-pin — menggulir ruang kosong bukan aksesibilitas.
 */
const PIN_DISTANCES: Record<
  ChoreographyKey,
  { readonly desktop: number; readonly tablet: number }
> = {
  prologueReveal: { desktop: 330, tablet: 210 },
  inscriptionReveal: { desktop: 420, tablet: 260 },
  nameEmerges: { desktop: 330, tablet: 205 },
  // Interlude paling hening di Act I: lebih pendek dari shot hero mana pun.
  nameEndures: { desktop: 300, tablet: 190 },
  dividedKingdom: { desktop: 390, tablet: 240 },
  // Video yang hidup butuh waktu tayang, bukan drama gulir: tahan tenang.
  dahaLiving: { desktop: 320, tablet: 200 },
  royalConsolidation: { desktop: 400, tablet: 250 },
  manuscriptWorld: { desktop: 370, tablet: 230 },
  politicalFracture: { desktop: 350, tablet: 215 },
  bridgeConstruction: { desktop: 420, tablet: 260 },
  bridgeLift: { desktop: 350, tablet: 215 },
  revolutionMachine: { desktop: 330, tablet: 205 },
  industrialExpansion: { desktop: 370, tablet: 230 },
  runwayTransition: { desktop: 390, tablet: 240 },
};

function pinDistanceFor(variant: MotionVariant, key: string): number {
  const distances = PIN_DISTANCES[key as ChoreographyKey];
  if (!distances) return 0;
  if (variant === "desktop") return distances.desktop;
  if (variant === "tablet") return distances.tablet;
  return 0;
}

/**
 * Memasang satu shot: timeline lebih dulu, ScrollTrigger belakangan.
 *
 * Nilai baliknya pembersih. Pemilik shot yang memiliki teardown-nya, sehingga
 * berpindah rute tidak meninggalkan ScrollTrigger yatim.
 */
export function attachScene(
  context: SceneMotionContext,
  key: string,
): () => void {
  if (context.variant === "reduced" || context.variant === "mobile") {
    /*
     * Mobile adalah panel novel grafis dalam alur native, dan reduced adalah
     * keadaan baca statis. KEADAAN BACA ADALAH DOM HASIL SERVER-RENDER:
     * karena seluruh keadaan awal tween masuk lewat fromTo di timeline
     * paused, tidak membangun timeline berarti tidak ada satu properti pun
     * yang perlu direkonstruksi — dan tidak ada drift yang mungkin terjadi.
     */
    return () => undefined;
  }

  const factory = sceneTimelineFactory(key);
  if (!factory) return () => undefined;

  const timeline = factory(context);
  if (!timeline) return () => undefined;

  // Smoother lebih dulu, ScrollTrigger belakangan: keputusan pin-vs-sticky
  // harus diambil sebelum trigger pertama dibuat. Null berarti degradasi ke
  // scroll native + CSS sticky, bukan kegagalan.
  const smoother = ensureSmoother();

  const pinDistance = pinDistanceFor(context.variant, key);
  const extended = pinDistance > 0;
  const stage =
    one(
      context.root,
      key === "prologueReveal" ? ".prologue-stage" : ".scene-stage",
    ) ?? context.root;

  /*
   * NASKAH TIBA DI ATAS CITRA — tetapi di JAM-nya SENDIRI.
   *
   * Model dua-jam (direktif Chief 2026-08-28, hasil teardown situs referensi):
   * timeline shot ini hanya memegang KAMERA (permukaan, cahaya, goresan,
   * handoff, transisi keluar) dan tetap di-scrub linear. Tarikh, kalimat
   * pemikul, nama, dan beat editorial dipegang sutradara naskah
   * (`director.ts`): DI-TRIGGER pada ambang progres, lalu bermain dengan ease
   * ekspresif. Ritme editorial MASUK → TERBACA → PERGI → HENING tetap hidup —
   * kini di mesin beat director, dengan jendela progres per koreografi yang
   * sama seperti sebelumnya.
   */
  const director = createReadingDirector(context.root, key);

  /*
   * Parallax latar ambient (direktif editorial Chief 2026-08-29): media
   * bergeser halus (-10%) sepanjang shot. HANYA pada KONTAINER .stage-media —
   * tidak pernah pada <img> di dalamnya, karena img memegang transform
   * jendela crop anti-teks-terbakar (framing.ts) yang akan tertimpa inline
   * transform GSAP.
   */
  const media = one(context.root, ".stage-media");
  if (media) {
    timeline.fromTo(
      media,
      { yPercent: MOTION.parallax.from },
      {
        yPercent: MOTION.parallax.to,
        ease: MOTION.scrubEase,
        duration: 1,
      },
      0,
    );
  }

  addSceneHandoff(timeline, context.root);

  const pinSpace = context.root.querySelector<HTMLElement>(".scene-pin-space");
  const trigger = ScrollTrigger.create({
    trigger: stage,
    start: extended ? "top top" : "top 82%",
    /*
     * Ruang gulir DIUKUR dari .scene-pin-space yang dirender server, bukan
     * dihitung ulang dari peta: kontrak pacing dengan CSS menjadi tunggal
     * secara harfiah, dan basis satuannya (svh) ikut terbawa.
     */
    end:
      extended && pinSpace
        ? () => `+=${pinSpace.offsetHeight}`
        : extended
          ? `+=${pinDistance}%`
          : "bottom 40%",
    invalidateOnRefresh: true,
    scrub: 0.55,
    /*
     * Dengan ScrollSmoother aktif, CSS sticky tidak dapat bekerja di dalam
     * konten yang ditransformasikan — pin ScrollTrigger mengambil alih,
     * sementara ruang pin server-rendered tetap menjadi spacer-nya
     * (pinSpacing: false), sehingga tetap tidak ada CLS. Tanpa smoother,
     * sticky CSS lama tetap menahan bingkai dan pin tidak dipakai.
     */
    pin: smoother && extended ? stage : false,
    pinSpacing: false,
    animation: timeline,
    onUpdate: (self) => director.onProgress(self.progress),
  });

  // Desktop memakai plate overlay sinematik. Tablet tetap menjalankan
  // timeline yang sama, tetapi mempertahankan stack server-rendered agar
  // registrasi island tidak mengubah tinggi prologue-plate dan memicu CLS.
  if (context.variant === "desktop") {
    context.root.dataset.motionReady = "true";
  }

  /*
   * Pendaratan tautan dalam TIDAK diurus di sini. Island motion dibongkar-pasang
   * oleh gsap.matchMedia, dan pembongkaran itu membatalkan koreksi gulir sebelum
   * sempat jalan. Ia hidup sekali untuk seluruh halaman di
   * components/journey/deep-link-landing.tsx.
   */
  return () => {
    delete context.root.dataset.motionReady;
    director.destroy();
    trigger.kill();
    timeline.kill();
    releaseSmoother();
  };
}

/**
 * Menggerakkan handoff dekoratif tanpa membawa teks atau klaim sejarah.
 * Phase incoming masuk pada awal shot; phase outgoing keluar di akhir shot.
 * Perubahan materialnya dikerjakan oleh CSS dan tiga node sederhana, bukan
 * fade antarhalaman.
 */
function addSceneHandoff(
  timeline: gsap.core.Timeline,
  root: HTMLElement,
): void {
  const handoffs = q(root, "handoff");
  for (const handoff of handoffs) {
    const phase = handoff.dataset.handoffPhase;
    const isIncoming = phase === "incoming";
    // Beat terakhir sudah settle di 0.80; sejak itu motif keluar boleh mulai
    // menggeser material ke dunia berikutnya, sehingga hold tetap terbaca
    // tetapi keadaan transisinya terlihat sebagai keadaan yang berbeda.
    const start = isIncoming ? 0.08 : REST_LEAVE - 0.04;
    const outgoing = handoff.querySelector<HTMLElement>(
      '[data-handoff-element="outgoing"]',
    );
    const transform = handoff.querySelector<HTMLElement>(
      '[data-handoff-element="transform"]',
    );
    const incoming = handoff.querySelector<HTMLElement>(
      '[data-handoff-element="incoming"]',
    );

    timeline.fromTo(
      handoff,
      { opacity: 0, xPercent: isIncoming ? -12 : 12, scaleX: 0.82 },
      {
        opacity: 1,
        xPercent: 0,
        scaleX: 1,
        ease: MOTION.scrubEase,
        duration: 0.1,
      },
      start,
    );

    if (outgoing) {
      timeline.fromTo(
        outgoing,
        { opacity: 0.35, scaleX: 0.2, xPercent: isIncoming ? -8 : 8 },
        {
          opacity: 0.9,
          scaleX: 1,
          xPercent: 0,
          ease: MOTION.scrubEase,
          duration: 0.05,
        },
        start,
      );
    }
    if (transform) {
      timeline.fromTo(
        transform,
        { opacity: 0, scaleX: 0.1 },
        {
          opacity: 0.78,
          scaleX: 1,
          ease: MOTION.scrubEase,
          duration: 0.05,
        },
        start + 0.05,
      );
    }
    if (incoming) {
      timeline.fromTo(
        incoming,
        { opacity: 0, scaleX: 0.1, xPercent: isIncoming ? -8 : 8 },
        {
          opacity: 1,
          scaleX: 1,
          xPercent: 0,
          ease: MOTION.scrubEase,
          duration: 0.06,
        },
        start + 0.1,
      );
    }
  }
}
