import type { MotionVariant } from "./registry";

/**
 * Gerbang pemutaran media scene.
 *
 * Slot video sebuah scene TIDAK boleh memutar sendiri. Tanpa gerbang ini dua
 * video berat (Daha 7,2 MB dan Jayabaya 12,1 MB) mulai berputar begitu
 * /journey terpasang — ribuan piksel di bawah lipatan, tanpa seorang pun
 * melihatnya, sambil merebut bandwidth dari komposisi pembuka.
 *
 * Kepemilikan jadi tunggal: markup server hanya memasang poster (citra scene
 * itu sendiri), island motion yang memutuskan kapan gambar bergerak. Karena
 * poster identik dengan citra slot, keadaan tanpa JavaScript tetap komposisi
 * yang utuh — bukan kotak kosong.
 *
 * Varian reduced tidak pernah memutar: reduced motion adalah komposisi diam
 * kelas satu (Kontrak Motion aturan 2), bukan versi rusak.
 */

/**
 * Keputusan murni pemutaran — satu-satunya tempat aturannya ditulis.
 *
 * Dipisah dari DOM supaya dapat diuji langsung: baik pengamat perpotongan
 * maupun penangan visibilitas dokumen menyalurkan keputusannya ke sini.
 */
export function shouldPlay(
  variant: MotionVariant,
  intersecting: boolean,
  documentHidden: boolean,
): boolean {
  if (variant === "reduced") return false;
  if (documentHidden) return false;
  return intersecting;
}

/** Ambang perpotongan: seperempat bingkai terlihat sebelum kamera hidup. */
const PLAY_RATIO = 0.25;

/**
 * Memasang gerbang pada satu scene dan mengembalikan pembersihnya.
 *
 * Nilai balik selalu aman dipanggil, termasuk ketika scene tidak punya video —
 * pemanggil tidak perlu bercabang.
 */
export function attachMediaGate(
  root: HTMLElement,
  variant: MotionVariant,
): () => void {
  const video = root.querySelector<HTMLVideoElement>(".stage-media video");
  if (!video) return () => undefined;

  if (variant === "reduced") {
    video.pause();
    video.currentTime = 0;
    return () => undefined;
  }

  const play = () => {
    video.play().catch(() => undefined);
  };

  /*
   * Browser tanpa IntersectionObserver tidak boleh kehilangan gerak: ia
   * kembali ke perilaku lama (langsung memutar), dan pembersihnya tetap
   * menghentikan video.
   */
  if (typeof IntersectionObserver === "undefined") {
    play();
    return () => video.pause();
  }

  let intersecting = false;

  const apply = () => {
    const hidden = typeof document === "undefined" ? false : document.hidden;
    if (shouldPlay(variant, intersecting, hidden)) play();
    else video.pause();
  };

  /*
   * Yang diamati adalah PANGGUNG scene (`.scene-stage`, tepat setinggi
   * viewport dan menjadi elemen yang di-pin), bukan `.stage-media`: kontainer
   * media ikut dibesarkan dolly kamera (`--dolly` dan `--frame-zoom`) sampai
   * ~1,7x tinggi viewport, sehingga rasio perpotongannya tidak pernah
   * mencapai 0,25 justru ketika scene sedang terpampang penuh (terukur
   * 2026-09-04: rasio 0,12 pada dataran baca Daha). Panggung tidak pernah
   * ditransformasikan dolly, jadi rasionya jujur.
   */
  const frame =
    root.querySelector<HTMLElement>(".scene-stage") ??
    video.closest<HTMLElement>(".stage-media") ??
    video;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        intersecting =
          entry.isIntersecting && entry.intersectionRatio >= PLAY_RATIO;
      }
      apply();
    },
    { threshold: [0, PLAY_RATIO] },
  );
  observer.observe(frame);

  // Tab tersembunyi tidak memutar apa pun; kembali terlihat hanya melanjutkan
  // bila scene-nya memang sedang berada di layar.
  const onVisibility = () => apply();
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    video.pause();
  };
}
