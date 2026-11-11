import type { ReactElement } from "react";

import { BridgeGeometry } from "./bridge-geometry";

/**
 * Kanvas Historis — lapisan pertama Scene Contract (UX Bible bagian 6).
 *
 * Lapisan ini sebelumnya tidak ada, dan ketiadaannya yang membuat Journey
 * terbaca sebagai teks yang bergerak alih-alih sebuah pengalaman. Kanvas
 * memberi scene tubuh: permukaan, kedalaman, dan komposisi.
 *
 * Aturan yang mengikat isinya:
 *
 *   1. Ia BUKAN bukti. Tidak ada satu bentuk pun di sini yang boleh dibaca
 *      sebagai dokumen. Semuanya abstrak dan memakai bahasa material, bukan
 *      bahasa foto arsip.
 *   2. Ia tidak pernah mengarang sejarah. Tidak ada aksara rekaan, tidak ada
 *      situs galian palsu, tidak ada wajah.
 *   3. Ia tidak memikul makna faktual eksklusif — seluruh maknanya sudah ada
 *      dalam teks, jadi bagi pembaca layar kanvas ini tidak ada.
 *   4. Perlakuannya dipilih CMS lewat `visualVariant`; komposisinya milik kode
 *      (Technical Bible bagian 19 dan 20).
 *
 * Warnanya tidak pernah ditulis di sini: seluruhnya mewarisi peran --cinema-*
 * yang ditimpa lapisan era, sehingga kanvas yang sama berganti abad bersama
 * act-nya tanpa satu baris pun berubah.
 */
/**
 * Kontur material. Garisnya organik dan tidak berulang seperti kertas tulis:
 * ini permukaan logam yang membesar, bukan latar dekoratif.
 */
const CONTOURS = [
  "M-90 92 C180 18 392 154 648 82 C910 8 1184 134 1690 42",
  "M-120 184 C126 122 348 220 592 168 C884 106 1148 210 1690 132",
  "M-80 278 C208 198 420 330 704 246 C970 168 1244 302 1680 214",
  "M-110 382 C168 298 430 426 690 354 C948 282 1230 414 1690 318",
  "M-70 486 C198 414 444 540 722 458 C1012 374 1280 514 1690 426",
  "M-130 598 C120 512 398 644 676 566 C976 480 1256 626 1700 524",
  "M-90 708 C182 626 422 756 716 674 C1026 586 1294 734 1690 638",
  "M-120 820 C156 732 430 866 730 782 C1040 692 1302 838 1700 752",
] as const;

/** Goresan material acak. Ia sengaja tidak membentuk aksara atau pola tulisan. */
const SCORES = [
  "M252 102 C280 218 238 318 286 438",
  "M518 32 C476 178 552 294 506 426",
  "M842 166 C786 286 862 392 824 548",
  "M1094 54 C1044 224 1130 342 1078 486",
  "M1376 218 C1326 350 1404 476 1350 622",
  "M628 534 C590 646 654 746 610 876",
  "M1182 568 C1128 676 1204 786 1162 920",
] as const;

/**
 * Lubang dan pori permukaan. Posisinya ditulis tetap, bukan diacak: keluaran
 * yang sama di server dan klien adalah syarat render server-first.
 */
const PITS: readonly (readonly [number, number, number])[] = [
  [180, 128, 3],
  [420, 92, 2],
  [640, 176, 4],
  [880, 118, 2],
  [1120, 210, 3],
  [1380, 148, 2],
  [240, 330, 2],
  [520, 396, 3],
  [760, 342, 2],
  [1020, 428, 4],
  [1300, 372, 2],
  [1480, 456, 3],
  [160, 560, 3],
  [430, 622, 2],
  [700, 578, 4],
  [960, 664, 2],
  [1220, 610, 3],
  [1450, 698, 2],
  [300, 790, 2],
  [620, 836, 3],
  [900, 782, 2],
  [1180, 848, 4],
  [1400, 806, 2],
];

/** Garis tulis permukaan arsip. Garisnya saja — tidak pernah hurufnya. */
const RULES = [200, 252, 304, 356, 408, 460];

export function SceneCanvas({
  variant,
  choreographyKey,
}: {
  readonly variant?: string;
  readonly choreographyKey?: string;
}): ReactElement | null {
  // Struktur punya geometri rekayasanya sendiri, yang sudah teruji.
  if (
    choreographyKey === "bridgeConstruction" ||
    choreographyKey === "bridgeLift"
  ) {
    return <BridgeGeometry />;
  }

  return CANVASES[variant ?? ""] ?? null;
}

/**
 * Permukaan makro — subjek bidikan 879, bukan hiasan di belakang teks.
 *
 * Bible 02 Scene 01 menuliskan bidikannya harfiah: "Near-black void. Macro
 * material surface. Raking light reveals inscription texture."
 *
 * Karena itu bentuk di sini adalah TEKSTUR, dilihat sangat dekat, memenuhi
 * bingkai: lapisan strata, butiran, dan dua retakan. Ia tidak terlihat sampai
 * cahaya menyapunya — penyingkapan itu dikerjakan mask di CSS yang dijalankan
 * timeline, karena yang bergerak memang cahayanya, bukan materialnya.
 *
 * Tidak ada satu pun glyph. Menganimasikan aksara berarti mengaku tahu urutan
 * goresannya, dan kita tidak tahu.
 */
