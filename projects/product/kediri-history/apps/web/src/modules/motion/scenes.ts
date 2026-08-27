import { gsap, MOTION, ScrollTrigger } from "./gsap";
import type { ChoreographyKey, MotionVariant } from "./registry";

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
  const context = q(root, "context");
  const title = q(root, "title");
  const master = q(root, "master");
  const metadata = q(root, "metadata");
  const plate = one(root, ".prologue-plate");
  const timeline = gsap.timeline({ paused: true });

  if (surface) {
    timeline.fromTo(
      surface,
      { opacity: 0, "--dolly": 1.08, "--lit": 0 },
      {
        opacity: 1,
        "--dolly": 1.02,
        "--lit": 1,
        ease: MOTION.scrubEase,
        duration: 0.42,
      },
      0,
    );
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
  timeline.fromTo(
    context.length > 0 ? context : title,
    { opacity: 0, yPercent: 5 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.08 },
    0.3,
  );
  timeline.fromTo(
    master,
    { opacity: 0, yPercent: 6 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.08 },
    0.43,
  );
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
  const units = q(root, "date-part");
  const title = q(root, "title");
  const context = q(root, "context");
  const master = q(root, "master");
  if (!surface || units.length === 0) return undefined;

  // Tarikh hadir bertahap, dan TAHUNNYA lebih dulu: keberadaan sebelum presisi.
  const year = units.at(-1);
  const precision = units.slice(0, -1);
  if (!year) return undefined;

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

  // Ketukan 3 — 879 muncul di tempat cahaya baru saja lewat.
  timeline.fromTo(
    year,
    { opacity: 0, yPercent: 14 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.1 },
    0.34,
  );

  // Ketukan 4 — tahanan. Hanya kamera yang masih merayap.

  // Ketukan 5 — presisi menyusul, lalu label dan kalimat yang memikul shot.
  if (precision.length > 0) {
    timeline.fromTo(
      precision,
      { opacity: 0, yPercent: 10 },
      {
        opacity: 1,
        yPercent: 0,
        ease: MOTION.scrubEase,
        duration: 0.08,
        stagger: 0.03,
      },
      0.52,
    );
  }
  timeline.fromTo(
    context.length > 0 ? context : title,
    { opacity: 0 },
    { opacity: 1, ease: MOTION.scrubEase, duration: 0.06 },
    0.48,
  );
  timeline.fromTo(
    master,
    { opacity: 0, yPercent: 8 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.08 },
    0.53,
  );

  // Ketukan 6 — tahanan baca. Komposisi diam; tautan dalam mendarat di sini.

  // Ketukan 7 — permukaan KEHILANGAN SKALA: material menjadi bentang.
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
  const units = q(root, "date-part");
  const title = q(root, "title");
  const master = q(root, "master");
  if (units.length === 0 && title.length === 0) return undefined;

  const travel = travelFor(variant);
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
  timeline.fromTo(
    units,
    {
      opacity: 0,
      xPercent: (index: number) => (index % 2 === 0 ? -travel : travel),
    },
    {
      opacity: 1,
      xPercent: 0,
      ease: MOTION.scrubEase,
      duration: 0.24,
      stagger: 0.04,
    },
    0.26,
  );
  timeline.fromTo(
    title,
    { opacity: 0 },
    { opacity: 1, ease: MOTION.scrubEase, duration: 0.06 },
    0.54,
  );
  timeline.fromTo(
    master,
    { opacity: 0, yPercent: 8 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.08 },
    0.58,
  );
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
  const units = q(root, "date-part");
  const title = q(root, "title");
  const master = q(root, "master");

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

  timeline.fromTo(
    units,
    { opacity: 0, yPercent: 12 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.1 },
    0.42,
  );
  timeline.fromTo(
    title,
    { opacity: 0 },
    { opacity: 1, ease: MOTION.scrubEase, duration: 0.06 },
    0.54,
  );
  timeline.fromTo(
    master,
    { opacity: 0, yPercent: 8 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.08 },
    0.58,
  );
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
  const units = q(root, "date-part");
  const context = q(root, "context");
  const title = q(root, "title");
  const master = q(root, "master");
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
  timeline.fromTo(
    units,
    { opacity: 0, yPercent: 24 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.16 },
    0.3,
  );

  /*
   * Ketukan nama. Ia datang SEBELUM judul dan kalimat pemikul, karena di scene
   * ini namanya adalah peristiwanya — bukan ilustrasi bagi kalimat yang
   * menjelaskannya. Perjalanannya dari bawah dan sedikit membesar: nama itu
   * naik keluar dari material, bukan meredup masuk dari ketiadaan.
   */
  revealNames(timeline, root, 0.34, 0.14);

  timeline.fromTo(
    context.length > 0 ? context : title,
    { opacity: 0, yPercent: 12 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.12 },
    0.5,
  );
  timeline.fromTo(
    master,
    { opacity: 0, yPercent: 10 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.1 },
    0.56,
  );
  addLosingScaleExit(timeline, surface, plate, variant);
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
  const units = q(root, "date-part");
  const context = q(root, "context");
  const master = q(root, "master");
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
  // Tarikh menjadi ada tanpa perpindahan: keheningan adalah argumennya.
  timeline.fromTo(
    units,
    { opacity: 0 },
    { opacity: 1, ease: MOTION.scrubEase, duration: 0.14 },
    0.34,
  );
  timeline.fromTo(
    context,
    { opacity: 0 },
    { opacity: 1, ease: MOTION.scrubEase, duration: 0.08 },
    0.5,
  );
  timeline.fromTo(
    master,
    { opacity: 0 },
    { opacity: 1, ease: MOTION.scrubEase, duration: 0.1 },
    0.56,
  );
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
  const units = q(root, "date-part");
  const context = q(root, "context");
  const master = q(root, "master");
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
  revealEarlyReading(timeline, units, context, master);
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
  const units = q(root, "date-part");
  const context = q(root, "context");
  const master = q(root, "master");
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
  revealReading(timeline, units, context, master);
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/** 1222 — keseimbangan bidang bergeser; pusat sejarah tidak lagi di tempat lama. */
const politicalFracture: SceneTimelineFactory = ({ root, variant }) => {
  const surface = one(root, ".stage-surface");
  const plate = one(root, ".stage-plate");
  const units = q(root, "date-part");
  const context = q(root, "context");
  const master = q(root, "master");
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
  revealReading(timeline, units, context, master);
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
  const units = q(root, "date-part");
  const context = q(root, "context");
  const master = q(root, "master");
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
  revealReading(timeline, units, context, master);
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
  const units = q(root, "date-part");
  const context = q(root, "context");
  const master = q(root, "master");
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
  revealReading(timeline, units, context, master);
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
  const units = q(root, "date-part");
  const context = q(root, "context");
  const master = q(root, "master");
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
  revealReading(timeline, units, context, master);
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
  const units = q(root, "date-part");
  const context = q(root, "context");
  const master = q(root, "master");
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
  revealReading(timeline, units, context, master);
  addLosingScaleExit(timeline, surface, plate, variant);
  return timeline;
};

/**
 * Nama tiba sebagai peristiwa.
 *
 * Dipakai 921, tempat satu nama adalah seluruh argumen scene. Namanya naik
 * keluar dari material dan mengeras: yPercent turun ke nol sementara skalanya
 * menyusut sedikit ke ukuran istirahat, sehingga geraknya terbaca sebagai
 * sesuatu yang muncul ke permukaan, bukan sebagai teks yang di-fade.
 *
 * Hanya opacity dan transform. Tidak pernah autoAlpha: nama historis tidak
 * boleh hilang dari pohon aksesibilitas.
 */
function revealNames(
  timeline: gsap.core.Timeline,
  root: HTMLElement,
  at: number,
  duration: number,
): void {
  const names = q(root, "scene-name");
  if (names.length === 0) return;
  timeline.fromTo(
    names,
    { opacity: 0, yPercent: 26, scale: 1.06 },
    {
      opacity: 1,
      yPercent: 0,
      scale: 1,
      ease: MOTION.scrubEase,
      duration,
      stagger: names.length > 1 ? duration * 0.22 : 0,
    },
    at,
  );
}

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

/** Pola baca bersama; isi dan urutannya tetap milik HTML. */
function revealReading(
  timeline: gsap.core.Timeline,
  units: readonly HTMLElement[],
  context: readonly HTMLElement[],
  master: readonly HTMLElement[],
): void {
  timeline.fromTo(
    units,
    { opacity: 0, yPercent: 12 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.11 },
    0.42,
  );
  timeline.fromTo(
    context,
    { opacity: 0 },
    { opacity: 1, ease: MOTION.scrubEase, duration: 0.07 },
    0.52,
  );
  timeline.fromTo(
    master,
    { opacity: 0, yPercent: 8 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.09 },
    0.58,
  );
}

/**
 * Pacing khusus pembukaan 879–1042. Lead line mendapat ruang hening sebelum
 * beat naratif; scene setelah 1042 tetap memakai pacing historisnya sendiri.
 */
function revealEarlyReading(
  timeline: gsap.core.Timeline,
  units: readonly HTMLElement[],
  context: readonly HTMLElement[],
  master: readonly HTMLElement[],
): void {
  timeline.fromTo(
    units,
    { opacity: 0, yPercent: 12 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.11 },
    0.36,
  );
  timeline.fromTo(
    context,
    { opacity: 0 },
    { opacity: 1, ease: MOTION.scrubEase, duration: 0.07 },
    0.46,
  );
  timeline.fromTo(
    master,
    { opacity: 0, yPercent: 8 },
    { opacity: 1, yPercent: 0, ease: MOTION.scrubEase, duration: 0.09 },
    0.52,
  );
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
  const factory = sceneTimelineFactory(key);
  if (!factory) return () => undefined;

  const timeline = factory(context);
  if (!timeline) return () => undefined;

  if (context.variant === "reduced" || context.variant === "mobile") {
    // Mobile adalah panel novel grafis dalam alur native, sedangkan reduced
    // langsung menjadi keadaan baca. Keduanya tidak boleh mendarat pada
    // progres scrub parsial yang meninggalkan sebagian naskah transparan.
    setReadableState(context.root, timeline);
    return () => timeline.kill();
  }

  const pinDistance = pinDistanceFor(context.variant, key);
  const extended = pinDistance > 0;
  const stage =
    one(
      context.root,
      key === "prologueReveal" ? ".prologue-stage" : ".scene-stage",
    ) ?? context.root;

  /*
   * NASKAH TIBA DI ATAS CITRA, di dalam SATU timeline shot yang sama.
   *
   * Selama dataran baca (0.60–0.82) paragraf hadir bergiliran di pelat
   * editorial: satu kalimat pada satu waktu, di halaman citra itu sendiri —
   * bukan halaman teks setelah shot, dan citra tidak pernah tayang dua kali.
   * Paragraf terakhir tidak pernah pergi; transisi keluar hanya meredupkan
   * kanvas. Hanya opacity yang dipakai — naskah historis tidak pernah keluar
   * dari pohon aksesibilitas, dan varian mobile/reduced/tanpa-JS menampilkan
   * seluruh paragraf secara statis (cabang ini tidak pernah mereka lalui).
   */
  /*
   * Ritme editorial per beat: MASUK → TERBACA → PERGI → HENING.
   *
   * Jeda hening itu disengaja (direktif §18): di antara dua beat, citra
   * dibiarkan berdiri sendiri tanpa satu pun naskah — informasi tidak pernah
   * datang sekaligus, dan keheningan adalah bagian dari penyuntingan. Beat
   * terakhir menetap: dataran baca yang dituju tautan dalam tetap punya
   * naskah yang utuh.
   */
  const passages = q(context.root, "passage");
  if (passages.length > 0) {
    // Tautan dalam berhenti pada progres 0.74. Scene awal yang mempunyai
    // tiga beat harus sudah memasuki beat terakhir di sana, bukan berhenti
    // pada ambang opacity yang membuat kalimat penutup tampak redup.
    const PASSAGE_START =
      key === "prologueReveal"
        ? 0.56
        : key === "inscriptionReveal"
          ? 0.56
          : key === "nameEmerges"
            ? 0.5
            : 0.54;
    // 879 dan 1015 memiliki stage yang sedikit lebih tinggi daripada viewport
    // pada sebagian desktop viewport. Target landing tetap .74, sedangkan
    // ScrollTrigger menormalisasi ke pin-space; mengakhiri staging di .74
    // memastikan beat terakhir sudah settle sebelum handoff .80 dimulai.
    const PASSAGE_END =
      key === "inscriptionReveal" || key === "nameEndures" ? 0.74 : 0.82;
    const slot = (PASSAGE_END - PASSAGE_START) / passages.length;
    const fade = Math.min(0.035, slot * 0.22);
    const silence = passages.length > 1 ? slot * 0.16 : 0;
    passages.forEach((passage, index) => {
      const at = PASSAGE_START + index * slot;
      const entry = passageEntry(key, index);
      const settle = passageSettle(key);
      timeline.fromTo(
        passage,
        entry,
        { ...settle, ease: MOTION.scrubEase, duration: fade },
        at,
      );
      if (index < passages.length - 1) {
        const exit = passageExit(key, index);
        timeline.to(
          passage,
          { ...exit, ease: MOTION.scrubEase, duration: fade },
          at + slot - fade - silence,
        );
      }
    });
  }

  addSceneHandoff(timeline, context.root);

  const trigger = ScrollTrigger.create({
    trigger: stage,
    start: extended ? "top top" : "top 82%",
    end: extended ? `+=${pinDistance}%` : "bottom 40%",
    scrub: 0.55,
    // CSS sticky menahan bingkai di ruang yang sudah ada sejak server render.
    // ScrollTrigger hanya mengatur progres, sehingga tidak ada pin-spacer
    // runtime yang menggeser dokumen dan menciptakan CLS.
    pin: false,
    anticipatePin: 0,
    animation: timeline,
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
    trigger.kill();
    timeline.kill();
  };
}

function passageEntry(
  key: string,
  index: number,
): { opacity: number; xPercent?: number; yPercent?: number } {
  switch (key) {
    case "prologueReveal":
      return { opacity: 0, xPercent: index % 2 === 0 ? -3 : 3 };
    case "inscriptionReveal":
      return { opacity: 0, xPercent: -2 };
    case "nameEmerges":
      return { opacity: 0, xPercent: index % 2 === 0 ? -6 : 6 };
    case "nameEndures":
      // Research Hold harus terasa hening: tidak ada perjalanan dekoratif.
      return { opacity: 0 };
    case "dividedKingdom":
      return { opacity: 0, xPercent: index % 2 === 0 ? -5 : 5 };
    default:
      return { opacity: 0, yPercent: 4 };
  }
}

function passageSettle(key: string): {
  opacity: number;
  xPercent?: number;
  yPercent?: number;
} {
  if (key === "nameEndures") return { opacity: 1 };
  if (key === "prologueReveal" || key === "inscriptionReveal") {
    return { opacity: 1, xPercent: 0 };
  }
  if (key === "nameEmerges" || key === "dividedKingdom") {
    return { opacity: 1, xPercent: 0 };
  }
  return { opacity: 1, yPercent: 0 };
}

function passageExit(
  key: string,
  index: number,
): { opacity: number; xPercent?: number; yPercent?: number } {
  if (key === "nameEndures") return { opacity: 0 };
  if (key === "prologueReveal" || key === "inscriptionReveal") {
    return { opacity: 0, xPercent: index % 2 === 0 ? 2 : -2 };
  }
  if (key === "nameEmerges" || key === "dividedKingdom") {
    return { opacity: 0, xPercent: index % 2 === 0 ? 4 : -4 };
  }
  return { opacity: 0, yPercent: -3 };
}

/**
 * Keadaan baca untuk mobile, reduced motion, dan deep-link tanpa pin.
 * Timeline tetap dibangun agar kontrak factory tunggal terjaga, lalu seluruh
 * naskah dan permukaan dikembalikan ke keadaan statis yang utuh.
 */
function setReadableState(
  root: HTMLElement,
  timeline: gsap.core.Timeline,
): void {
  timeline.progress(1).pause();
  setIfPresent(q(root, "surface"), {
    opacity: 1,
    "--dolly": 1,
    "--lit": 1,
  });
  setIfPresent(q(root, "water-line"), {
    opacity: 0.72,
    scaleX: 1,
    xPercent: 0,
  });
  setIfPresent(q(root, "context"), {
    opacity: 1,
    xPercent: 0,
    yPercent: 0,
  });
  setIfPresent(q(root, "title"), { opacity: 1, xPercent: 0, yPercent: 0 });
  setIfPresent(q(root, "master"), { opacity: 1, xPercent: 0, yPercent: 0 });
  setIfPresent(q(root, "metadata"), { opacity: 1 });
  setIfPresent(q(root, "passage"), {
    opacity: 1,
    xPercent: 0,
    yPercent: 0,
  });
  /*
   * Nama tempat dan wilayah harus utuh dan terbaca di mobile, reduced motion,
   * dan pendaratan tautan dalam. Ini bukan dekorasi yang boleh tertinggal
   * setengah transparan: pada 921 namanya ADALAH scene-nya, dan pada 1042
   * tanpa nama-nama ini tidak ada yang menjelaskan wilayah mana yang mana —
   * sebab labelnya sudah tidak lagi ada di dalam citra.
   *
   * xPercent sengaja dikembalikan ke nol: pemisahan spasial adalah koreografi
   * desktop. Di alur vertikal mobile, nama beristirahat pada posisi tata
   * letaknya sendiri.
   */
  setIfPresent(q(root, "scene-name"), {
    opacity: 1,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
  });

  for (const handoff of q(root, "handoff")) {
    setIfPresent([handoff], { opacity: 1, xPercent: 0, scaleX: 1 });
    setIfPresent(
      Array.from(
        handoff.querySelectorAll<HTMLElement>("[data-handoff-element]"),
      ),
      { opacity: 1, scaleX: 1, xPercent: 0 },
    );
  }
}

function setIfPresent(
  targets: readonly HTMLElement[],
  vars: gsap.TweenVars,
): void {
  if (targets.length > 0) gsap.set(targets, vars);
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
