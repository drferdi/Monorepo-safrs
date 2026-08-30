/**
 * Tiket ringkas tonggak sejarah Kediri (revisi Chief 2026-08-30) — teaser
 * bergantian di kepala Act I, sebelum pembaca menggulir ke scene pertama.
 * Bukan bagian dari graf CMS/narasi scene; rentang tanggalnya sengaja
 * melintasi seluruh Journey (879–2026), bukan hanya Act I.
 */

export interface JourneyMilestone {
  readonly year: string;
  readonly text: string;
}

export const JOURNEY_MILESTONES: readonly JourneyMilestone[] = [
  { year: "1042", text: "Daha menjadi pusat Panjalu." },
  {
    year: "1135",
    text: "Jayabhaya membawa Panjalu menuju kejayaan: Panjalu Jayati.",
  },
  {
    year: "1157",
    text: "Kakawin Bharatayuddha lahir pada masa keemasan sastra Jawa Kuno.",
  },
  {
    year: "1869",
    text: "Kediri memiliki jembatan berkonstruksi besi pertama di Pulau Jawa.",
  },
  { year: "1906", text: "Kediri menjadi Gemeente." },
  { year: "1950", text: "Lahir Kota Kediri dalam Republik Indonesia." },
  {
    year: "2024",
    text: "Dhoho membuka hubungan udara baru bagi kawasan Kediri.",
  },
] as const;
