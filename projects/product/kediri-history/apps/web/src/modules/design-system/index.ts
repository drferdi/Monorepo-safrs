/**
 * design-system memiliki token, tipografi, primitif tata letak, dan presentasi
 * badge evidence.
 *
 * Batas modul (keputusan Chief G03): modul ini tidak mengetahui subjek
 * historis. Ia tidak mengimpor historical-domain, content-validation, Payload,
 * atau kode basis data — komponen menerima props, bukan entitas.
 *
 * Sumber token: tokens/ (snapshot @sentra/token dengan provenance, plus
 * lapisan Kediri dari Bible 04). Itu satu-satunya tempat nilai warna dan
 * radius mentah boleh muncul; scripts/check-tokens.mjs menegakkannya dan
 * mengukur ulang kontras WCAG di setiap pasangan semantik.
 */
export * from "./components/EvidenceBadge";

/** Href stylesheet token relatif terhadap modul ini. */
export const TOKEN_STYLESHEET = "./tokens/tokens.css";
export const KEDIRI_TOKEN_STYLESHEET = "./tokens/kediri.css";
