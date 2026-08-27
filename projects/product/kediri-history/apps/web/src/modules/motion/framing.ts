/**
 * Pengarahan bingkai per shot.
 *
 * Sumber kebenarannya `docs/production/01_SCENE_MANIFEST.yaml`, bidang
 * `crop_desktop`, `crop_mobile`, `object_position_desktop`, dan
 * `object_position_mobile`. Nilainya hidup di kode, bukan di CMS — sama seperti
 * timing dan easing (Technical Bible bagian 19). Editor memilih citra; kode
 * memutuskan bagaimana citra itu dibingkai.
 *
 * BATASAN KERAS: modul ini TIDAK PERNAH mengubah berkas aset. `project-images/`
 * adalah otoritas citra produksi dan tidak boleh disentuh. Seluruh crop di sini
 * adalah jendela tampilan yang dihitung ulang di peramban melalui custom
 * property, sehingga dapat direvisi, ditinjau, dan dibatalkan tanpa
 * menyentuh satu piksel pun milik aset.
 *
 * MENGAPA CROP INI ADA. Sebagian aset produksi membawa teks yang terbakar ke
 * dalam raster — tarikh, nama wilayah, dan nama tempat. Authority Rule 1
 * (`docs/production/00_IMPLEMENTATION_AUTHORITY.md`) menuntut informasi semacam
 * itu hidup sebagai DOM: hanya DOM yang dapat dibaca teknologi bantu,
 * dilokalkan, dan dikoreksi. Jendela di bawah ini mengeluarkan teks tersebut
 * dari bingkai jika geometrinya memungkinkan, lalu maknanya dikembalikan
 * sebagai lapisan DOM. Di tempat yang geometrinya tidak memungkinkan, catatan
 * pada masing-masing entri menyatakannya terus terang; crop bukan perbaikan,
 * ia pembatasan kerusakan, dan sisanya tercatat di ASSET EPISTEMIC INTEGRITY
 * pada `docs/production/05_REDO_REGISTER.md`.
 */

