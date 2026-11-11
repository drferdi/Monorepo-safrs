import type { ReactElement } from "react";

/**
 * Penanda kelas bukti.
 *
 * Batas modul: komponen ini tidak tahu apa pun tentang sejarah Kediri. Ia
 * menerima label dan simbol sebagai props; pemetaan dari kelas evidence ke
 * label dilakukan kode aplikasi (keputusan Chief G03).
 *
 * Urutannya bentuk, lalu label, lalu warna (Bible 04 bagian 20). Simbolnya
 * bersifat dekoratif bagi pembaca layar karena labelnya sudah menyampaikan
 * seluruh makna — tidak ada informasi yang dibawa warna atau bentuk saja.
 */
export interface EvidenceBadgeProps {
  readonly label: string;
  readonly symbol: string;
}

export function EvidenceBadge({
  label,
  symbol,
}: EvidenceBadgeProps): ReactElement {
  return (
    <span className="evidence-badge">
      <span className="symbol" aria-hidden="true">
        {symbol}
      </span>
      {label}
    </span>
  );
}
