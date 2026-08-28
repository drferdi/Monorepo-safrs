import { ScrollSmoother } from "./gsap";

/**
 * ScrollSmoother sebagai singleton ber-refcount.
 *
 * Satu halaman hanya boleh punya satu smoother, tetapi pemasangnya adalah
 * island motion per scene yang dibongkar-pasang `gsap.matchMedia`. Maka
 * pemilikannya dihitung: island pertama yang butuh menciptakannya, island
 * terakhir yang pergi mematikannya. Ini juga menjamin URUTAN — smoother sudah
 * ada sebelum ScrollTrigger scene mana pun dibuat, sehingga keputusan
 * pin-vs-sticky diambil sekali dan konsisten.
 *
 * Degradasi disengaja: bila markup #smooth-wrapper tidak ada (rute selain
 * Journey) atau pembuatan gagal, halaman berjalan dengan scroll native dan
 * CSS sticky — bukan halaman rusak. Atribut `data-smooth` pada <html> adalah
 * saklar yang dibaca CSS untuk menonaktifkan sticky ketika pin ScrollTrigger
 * mengambil alih.
 */
let smoother: ScrollSmoother | null = null;
let refCount = 0;

export function ensureSmoother(): ScrollSmoother | null {
  if (typeof window === "undefined") return null;
  refCount += 1;
  if (smoother) return smoother;

  const wrapper = document.getElementById("smooth-wrapper");
  const content = document.getElementById("smooth-content");
  if (!wrapper || !content) return null;

  try {
    smoother = ScrollSmoother.create({
      wrapper,
      content,
      smooth: 1.1,
      effects: false,
      normalizeScroll: false,
    });
    document.documentElement.dataset.smooth = "true";
  } catch {
    // Scroll native adalah keadaan gagal yang benar, bukan error halaman.
    smoother = null;
  }
  return smoother;
}

export function releaseSmoother(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && smoother) {
    smoother.kill();
    smoother = null;
    delete document.documentElement.dataset.smooth;
  }
}