/** Jendela sumber dalam piksel aset asli. */
export interface SourceWindow {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SceneFraming {
  /** Dimensi aset produksi, apa adanya. */
  readonly source: { readonly width: number; readonly height: number };
  readonly desktop?: SourceWindow;
  readonly mobile?: SourceWindow;
  /** object-position untuk sisa bingkai setelah jendela diterapkan. */
  readonly objectPositionDesktop: string;
  readonly objectPositionMobile: string;
  /** Alasan pengarahan. Wajib diisi supaya crop tidak pernah tanpa argumen. */
  readonly rationale: string;
}

const SIZE_3x2 = { width: 1536, height: 1024 } as const;

/**
 * Batch A. Scene 05+ belum diarahkan: batch mereka belum dibuka, dan menebak
 * bingkai lebih awal justru mengunci keputusan yang belum ditinjau.
 */
export const SCENE_FRAMING: Readonly<Record<string, SceneFraming>> = {
  "2026-prologue": {
    source: SIZE_3x2,
    objectPositionDesktop: "50% 56%",
    objectPositionMobile: "55% 60%",
    rationale:
      "Tanpa crop. Bingkai 3:2 aslinya sudah komposisional: bentang jembatan di sepertiga bawah, pantulan di bawahnya, dan pita langit di sepertiga atas sebagai ruang negatif untuk pelat editorial. Satu-satunya aset Batch A tanpa teks terbakar.",
  },

  "879-first-mark": {
    source: SIZE_3x2,
    desktop: { x: 0, y: 0, width: 1536, height: 620 },
    mobile: { x: 0, y: 0, width: 1500, height: 620 },
    objectPositionDesktop: "50% 50%",
    objectPositionMobile: "50% 50%",
    rationale:
      "Baris tarikh terbakar menempati kotak sumber (370,645)-(1240,765), diukur dari kisi koordinat pada aset asli. Kedua jendela mengambil pita atas muka batu sehingga kotak itu keluar dari bidang pandang; tarikh kembali sebagai DOM. Pseudo-script tetap ada — ia melapisi hampir seluruh muka batu dan tidak dapat dibuang tanpa menghancurkan subjeknya. Ini pembatasan kerusakan, bukan perbaikan. REDO-ASSET-001.",
  },

  "921-kadhiri": {
    source: SIZE_3x2,
    desktop: { x: 0, y: 480, width: 1536, height: 540 },
    mobile: { x: 0, y: 480, width: 1500, height: 540 },
    objectPositionDesktop: "50% 50%",
    objectPositionMobile: "50% 50%",
    rationale:
      "Kata 'kadhiri' berhuruf Latin menempati kotak sumber (605,370)-(1065,455). Kedua jendela mengambil pita BAWAH muka batu, di bawah kata itu. Pita atas sempat dipertimbangkan dan ditolak: setelah object-fit cover memuai, kata tersebut kembali masuk bingkai — ketahuan lewat verifikasi geometris, bukan perkiraan. Pita bawah memberi apa yang memang dibutuhkan scene ini: bidang material tanpa satu pun huruf Latin, tempat KADHIRI hadir sebagai lapisan DOM yang terurai dari goresan Scene 01. REDO-ASSET-002.",
  },

  "1015-name-endures": {
    source: SIZE_3x2,
    desktop: { x: 0, y: 0, width: 860, height: 1020 },
    mobile: { x: 0, y: 0, width: 1140, height: 1020 },
    objectPositionDesktop: "50% 50%",
    objectPositionMobile: "50% 50%",
    rationale:
      "KADHIRI menempati kotak sumber (905,455)-(1085,515), di kanan tengah lempeng. Jendela mengambil bagian KIRI, sehingga namanya keluar bingkai dan tepi lempeng terpotong. Kebetulan yang menguntungkan: objek jadi terbaca sebagai bagian, bukan sebagai benda utuh di bawah pencahayaan katalog museum — dan itulah yang dituntut scene berstatus Research Hold. Statusnya sendiri hidup sebagai lapisan bukti DOM. REDO-ASSET-003.",
  },

  "1042-river-divides-kingdom": {
    source: SIZE_3x2,
    desktop: { x: 440, y: 0, width: 660, height: 980 },
    mobile: { x: 0, y: 0, width: 1500, height: 700 },
    objectPositionDesktop: "50% 50%",
    objectPositionMobile: "50% 50%",
    rationale:
      "Tiga kotak teks, diukur dari kisi: PANJALU (160,370)-(410,600), JENGGALA (1120,370)-(1395,600), BRANTAS (650,720)-(895,805). Jendela desktop menelusuri koridor sungai secara vertikal; jendela mobile mengambil pita atas berisi gunung dan hulu sungai — dua komposisi yang benar-benar berbeda, bukan satu bingkai yang diperkecil. Ketiga kotak berada di luar bidang pandang pada seluruh rasio viewport yang diuji, termasuk ultrawide. Seluruh pelabelan menjadi DOM semantik, yang sekaligus menjadikan ejaan Janggala perbaikan satu baris teks, bukan perbaikan aset, dan menjaga lapisan tradisi Mpu Bharada tetap klaim yang terpisah. REDO-ASSET-004.",
  },
};

/**
 * Kotak teks terbakar per aset, dalam koordinat sumber.
 *
 * Diukur langsung dari kisi koordinat di atas aset asli, bukan diperkirakan
 * dari pratinjau yang diperkecil — perkiraan pertama meleset pada 921 dan 1042,
 * dan kebocorannya baru ketahuan saat bingkai akhir disimulasikan.
 *
 * Nilai ini dipakai tes regresi: setiap perubahan jendela harus dibuktikan
 * tetap menjaga kotak-kotak ini di luar bidang pandang pada seluruh rasio
 * viewport yang didukung.
 */
export const BAKED_TEXT_BOXES: Readonly<
  Record<string, readonly SourceWindow[]>
> = {
  "879-first-mark": [{ x: 370, y: 645, width: 870, height: 120 }],
  "921-kadhiri": [{ x: 605, y: 370, width: 460, height: 85 }],
  "1015-name-endures": [{ x: 905, y: 455, width: 180, height: 60 }],
  "1042-river-divides-kingdom": [
    { x: 160, y: 370, width: 250, height: 230 },
    { x: 1120, y: 370, width: 275, height: 230 },
    { x: 650, y: 720, width: 245, height: 85 },
  ],
};

/**
 * Bidang pandang sumber yang benar-benar terlihat pada satu viewport.
 *
 * Menirukan persis apa yang dilakukan peramban: object-fit cover lebih dulu,
 * lalu scale dan translate dari `frameVariables`. Dipakai tes untuk
 * membuktikan teks terbakar tidak pernah kembali masuk bingkai.
 */
export function visibleSourceRect(
  framing: SceneFraming,
  window: SourceWindow | undefined,
  viewport: { readonly width: number; readonly height: number },
): { x0: number; y0: number; x1: number; y1: number } {
  const { width: W, height: H } = framing.source;
  const { width: VW, height: VH } = viewport;
  if (!window) {
    const cover = Math.max(VW / W, VH / H);
    return {
      x0: (W * cover - VW) / 2 / cover,
      y0: (H * cover - VH) / 2 / cover,
      x1: W - (W * cover - VW) / 2 / cover,
      y1: H - (H * cover - VH) / 2 / cover,
    };
  }

  const k = Math.max(W / window.width, H / window.height);
  const centreX = (window.x + window.width / 2) / W;
  const centreY = (window.y + window.height / 2) / H;
  const cover = Math.max(VW / W, VH / H);
  const contentW = W * cover;
  const contentH = H * cover;
  const tx = (0.5 - centreX) * VW;
  const ty = (0.5 - centreY) * VH;

  const invert = (
    target: number,
    content: number,
    viewSize: number,
    translate: number,
  ) =>
    ((target - viewSize / 2) / k -
      translate +
      viewSize / 2 +
      (content - viewSize) / 2) /
    cover;

  return {
    x0: invert(0, contentW, VW, tx),
    y0: invert(0, contentH, VH, ty),
    x1: invert(VW, contentW, VW, tx),
    y1: invert(VH, contentH, VH, ty),
  };
}

export function sceneFraming(slug: string | undefined): SceneFraming | undefined {
  return slug ? SCENE_FRAMING[slug] : undefined;
}

/**
 * Menerjemahkan jendela sumber menjadi custom property.
 *
 * `--frame-zoom` adalah faktor perbesaran agar lebar jendela memenuhi bingkai;
 * `--frame-x`/`--frame-y` menggeser pusat jendela ke pusat bingkai, dinyatakan
 * dalam persen ukuran elemen sendiri sehingga tetap benar pada setiap viewport.
 * Hanya transform dan custom property yang dipakai — tidak ada properti layout
 * yang dianimasikan, dan nilai ini statis, bukan bagian dari timeline.
 */
export function frameVariables(
  framing: SceneFraming,
  window: SourceWindow | undefined,
): Record<string, string> {
  if (!window) return { "--frame-zoom": "1", "--frame-x": "0%", "--frame-y": "0%" };

  const { source } = framing;
  const zoom = Math.max(
    source.width / window.width,
    source.height / window.height,
  );
  const centreX = (window.x + window.width / 2) / source.width;
  const centreY = (window.y + window.height / 2) / source.height;

  return {
    "--frame-zoom": zoom.toFixed(4),
    "--frame-x": `${((0.5 - centreX) * 100).toFixed(3)}%`,
    "--frame-y": `${((0.5 - centreY) * 100).toFixed(3)}%`,
  };
}
