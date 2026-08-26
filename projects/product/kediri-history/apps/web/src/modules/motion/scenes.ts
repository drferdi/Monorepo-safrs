import { gsap, MOTION, ScrollTrigger } from "./gsap";
import type { ChoreographyKey, MotionVariant } from "./registry";

/**
 * Koreografi scene.
 *
 * HUKUM MOTION GLOBAL: setiap animasi harus menjawab satu pertanyaan —
 * gagasan historis apa yang disampaikan gerakan ini? Bila tidak ada
 * jawabannya, animasi itu dihapus (Cinematic Bible bagian 3).
 *
 * Aturan yang mengikat setiap factory di berkas ini:
 *   - satu scene terkoordinasi memiliki SATU timeline utama;
 *   - timeline dibangun lebih dulu, ScrollTrigger dipasang belakangan;
 *   - hanya transform dan opacity yang dianimasikan, tidak pernah properti
 *     layout;
 *   - gerak yang di-scrub memakai easing linear;
 *   - varian reduced BUKAN versi rusak: ia menghapus perjalanan spasial dan
 *     scrub panjang, dan menyisakan komposisi statis yang utuh;
 *   - tidak ada teks yang dibuat, disembunyikan permanen, atau diubah maknanya.
 *     Seluruh sejarah sudah ada di HTML sebelum berkas ini berjalan.
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

function travelFor(variant: MotionVariant): number {
  if (variant === "mobile") return MOTION.travel.mobile;
  if (variant === "tablet") return MOTION.travel.tablet;
  return MOTION.travel.desktop;
}

/**
 * 879 — sebuah catatan muncul dari kegelapan.
 *
 * Gagasan historisnya: gambar historis pertama bukan istana atau pasukan,
 * melainkan sebuah CATATAN. Cahaya menyerempet menyingkap materialnya, dan
 * tanggalnya hadir bertahap — bukan sekaligus, karena pengetahuan tentang
 * tanggal itu pun sampai kepada kita bertahap.
 *
 * Yang TIDAK dilakukan: menganimasikan aksara seolah urutan penulisannya
 * diketahui (Cinematic Bible, Scene 01).
 */
const inscriptionReveal: SceneTimelineFactory = ({ root, variant }) => {
  const date = q(root, "date");
  const title = q(root, "title");
  const body = q(root, "body");
  if (date.length === 0 && title.length === 0) return undefined;

  const timeline = gsap.timeline({ paused: true });
  timeline
    .from(date, {
      autoAlpha: 0,
      yPercent: travelFor(variant),
      ...MOTION.settle,
    })
    .from(
      title,
      { autoAlpha: 0, yPercent: travelFor(variant), ...MOTION.reveal },
      "-=0.5",
    )
    .from(body, { autoAlpha: 0, ...MOTION.reveal }, "-=0.4");
  return timeline;
};

/**
 * 1135 — otoritas yang tercerai-berai menyatu.
 *
 * Gagasan historisnya: kerajaan yang pernah dibelah menemukan satu suara.
 * Karena itu potongan judul mulai tersebar pada kedalaman berbeda lalu
 * menyatu menjadi satu frasa. Konsolidasinya adalah argumennya.
 *
 * Yang TIDAK dilakukan: pertempuran istana rekaan.
 */
const royalConsolidation: SceneTimelineFactory = ({ root, variant }) => {
  const title = q(root, "title");
  const date = q(root, "date");
  const body = q(root, "body");
  if (title.length === 0) return undefined;

  const travel = travelFor(variant);
  const timeline = gsap.timeline({ paused: true });
  timeline
    .from(date, { autoAlpha: 0, ...MOTION.reveal })
    .from(
      title,
      {
        autoAlpha: 0,
        xPercent: (index: number) => (index % 2 === 0 ? -travel : travel),
        yPercent: travel / 2,
        ...MOTION.settle,
      },
      "-=0.4",
    )
    .from(body, { autoAlpha: 0, ...MOTION.reveal }, "-=0.6");
  return timeline;
};

/**
 * 1869 — struktur terakit dari logika rekayasa.
 *
 * Gagasan historisnya: sungai berhenti menjadi halangan dan menjadi soal
 * rekayasa. Geometri jembatan menggambar dirinya sendiri dari garis, lalu garis
 * menjadi besi. Yang digambar adalah geometri jembatan yang sebenarnya, bukan
 * rangka generik.
 *
 * Catatan bukti: gerak ini menyampaikan konsep "terakit", bukan detail teknis
 * yang belum terverifikasi. Pengangkatan jembatan 1912 tetap terkunci sampai
 * mekanisme dan tarikhnya dikonfirmasi arsip.
 */
const bridgeConstruction: SceneTimelineFactory = ({ root }) => {
  const strokes = Array.from(
    root.querySelectorAll<SVGPathElement | SVGLineElement>(
      "[data-motion-draw]",
    ),
  );
  const date = q(root, "date");
  const title = q(root, "title");
  if (strokes.length === 0 && title.length === 0) return undefined;

  const timeline = gsap.timeline({ paused: true });
  timeline.from(date, { autoAlpha: 0, ...MOTION.reveal });
  timeline.from(title, { autoAlpha: 0, ...MOTION.reveal }, "-=0.5");

  for (const stroke of strokes) {
    const length = stroke.getTotalLength?.() ?? 0;
    if (length === 0) continue;
    gsap.set(stroke, { strokeDasharray: length, strokeDashoffset: length });
    timeline.to(
      stroke,
      { strokeDashoffset: 0, duration: 1, ease: MOTION.scrubEase },
      "<0.08",
    );
  }
  return timeline;
};

const FACTORIES: Partial<Record<ChoreographyKey, SceneTimelineFactory>> = {
  inscriptionReveal,
  royalConsolidation,
  bridgeConstruction,
};

export function sceneTimelineFactory(
  key: string,
): SceneTimelineFactory | undefined {
  return FACTORIES[key as ChoreographyKey];
}

/**
 * Memasang timeline scene pada scroll.
 *
 * Reduced motion mendapat komposisi akhir seketika: bukan versi rusak, versi
 * pameran. Varian lain memakai satu ScrollTrigger per scene, dan pemiliknya
 * yang membersihkan.
 */
export function attachScene(
  context: SceneMotionContext,
  key: string,
): () => void {
  const factory = sceneTimelineFactory(key);
  if (!factory) return () => undefined;

  const timeline = factory(context);
  if (!timeline) return () => undefined;

  if (context.variant === "reduced") {
    // Tidak ada perjalanan spasial, tidak ada scrub. Komposisi akhir langsung.
    timeline.progress(1).pause();
    return () => timeline.kill();
  }

  const trigger = ScrollTrigger.create({
    trigger: context.root,
    start: "top 78%",
    end: "bottom 55%",
    scrub: 0.6,
    animation: timeline,
  });

  return () => {
    trigger.kill();
    timeline.kill();
  };
}
