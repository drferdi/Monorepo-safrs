/**
 * Sambutan pembuka scene 879 (revisi Chief 2026-08-30) — aksara Jawa,
 * transliterasi Latin, lalu terjemahan Indonesia, tiga baris yang muncul
 * satu per satu dengan efek typing. Cuma scene "879-first-mark" yang
 * memakainya; scene lain tetap memakai `.stage-visual-label` biasa
 * ("Visualisasi artistik · pratinjau editorial").
 */

export interface OpeningAddressLine {
  readonly text: string;
  readonly lang?: string;
}

export const SCENE_OPENING_ADDRESS: readonly OpeningAddressLine[] = [
  { text: "ꦱꦸꦩꦁꦒ꧈ ꦏꦶꦠ ꦮꦶꦮꦶꦠꦶ ꦕꦫꦶꦪꦺꦴꦱꦶꦥꦸꦤ꧀ ꦏꦸꦛ ꦏꦼꦢꦶꦫꦶ꧉" },
  { text: "Sumangga, kita wiwiti cariyosipun Kutha Kediri.", lang: "jv" },
  { text: "Mari kita mulai kisah Kota Kediri.", lang: "id" },
] as const;
