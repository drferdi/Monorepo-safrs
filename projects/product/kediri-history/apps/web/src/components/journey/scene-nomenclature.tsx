import type { ReactElement } from "react";

/**
 * Nama sebagai lapisan DOM, bukan piksel.
 *
 * Authority Rule 1 (`docs/production/00_IMPLEMENTATION_AUTHORITY.md`): teks
 * sejarah yang membawa makna faktual, kronologis, geografis, evidensial, atau
 * epistemik tidak boleh terbakar ke dalam raster sinematik. Nama tempat dan
 * nama wilayah termasuk di dalamnya.
 *
 * Aset produksi untuk 921 dan 1042 sebelumnya memikul namanya sendiri di dalam
 * gambar. Jendela bingkai di `modules/motion/framing.ts` mengeluarkannya dari
 * bingkai; komponen inilah yang mengembalikan maknanya — kali ini sebagai teks
 * sungguhan yang dapat dibaca pembaca layar, diterjemahkan, dan dikoreksi.
 *
 * Ini BUKAN dekorasi, jadi tidak pernah `aria-hidden`, tidak pernah memakai
 * `autoAlpha`, dan hadir utuh di HTML sebelum satu baris JavaScript berjalan.
 * Tanpa motion ia tetap terbaca; dengan motion ia tiba sebagai akibat.
 *
 * Keuntungan naratifnya nyata, bukan sekadar kepatuhan. Bila KADHIRI sudah ada
 * di dalam raster, nama itu memang selalu di sana dan tidak ada peristiwa yang
 * terjadi. Ketika ia terurai dari goresan 879 saat pengunjung menggulir,
 * argumen handoff "sebuah catatan menjadi sebuah nama" berhenti menjadi klaim
 * kapsi dan menjadi sesuatu yang diperagakan antarmuka.
 */

export interface SceneName {
  /** Bentuk kanon. Ejaannya milik 08_MASTER_PRODUCTION_NARRATIVE. */
  readonly name: string;
  /** Keterangan singkat; tetap Bahasa Indonesia, bukan Inggris. */
  readonly gloss?: string;
  /**
   * Kelas epistemik lapisan. `history` untuk yang berdiri di atas catatan,
   * `tradition` untuk yang diingat lewat tradisi. Keduanya tidak boleh
   * dilebur — 04_VISUAL_ACCEPTANCE menuntut History dan Tradition tetap dapat
   * dibedakan secara visual dan teknis.
   */
  readonly epistemic: "history" | "tradition";
  /** Penempatan di dalam bingkai; komposisi milik kode. */
  readonly anchor: "west" | "east" | "river" | "centre";
}

/**
 * 1042 — geografi politik.
 *
 * Ejaan Janggala mengikuti kanon. Aset produksi mengeja "JENGGALA"; karena nama
 * kini hidup di DOM, perbedaan itu menjadi perbaikan teks satu baris dan bukan
 * lagi cacat aset yang hanya bisa diperbaiki dengan mengganti gambar. Itulah
 * seluruh alasan Rule 1 ada.
 */
const NAMES_1042: readonly SceneName[] = [
  {
    name: "Panjalu",
    gloss: "Wilayah barat",
    epistemic: "history",
    anchor: "west",
  },
  {
    name: "Janggala",
    gloss: "Wilayah timur",
    epistemic: "history",
    anchor: "east",
  },
  { name: "Brantas", epistemic: "history", anchor: "river" },
];

/** 921 — satu nama, dan seluruh scene bertumpu padanya. */
const NAMES_921: readonly SceneName[] = [
  { name: "Kadhiri", epistemic: "history", anchor: "centre" },
];

const NOMENCLATURE: Readonly<Record<string, readonly SceneName[]>> = {
  "921-kadhiri": NAMES_921,
  "1042-river-divides-kingdom": NAMES_1042,
};

export function sceneNomenclature(
  slug: string | undefined,
): readonly SceneName[] | undefined {
  return slug ? NOMENCLATURE[slug] : undefined;
}

export function SceneNomenclature({
  slug,
}: {
  readonly slug: string;
}): ReactElement | null {
  const names = sceneNomenclature(slug);
  if (!names || names.length === 0) return null;

  return (
    <div className="scene-nomenclature" data-motion="nomenclature">
      {names.map((entry) => (
        <p
          className="scene-name"
          key={entry.name}
          data-motion="scene-name"
          data-anchor={entry.anchor}
          data-epistemic={entry.epistemic}
        >
          <span className="scene-name__word">{entry.name}</span>
          {entry.gloss ? (
            <span className="scene-name__gloss">{entry.gloss}</span>
          ) : null}
        </p>
      ))}
    </div>
  );
}
