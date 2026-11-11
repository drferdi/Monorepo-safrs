import { strengthOf } from './tatalaksana';

import type { AturanPakaiText } from '@/types/api';

/**
 * The dose and signa a picked Puskesmas medicine starts with (Chief, 2026-09-29: "dosis minimal dan
 * standard sesudah/ sebelum makan atau signa lain", after "Cari dulu referensi"). A prefill the
 * doctor edits, never a prescription of its own.
 *
 * - The dose is the lowest standard adult regimen the references give that the chosen item makes
 *   in whole units, written "NxM" (the RME signa reads only that: "1x12.5mg" would become 1x12).
 * - The signa is the references' relation to meals; where they say "independent of food" or say
 *   nothing, "Sesudah makan" is the prescribing convention and is marked so below.
 * - A rule fires only for the strengths its reference covers; injections, infusions, vaccines,
 *   programme regimens (TB, HIV, KB) and specialist-titrated psychiatric drugs get nothing, and
 *   syrups get the signa only (their dose follows the child's weight).
 * - Eye, ear and skin preparations are written as the prescription templates write them
 *   ("6x1 tetes", "2x aplikasi") with "Pemakaian luar".
 *
 * Sources (fetched 2026-09-29; pionas.pom.go.id answered 503, its monographs were read from the
 * Wayback Machine): PIONAS BPOM monographs; PPK dokter Fasyankes Primer (KMK
 * HK.01.07/MENKES/1186/2022); Pedoman Pengobatan Dasar di Puskesmas 2007; BPOM-approved labels
 * (registrasiobat.pom.go.id); FDA DailyMed and EMC SmPC only for meal timing the Indonesian
 * sources leave open. "konvensi" = the sources leave meal timing open.
 */
export interface StandardDose {
  dosis: string;
  aturan_pakai: AturanPakaiText;
  /** Only for a single dose, so the RME does not count a daily supply. */
  durasi?: string;
}

type Rule = { match: RegExp; strengths?: number[] } & StandardDose;

const NONE: RegExp = /injeksi|\binj\b|infus|vaksin|tuberculin|aquabidest|bkkbn|\bkb\b|oat\b|bedaquiline|linezolid|moxif|clofazimine|cycloserine|pretomanid|rifap|rifampisin|isoniazid|ethambutol|dolutegra|tenofo|zidofu|nevirapine|kombipak|haloperidol|klorpromazin|risperidon|trifluoperazin|karbamazepin|triheksifenidil|diazepam/i;

