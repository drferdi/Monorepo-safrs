/**
 * Naskah jeda "bukti prasasti" setelah Scene 921 (direktif Chief 2026-09-03).
 * Bukan bagian dari graf CMS/narasi scene —
 * jeda ini murni presentasi prolog, jadi teksnya hidup di sini, bukan di
 * `production-narrative.ts`.
 */

export interface InscriptionEvidence {
  readonly tag: string;
  readonly source: string;
  readonly date: string;
  readonly quote?: string;
  readonly body?: string;
}

export const INSCRIPTION_INTERLUDE_EYEBROW = "Bukti di Atas Batu";

export const INSCRIPTION_INTERLUDE_INTRO =
  "Artefak serta peninggalan sejarah membuktikan bahwa sejak abad ke-11, nama Kadiri/Kadhiri sudah tercatat jauh lebih awal dalam prasasti-prasasti Jawa Kuno.";

export const INSCRIPTION_EVIDENCE: readonly InscriptionEvidence[] = [
  {
    tag: "Bukti 01 — Penyebutan Tertua",
    source: "Prasasti Harinjing B",
    date: "843 Saka / 19 September 921 M",
    body: "Pada masa Raja Rakai Layang Dyah Tulodong dari Kerajaan Medang atau Mataram Kuno, nama Kaḍiri telah digunakan untuk menyebut sebuah wilayah. Inilah penyebutan tertua Kadhiri dalam rangkaian prasasti yang ditampilkan di halaman ini.",
  },
  {
    tag: "Bukti 02",
    source: "Prasasti Ceker",
    date: "1107 Saka / 1185 M",
    quote: "“… śrī mahārāja mantuk śīma nira ring bhūmi kaḍiri …”",
  },
  {
    tag: "Bukti 03",
    source: "Prasasti Kamulan",
    date: "1116 Saka / 1194 M",
    quote: "“… sinewita riŋ bhūmi kaḍiri …”",
  },
  {
    tag: "Bukti 04",
    source: "Prasasti Mula Malurung",
    date: "1255 M",
    quote: "“… sinewita niŋ bhūmi kaḍiri …”",
  },
] as const;

export const INSCRIPTION_INTERLUDE_OUTRO =
  "Nama itu bertahan. Kisahnya berlanjut.";
