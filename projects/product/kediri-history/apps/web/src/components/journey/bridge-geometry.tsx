import type { ReactElement } from "react";

/**
 * Geometri rekayasa untuk scene 1869.
 *
 * Ini gambar garis abstrak, BUKAN bukti. Ia sengaja tidak menyerupai foto
 * dokumenter dan tidak membawa klaim tentang detail rancangan jembatan yang
 * sebenarnya — itu menunggu materi arsip yang belum diperoleh (Visual Evidence
 * Bible bagian 9 dan 17).
 *
 * Yang disampaikannya adalah satu gagasan historis: sungai berhenti menjadi
 * halangan dan menjadi soal rekayasa. Garis-garisnya menggambar dirinya dari
 * logika struktur — kabel penopang lebih dulu, lalu dek, lalu pilar — sehingga
 * urutannya sendiri menjelaskan bagaimana beban disalurkan.
 *
 * Bagi pembaca layar ia tidak ada: seluruh maknanya sudah ada dalam teks.
 */
export function BridgeGeometry(): ReactElement {
  return (
    <svg
      className="bridge-geometry"
      viewBox="0 0 720 200"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <title>Geometri struktur jembatan</title>
      {/* garis air: konstanta yang tidak pernah hilang dari cerita ini */}
      <line
        x1="0"
        y1="168"
        x2="720"
        y2="168"
        className="bridge-water"
        data-motion-draw
      />
      {/* rangka penopang */}
      <path
        d="M40 140 L180 60 L320 140 L460 60 L600 140 L680 140"
        className="bridge-truss"
        data-motion-draw
      />
      <path
        d="M40 140 L180 140 L320 140 L460 140 L600 140"
        className="bridge-truss"
        data-motion-draw
      />
      {/* dek: garis yang akhirnya dilalui orang */}
      <line
        x1="24"
        y1="140"
        x2="696"
        y2="140"
        className="bridge-deck"
        data-motion-draw
      />
      {/* pilar yang menyalurkan beban ke dasar sungai */}
      <line
        x1="180"
        y1="140"
        x2="180"
        y2="184"
        className="bridge-pier"
        data-motion-draw
      />
      <line
        x1="460"
        y1="140"
        x2="460"
        y2="184"
        className="bridge-pier"
        data-motion-draw
      />
    </svg>
  );
}