const material = (
  <svg
    viewBox="0 0 1600 900"
    role="presentation"
    aria-hidden="true"
    focusable="false"
    preserveAspectRatio="xMidYMid slice"
  >
    <title>Permukaan material makro</title>
    <rect className="material-base" x="0" y="0" width="1600" height="900" />
    <g className="material-fields">
      <ellipse cx="330" cy="264" rx="380" ry="240" />
      <ellipse cx="1110" cy="418" rx="510" ry="310" />
      <ellipse cx="690" cy="820" rx="450" ry="210" />
    </g>
    <g className="grain-strata">
      {CONTOURS.map((path) => (
        <path key={path} d={path} />
      ))}
    </g>
    <g className="material-scores">
      {SCORES.map((path) => (
        <path key={path} d={path} />
      ))}
    </g>
    <g className="grain-pits">
      {PITS.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
      ))}
    </g>
    <g className="grain-fracture">
      <path d="M94 -20 C176 184 92 350 168 542 C212 654 152 772 244 928" />
      <path d="M1510 -20 C1414 168 1492 318 1408 482 C1344 608 1428 760 1328 928" />
    </g>
  </svg>
);

/**
 * Bidang dan cakrawala.
 *
 * Untuk geografi dan pembagian wilayah: satu garis air yang tetap, dan bidang
 * yang bergeser di kedua sisinya.
 */
const landscape = (
  <svg
    viewBox="0 0 1200 675"
    role="presentation"
    aria-hidden="true"
    focusable="false"
    preserveAspectRatio="xMidYMid slice"
  >
    <title>Bidang lanskap dengan sungai sebagai konstanta</title>
    <g className="canvas-terrain">
      <path d="M0 470 L300 402 L620 452 L900 386 L1200 440" data-motion-draw />
      <path d="M0 542 L280 496 L640 534 L940 480 L1200 522" data-motion-draw />
    </g>
    <line
      className="canvas-river"
      x1="0"
      y1="596"
      x2="1200"
      y2="596"
      data-motion-draw
    />
  </svg>
);

/**
 * Satu kata sebagai objek arsitektural.
 *
 * Bentuknya sengaja kosong: kata yang dimaksud adalah judul scene di HTML,
 * bukan teks kedua di dalam gambar. Yang digambar hanyalah ruang tempat kata
 * itu berdiri — kolom, dasar, dan sumbu simetri.
 */
const word = (
  <svg
    viewBox="0 0 1200 675"
    role="presentation"
    aria-hidden="true"
    focusable="false"
    preserveAspectRatio="xMidYMid slice"
  >
    <title>Ruang arsitektural tempat sebuah kata berdiri</title>
    <g className="canvas-columns">
      <line x1="300" y1="120" x2="300" y2="560" data-motion-draw />
      <line x1="900" y1="120" x2="900" y2="560" data-motion-draw />
      <line x1="600" y1="80" x2="600" y2="600" data-motion-draw />
    </g>
    <line
      className="canvas-base"
      x1="180"
      y1="560"
      x2="1020"
      y2="560"
      data-motion-draw
    />
  </svg>
);

/** Permukaan arsip: bidang kertas dan garis tulis, tanpa satu pun huruf. */
const documentSurface = (
  <svg
    viewBox="0 0 1200 675"
    role="presentation"
    aria-hidden="true"
    focusable="false"
    preserveAspectRatio="xMidYMid slice"
  >
    <title>Permukaan arsip</title>
    <g className="canvas-ruling">
      {RULES.map((y) => (
        <line key={y} x1="220" y1={y} x2="980" y2={y} data-motion-draw />
      ))}
    </g>
  </svg>
);

/** Struktur abstrak untuk industri dan infrastruktur non-jembatan. */
const structure = (
  <svg
    viewBox="0 0 1200 675"
    role="presentation"
    aria-hidden="true"
    focusable="false"
    preserveAspectRatio="xMidYMid slice"
  >
    <title>Bidang struktur dan jaringan</title>
    <g className="canvas-structure">
      <path
        d="M120 560 L120 360 L320 360 L320 250 L520 250 L520 410 L760 410 L760 190 L980 190 L980 560"
        data-motion-draw
      />
      <line x1="70" y1="560" x2="1080" y2="560" data-motion-draw />
      <line x1="220" y1="360" x2="220" y2="560" data-motion-draw />
      <line x1="420" y1="250" x2="420" y2="560" data-motion-draw />
      <line x1="640" y1="410" x2="640" y2="560" data-motion-draw />
      <line x1="870" y1="190" x2="870" y2="560" data-motion-draw />
    </g>
  </svg>
);

const CANVASES: Record<string, ReactElement> = {
  material,
  landscape,
  word,
  document: documentSurface,
  structure,
};