const RULES: Rule[] = [
  // Eye and ear: PPK 2022 kloramfenikol tetes mata 1 tetes 6 x sehari, salep mata 3 x sehari;
  // DailyMed gentamisin tetes 1 tetes tiap 4 jam, salep 2-3 x sehari; PIONAS kloramfenikol tetes
  // telinga 2-3 tetes 2-3 x sehari. Fenol gliserol: PPK gives only "3 hari", so nothing.
  { match: /tetes mata/i, dosis: '6x1 tetes', aturan_pakai: 'Pemakaian luar' },
  { match: /salep mata/i, dosis: '3x aplikasi', aturan_pakai: 'Pemakaian luar' },
  { match: /kloramfenikol tetes telinga/i, dosis: '2x2 tetes', aturan_pakai: 'Pemakaian luar' },
  // PIONAS / PPK 2022 skabies: permetrin sekali oles seluruh tubuh, bilas setelah 8-24 jam.
  { match: /permetrin/i, dosis: '1x aplikasi', aturan_pakai: 'Pemakaian luar', durasi: '1 hari' },
  // PIONAS: betametason, hidrokortison "dioleskan tipis 1-2 kali sehari"; mikonazol 2 x sehari;
  // ketokonazol krim 1-2 x sehari. Written like the prescription templates ("2x aplikasi").
  { match: /betametason krim|hidrokortison krim|ketokonazol krim/i, dosis: '1x aplikasi', aturan_pakai: 'Pemakaian luar' },
  { match: /mikonazol krim/i, dosis: '2x aplikasi', aturan_pakai: 'Pemakaian luar' },

  // Syrups and drops by mouth: weight-based dose, signa only (antacid: IONI, between meals).
  { match: /antasida.*suspensi/i, dosis: '', aturan_pakai: 'Sebelum makan' },
  { match: /sirup|suspensi|\bdrops?\b/i, dosis: '', aturan_pakai: 'Sesudah makan' },

  // PIONAS alopurinol: "satu kali sehari setelah makan", dosis awal 100 mg.
  { match: /alopurinol/i, strengths: [100, 300], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022 ansietas-depresi 1 x 12,5-50 mg; menjelang tidur; makan: konvensi.
  { match: /amitriptilin/i, strengths: [25], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS: dosis awal 5 mg sekali sehari, maks 10 mg; FDA: with or without food (konvensi).
  { match: /amlodip/i, strengths: [5, 10], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022 (OMA, faringitis) 3 x 500 mg; FDA "at the start of a meal", EMC food-independent.
  { match: /amoksisilin/i, strengths: [500], dosis: '3x1', aturan_pakai: 'Sesudah makan' },
  // Pedoman 2007 3 x 1 tab; IONI: "diantara waktu makan dan sebelum tidur" (closest: sebelum makan).
  { match: /antasida/i, dosis: '3x1', aturan_pakai: 'Sebelum makan' },
  // PIONAS profilaksis 25-75 mg/hari; makan: konvensi.
  { match: /asam askorbat|vitamin c/i, strengths: [50], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
  // Pedoman 2007: 0,5-1 mg/hari; makan: konvensi.
  { match: /asam folat|asan folat/i, strengths: [1], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS: "500 mg 3 kali sehari sebaiknya setelah makan".
  { match: /asam mefenamat/i, strengths: [500], dosis: '3x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022 / Pedoman 2007 herpes simpleks 5 x 200-400 mg; FDA food-independent (konvensi).
  { match: /asiklovir/i, strengths: [400], dosis: '5x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022 gastroenteritis: atapulgit 4 x 2 tablet, tiap BAB encer; lowest: the prescription template's 3 x 2.
  { match: /attapulgite|atapulgit/i, strengths: [600], dosis: '3x2', aturan_pakai: 'Jika diperlukan' },
  // Label BPOM Merislon (mesilat): 6-12 mg 3 x sehari "sesudah makan".
  { match: /betahistin/i, strengths: [6], dosis: '3x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS: 5-10 mg malam hari (tablet), 10 mg pagi hari (supositoria).
  { match: /bisakodil/i, strengths: [5, 10], dosis: '1x1', aturan_pakai: 'Jika diperlukan' },
  // PPK 2022 2,5-5 mg/24 jam; PIONAS "sebelum atau sesudah makan" (konvensi).
  { match: /bisoprolol/i, strengths: [2.5], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS 12,5-25 mg 2 x sehari (12,5 is half a tablet); FDA "one hour before meals".
  { match: /kaptopril|captopril/i, strengths: [25], dosis: '2x1', aturan_pakai: 'Sebelum makan' },
  // PIONAS 0,5-1 g 2 x sehari; FDA "without regard to meals" (konvensi).
  { match: /sefadroksil|cefadroxil/i, strengths: [500], dosis: '2x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022: 2 x 500 mg; FDA with or without food (konvensi).
  { match: /siprofloksasin|ciprofloxacin/i, strengths: [500], dosis: '2x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022: 3 x 4 mg; makan: konvensi.
  { match: /klorfeniramin|\bctm\b/i, strengths: [4], dosis: '3x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS 50-100 mg 2-3 x sehari; Label BPOM Dramamine: makan dulu.
  { match: /dimenhidrinat/i, strengths: [50], dosis: '2x1', aturan_pakai: 'Sesudah makan' },
  // Label BPOM Motilium: 10 mg 3 x sehari, 15-30 menit sebelum makan.
  { match: /domperidon/i, strengths: [10], dosis: '3x1', aturan_pakai: 'Sebelum makan' },
  // PPK 2022 / Pedoman 2007: 2 x 100 mg; PIONAS "bersama dengan makanan".
  { match: /doksisiklin/i, strengths: [100], dosis: '2x1', aturan_pakai: 'Saat makan' },
  // PIONAS / PPK 2022: kandidiasis vagina 150 mg dosis tunggal; EMC food-independent (konvensi).
  { match: /flukonazol/i, strengths: [150], dosis: '1x1', aturan_pakai: 'Sesudah makan', durasi: '1 hari' },
  // PIONAS / Label BPOM Amaryl: mulai 1 mg, "sebelum atau suapan pertama makan".
  { match: /glimepirid/i, strengths: [1, 2, 4], dosis: '1x1', aturan_pakai: 'Sebelum makan' },
  // PIONAS 12,5-25 mg sekali sehari (12,5 is half a tablet); pagi hari; makan: konvensi.
  { match: /hidroklortiazid|\bhct\b/i, strengths: [25], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
  // EMC Buscopan: mulai 1 tablet 3 x sehari (Label BPOM 4 x 10-20 mg); makan: konvensi.
  { match: /hiosin/i, dosis: '3x1', aturan_pakai: 'Sesudah makan' },
  // Pedoman 2007: 400 mg 3 x sehari, "sesudah makan".
  { match: /ibuprofen/i, strengths: [400], dosis: '3x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022: ISDN 5-10 mg sublingual, maks 3 kali, saat serangan.
  { match: /isosorbid/i, strengths: [5], dosis: '1x1', aturan_pakai: 'Jika diperlukan' },
  // Label produsen generik: dewasa 3 x 1 tablet (PIONAS gives no fixed dose); makan: konvensi.
  { match: /kalsium laktat/i, strengths: [500], dosis: '3x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS: 200 mg/hari bersama makanan.
  { match: /ketokonazol tablet/i, strengths: [200], dosis: '1x1', aturan_pakai: 'Saat makan' },
  // PPK 2022 4 x 150 mg; Pedoman 2007 vaginosis 2 x 300 mg; EMC food-independent (konvensi).
  { match: /klindamisin/i, strengths: [150], dosis: '4x1', aturan_pakai: 'Sesudah makan' },
  { match: /klindamisin/i, strengths: [300], dosis: '2x1', aturan_pakai: 'Sesudah makan' },
  // Pedoman 2007 / PPK 2022 tifoid: 4 x 500 mg; makan: konvensi.
  { match: /kloramfenikol/i, strengths: [250], dosis: '4x2', aturan_pakai: 'Sesudah makan' },
  // PPK 2022 antitusif: 10 mg 3 x sehari; EMC regardless of food (konvensi).
  { match: /kodein/i, strengths: [10], dosis: '3x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022 / Pedoman 2007: 2 x 960 mg; EMC "with some food or drink".
  { match: /kotrimoksazol forte/i, dosis: '2x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS hipertensi: dosis awal 10 mg sehari (5 mg: lansia, ginjal); EMC food-independent (konvensi).
  { match: /lisinopril/i, strengths: [5, 10], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022: loratadin 1 x 10 mg; EMC without regard to mealtime (konvensi).
  { match: /loratadin/i, strengths: [10], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS: dosis awal 500 mg setelah sarapan, sekurang-kurangnya 1 minggu.
  { match: /metformin/i, strengths: [500], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022 askariasis / Pedoman 2007: 400 mg dosis tunggal; FDA "with food".
  { match: /albendazol/i, strengths: [400], dosis: '1x1', aturan_pakai: 'Saat makan', durasi: '1 hari' },
  // PPK 2022 hipertensi pada kehamilan 2 x 250-500 mg; PIONAS 250 mg 2-3 x sehari; makan: konvensi.
  { match: /metildopa/i, strengths: [250], dosis: '2x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022 vaginosis bakterialis 2 x 500 mg (amebiasis 3 x 500 mg); EMC "during or after meals".
  { match: /metronidazol/i, strengths: [500], dosis: '2x1', aturan_pakai: 'Sesudah makan' },
  // EMC 200 mg 3 x sehari (PIONAS and PPK give no oral dose); with or without food (konvensi).
  { match: /asetilsistein/i, strengths: [200], dosis: '3x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS 75-150 mg/hari dalam 2-3 dosis "sebaiknya setelah makan"; 75 mg is not whole 50 mg tablets.
  { match: /diklofenak/i, strengths: [50], dosis: '2x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022: omeprazol 1 x 20 mg; DailyMed "before meals".
  { match: /omeprazol/i, strengths: [20], dosis: '1x1', aturan_pakai: 'Sebelum makan' },
  // PPK 2022 3-4 x 500-1000 mg; makan: the reasoner's template (sources silent).
  { match: /parasetamol|paracetamol/i, strengths: [500], dosis: '3x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS piridoksin: profilaksis 10 mg tiap hari; defisiensi 20-50 mg; makan: konvensi.
  { match: /piridoksin|vitamin b6/i, strengths: [10, 50], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
  // PPK 2022 2-3 x 5 mg (PIONAS: 10-20 mg sekali pagi); PIONAS "setelah sarapan".
  { match: /prednison/i, strengths: [5], dosis: '2x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS / PPK 2022: 150 mg 2 x sehari; DailyMed food-independent (konvensi).
  { match: /ranitidin/i, strengths: [150], dosis: '2x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS: dosis awal 2 mg 3-4 x sehari (lansia, pasien sensitif); makan: konvensi.
  { match: /salbutamol tablet/i, strengths: [2], dosis: '3x1', aturan_pakai: 'Sesudah makan' },
  // PIONAS: "10 mg/hari pada malam hari bersama makanan".
  { match: /setirizin/i, strengths: [10], dosis: '1x1', aturan_pakai: 'Saat makan' },
  // PIONAS: PJK awalnya 20 mg sekali sehari malam hari (10 mg is half a tablet); makan: konvensi.
  { match: /simvastatin/i, strengths: [20], dosis: '1x1', aturan_pakai: 'Sesudah makan' },
];

/** The standard start for a stock medicine, or null when the references give none for it. */
export function standardDoseFor(name: string): StandardDose | null {
  if (NONE.test(name)) return null;
  const strength = strengthOf(name)?.value ?? null;
  const rule = RULES.find(
    (candidate) => candidate.match.test(name) && (!candidate.strengths || (strength !== null && candidate.strengths.includes(strength)))
  );
  if (!rule) return null;
  const { dosis, aturan_pakai, durasi } = rule;
  return durasi ? { dosis, aturan_pakai, durasi } : { dosis, aturan_pakai };
}
