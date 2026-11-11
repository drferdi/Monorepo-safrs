# Normal physical-exam templates by patient demographics (design)

Status: approved by Gaffer, 2026-10-21 Asia/Jakarta; every decision D1-D10 is settled (section 2). Implemented, not yet committed, on
`feat/puskesmas-flow` (section 13).

Language: prose in English (`.agents/knowledge/07_DOCUMENTATION.md`); template text in Bahasa Indonesia because it is
clinical copy that lands in the record. Template text uses ASCII signs as doctors type them: `(-/-)`, `(+/+)`.

## 1. Why

Gaffer, 2026-10-21: an experienced doctor writes only the abnormal findings and leaves the rest blank, assuming the
reader knows the rest is normal. That is not accurate, and "Regulasi mengharuskan semua bidang terisi". So "sistem harus
menghitung nilai normal secara otomatis ketika dokter tidak mengisi". Also: "We don't need to overcomplicate or
overengineer this."

The feature: the doctor records abnormal findings only; every other routine line of the physical exam (status
generalis) is filled from a reviewed normal template chosen by the patient's age, sex, pregnancy and postpartum period.
Normal values differ by group (a child's lungs, a pregnant abdomen), so one template is not enough.

## 2. Decisions already made (Gaffer, 2026-10-21)

1. The doctor enters abnormal findings only; the system fills the remaining routine lines as normal.
2. Every exam field ends up filled.
3. The existing review flow (Draf → Ditinjau → Final) is the doctor's attestation of the filled draft; no extra click.
4. Consequence: the label `missingField` ("Belum tersedia — lengkapi dan verifikasi oleh klinisi") no longer applies to
   template exam lines. It still applies to everything else (complaint, history, assessment, plan).
5. Groups requested: child vs adult, pregnant vs not pregnant, adult female vs adult male.
6. Inputs come from the typed text (D3, option a): labelled lines such as "Usia: 28", "Hamil: 32 minggu",
   "TFU: 30 cm", "DJJ: 142", and the saved patient. A "Hamil" chip in the completeness guide inserts "Hamil: ", and the
   SOAP view's row O shows what was read. The case strip keeps its design and no new field is persisted.
7. The marker (D10, option a): `[otomatis normal]` stays in the stored text. The card, Salin, Salin ringkas, Unduh, the
   export and the P-Care copies hide it once the status is Ditinjau or Final, and show it again if the draft returns to
   Draf. The revision history keeps the marked text. The record is the text as output after Final.
8. Approved as recommended: D1 (three fill policies), D2 (the "Tidak diperiksa" defaults), D4 (nifas as a fifth group),
   D5 (age in months for infants), D7 (lansia templates and laboratory ranges stay out of scope) and D9
   (`src/lib/normal-exam.ts`).
9. References found at Gaffer's request ("Find reference untuk melengkapi"):
   - D8, the regulation: UU 17/2023 tentang Kesehatan, Pasal 296 ayat (3): the medical record "harus segera dilengkapi
     setelah Pasien selesai menerima Pelayanan Kesehatan", and ayat (4): every entry carries the clinician's name, time
     and signature. Permenkes 24/2022 tentang Rekam Medis, Pasal 16 ayat (2): recording "harus lengkap, jelas"; its list
     of record contents includes "hasil pemeriksaan fisik dan penunjang". Neither prescribes line-by-line normal values;
     the template is how Sentrapedia meets the completeness duty.
   - D6, IMT: the WHO Asia-Pacific classification of KMK HK.01.07/MENKES/509/2025 (PNPK Tata Laksana Obesitas Dewasa),
     Tabel 3.1: kurang < 18,5; normal 18,5-22,9; BB lebih 23-24,9; obesitas I 25-29,9; obesitas II >= 30. Waist,
     Tabel 3.2: > 90 cm (L), > 80 cm (P). It is the newest national clinical guideline; the older Kemenkes 25/27
     cut-offs (Permenkes 41/2014, gizi seimbang) are a public-health classification.

## 3. Scope

In scope:
- The template table (section 6) for the requested groups plus nifas (D4), with one fill policy per line.
- Reference ranges used only to flag typed values (section 7), and unit rules (section 8).
- How a draft's exam section is assembled from the doctor's entries and the template (section 9).
- First consumer: the local `clinic` (SOAP) draft's "Pemeriksaan Fisik" section and the composer's SOAP view (row O).
- Bahasa Indonesia drafts only. A draft set to English keeps today's "Examination" section with its placeholder (my
  call: P-Care and the Puskesmas record are Indonesian; the regulation gap for English drafts is noted in section 14).

Non-goals:
- Templates for disease-specific states (e.g. a known heart failure patient). Gaffer's prompt excludes them.
- Laboratory reference ranges (Hb, haematocrit and other sex-dependent lab values). Listed as a follow-up.
- Elderly-specific (lansia) templates; adults ≥ 60 use the adult template.
- AI suggestion chips for abnormal findings (the brainstorm of 2026-10-21). This design only consumes what they would write.
- AADI analysis reports (part "4. Pemeriksaan fisik"), raw data, the TheOracle catalogue, any database or migration.

## 4. Fill policies (D1, approved)

Each template line has exactly one policy:

| Policy | When the doctor wrote nothing for the line | Used for |
|---|---|---|
| `normal` | The template's normal text, marked `[otomatis normal]` (hidden in every output once reviewed, decision 2.7) | Routine qualitative exam lines |
| `measure` | `belum diukur` (a filled field; no number is ever generated) | Vital signs, anthropometry, TFU, DJJ, Leopold, fontanelle, uterine contraction, lochia, perineum |
| `notExamined` | `Tidak diperiksa` | Non-routine and intimate examinations |

Rules that keep the record honest while meeting the "every field filled" requirement:
- A measurement is never invented. "TD 120/80" written by the system would be a reading that never happened;
  "belum diukur" fills the field truthfully. Derived values are allowed only from typed inputs (IMT from typed BB and TB).
- Normal text asserts the absence of abnormal signs, never the presence of a variable physiological sign. "Supel, nyeri
  tekan (-)" is allowed; "datar", "linea nigra (+)" or "tonsil T1-T1" are not, because they vary between healthy people.
- Genitalia, anus/rectum, internal (vaginal) examination, full neurological status and, outside pregnancy and nifas,
  the breast default to "Tidak diperiksa" (D2, approved).

## 5. Demographic inputs and group selection

| Input | Source today | Gap |
|---|---|---|
| Age | A labelled "Usia:" line or "45 tahun" in the text (`readCaseFields`), or the saved patient's age. Months are accepted ("Usia: 8 bulan", "8 bulan") and select the infant group and the month bands of section 7 (D5, approved) | Reading months is new: `normal-exam.ts` reads "bulan" before years |
| Sex | "laki-laki"/"perempuan" in the text, or the saved patient (`Male`/`Female`/`Not specified`) | None |
| Pregnancy | A labelled "Hamil:" line (decision 2.6). "Hamil: tidak" or "Hamil: -" means not pregnant; weeks or "ya" mean pregnant. An unlabelled "hamil" in the text never sets it (my call) | Not modelled in `Patient`, `CaseState` or `CaseFields`, and stays that way |
| Gestational age | The weeks on the "Hamil:" line ("Hamil: 32 minggu") | Optional |
| Postpartum (nifas) | A labelled "Nifas:" line, read like "Hamil:": "Nifas: hari ke-3", "Nifas: 3 hari" or "ya" mean postpartum; "tidak" or "-" mean not (D4, approved; parsing is my call) | Not modelled, and stays that way |

The "Hamil" and "Nifas" chips appear in the completeness guide only when the sex is P and are not counted in
"Kelengkapan kasus: n dari m" (my call). If both lines say yes, "Nifas" wins: a delivered patient is postpartum (my call).

On the `clinic` path these come from the typed text and the saved patient only: the case strip appears only in the five
AADI modes (`composer.tsx:133`), and `generate` passes no strip values to `createDraft` (`workspace.tsx:144`). The
completeness guide already reads age and sex from the same sources (`caseGuide`, phase 1).

Groups: `adult` (≥ 18 years), `child` (< 18 years), `infant` (< 2 years; adds lines to `child`), `pregnant` (sex F and
a "Hamil:" line saying pregnant; ignored otherwise), `postpartum` (sex F and a "Nifas:" line saying postpartum).

A line's text is taken from the most specific group that defines it, in this order:
`postpartum` > `pregnant` > `infant` > `child` > `adult`. A cell marked "absent" means the line does not appear for
that group. Sex only changes two lines (breast, waist circumference); the table states those inline instead of
adding columns.

No template is applied until age and sex are known; until then the exam lines keep `missingField` and the existing
completeness strip already lists "Usia" and "Jenis kelamin". A pregnant or postpartum patient under 18 gets that
group's text with the adolescent reference ranges.

## 6. The template table

One table holds every line, in status-generalis order. The `Suppress terms` column is the contradiction guard (section
9): if the doctor's own exam text mentions any of these words, the line is not auto-filled. Terms match whole words,
case-insensitive. All text is a draft for clinical review (section 12).

| Id | Label | Policy | Adult (≥ 18) | Child (< 18) | Infant (< 2), extra | Pregnant | Postpartum (nifas) | Suppress terms |
|---|---|---|---|---|---|---|---|---|
| `general.condition` | Keadaan umum | normal | Baik | Baik, aktif | (child) | (adult) | (adult) | keadaan umum, KU, lemah, lemas, sakit ringan, sakit sedang, sakit berat, letargis, rewel |
| `general.consciousness` | Kesadaran | normal | Compos mentis | Compos mentis | (child) | (adult) | (adult) | kesadaran, apatis, somnolen, sopor, koma, delirium, gelisah, GCS |
| `vitals.bp` | Tekanan darah | measure | — | — | — | — | — | — |
| `vitals.hr` | Nadi | measure | — | — | — | — | — | — |
| `vitals.rr` | Napas | measure | — | — | — | — | — | — |
| `vitals.temp` | Suhu | measure | — | — | — | — | — | — |
| `vitals.spo2` | SpO₂ | measure | — | — | — | — | — | — |
| `anthro.weight` | Berat badan | measure | — | — | — | — | — | — |
| `anthro.height` | Tinggi badan / panjang badan | measure | — | — | — | — | — | — |
| `anthro.bmi` | IMT | measure, derived from typed BB and TB | — | absent | absent | absent | absent | — |
| `anthro.waist` | Lingkar perut | measure | — (L and P) | absent | absent | absent | absent | — |
| `anthro.headCirc` | Lingkar kepala | measure | absent | absent | — | absent | absent | — |
| `anthro.nutrition` | Status gizi | measure ("belum dinilai") | absent | — | (child) | absent | absent | — |
| `head` | Kepala | normal | Normocephal | Normocephal | (child) | (adult) | (adult) | kepala, normocephal, mikrosefal, makrosefal, deformitas kepala, hematoma |
| `head.fontanelle` | Ubun-ubun besar | measure | absent | absent | — | absent | absent | — |
| `eyes` | Mata | normal | Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+) | Konjungtiva anemis (-/-), sklera ikterik (-/-), mata cekung (-), pupil isokor, refleks cahaya (+/+) | (child) | (adult) | (adult) | mata, konjungtiva, anemis, sklera, ikterik, pupil, anisokor, refleks cahaya, mata cekung |
| `ent` | Telinga, hidung, tenggorok | normal | Sekret telinga (-/-), sekret hidung (-), faring hiperemis (-), tonsil tidak hiperemis, detritus (-) | (adult) | (adult) | (adult) | (adult) | telinga, otore, hidung, rinore, epistaksis, tenggorok, faring, tonsil, detritus |
| `mouth` | Mulut | normal | Mukosa bibir lembap, sianosis (-) | (adult) | (adult) | (adult) | (adult) | mulut, mukosa, bibir, sianosis, stomatitis, sariawan, lidah |
| `neck` | Leher | normal | Pembesaran KGB (-), pembesaran tiroid (-) | (adult) | (adult) | (adult) | (adult) | leher, KGB, kelenjar getah bening, limfadenopati, tiroid, struma, JVP |
| `chest.lungs` | Paru | normal | Gerak napas simetris, retraksi (-), suara napas vesikuler (+/+), ronki (-/-), wheezing (-/-) | Gerak napas simetris, tarikan dinding dada ke dalam (-), suara napas vesikuler (+/+), ronki (-/-), wheezing (-/-) | (child) | (adult) | (adult) | paru, sesak, retraksi, tarikan dinding dada, vesikuler, ronki, rhonki, wheezing, mengi, stridor, redup, hipersonor |
| `chest.heart` | Jantung | normal | Bunyi jantung I-II reguler, murmur (-), gallop (-) | (adult) | (adult) | (adult) | (adult) | jantung, bunyi jantung, BJ, murmur, gallop, iktus, ireguler |
| `breast` | Payudara | P: notExamined; L: absent | Tidak diperiksa | absent | absent | normal: Massa (-), retraksi puting (-) (D2) | normal: Massa (-), puting lecet (-), bendungan ASI (-) (D2) | payudara, mammae, massa payudara, puting, areola, ASI, lecet, bendungan |
| `abdomen` | Abdomen | normal | Supel, bising usus (+) normal, nyeri tekan (-), hepar dan lien tidak teraba | (adult) | (adult) | Membesar (hamil), nyeri tekan (-) | Supel, nyeri tekan (-) | abdomen, perut, supel, distensi, kembung, nyeri tekan, defans, bising usus, hepar, lien, hepatomegali, splenomegali, asites, McBurney, Murphy |
| `obstetric.fundus` | Tinggi fundus uteri | measure | absent | absent | absent | — | — (cm or jari di bawah pusat, as typed) | — |
| `obstetric.leopold` | Leopold I-IV | measure | absent | absent | absent | — | absent | — |
| `obstetric.fhr` | Denyut jantung janin | measure | absent | absent | absent | — | absent | — |
| `obstetric.contractions` | Kontraksi (his) | measure | absent | absent | absent | — | absent | — |
| `obstetric.vaginal` | Pemeriksaan dalam | notExamined ("Tidak dilakukan") | absent | absent | absent | Tidak dilakukan | absent | pemeriksaan dalam, VT, pembukaan, portio, ketuban |
| `postpartum.uterus` | Kontraksi uterus | measure | absent | absent | absent | absent | — | — |
| `postpartum.lochia` | Lokia | measure | absent | absent | absent | absent | — | — |
| `postpartum.perineum` | Perineum | measure | absent | absent | absent | absent | — | — |
| `genitalia` | Genitalia | notExamined | Tidak diperiksa | Tidak diperiksa | (child) | Tidak diperiksa | Tidak diperiksa | genitalia, genital, vulva, vagina, penis, skrotum, testis, keputihan, duh |
| `anorectal` | Anus dan rektum | notExamined | Tidak diperiksa | Tidak diperiksa | (child) | Tidak diperiksa | Tidak diperiksa | anus, rektum, rektal, colok dubur, hemoroid |
| `extremities` | Ekstremitas | normal | Akral hangat, CRT < 2 detik, edema (-/-) | Akral hangat, CRT < 2 detik | (child) | Akral hangat, CRT < 2 detik, edema tungkai (-/-) | Akral hangat, CRT < 2 detik, edema tungkai (-/-), nyeri betis (-/-) | ekstremitas, akral, dingin, CRT, edema, bengkak, sianosis perifer, betis, nyeri betis |
| `skin` | Kulit | normal | Ruam (-) | Ruam (-), turgor kulit kembali cepat | (child) | (adult) | (adult) | kulit, ruam, eritema, makula, papul, vesikel, pustul, ptekie, turgor |
| `neuro` | Status neurologis | notExamined | Tidak diperiksa | Tidak diperiksa | (child) | Tidak diperiksa | Tidak diperiksa | neurologis, kaku kuduk, meningeal, parese, paresis, hemiparese, refleks, kejang, Babinski, defisit |

Reading the table: "(child)" or "(adult)" means the cell inherits that group's text; "—" means the line exists with no
default text (a `measure` line); "absent" means the line does not appear for that group.

## 7. Reference ranges (flag only, never written)

Ranges never fill a field. They only show a warning next to a typed value where the UI shows it: the case strip in the
AADI modes, the SOAP view's row O in `clinic` mode (for example "Napas 52 — di atas batas MTBS"). Flags are UI-only and
are not written into the record. "Verified" means the value was read in the cited primary source on 2026-10-21;
"to verify" means it comes from a secondary source or memory and stays a draft until Gaffer checks it.

| Group | Item | Flag when | Source to verify against |
|---|---|---|---|
| Adult | TD | ≥ 140/90 mmHg (hipertensi); 130-139/85-89 shown as "normal-tinggi" | Verified: PERHI Konsensus 2021, Tabel 1 |
| Adult | TD | < 90/60 mmHg (hipotensi) | To verify (clinical convention) |
| Adult | Nadi | < 60 or > 100 /menit | To verify (standard adult range) |
| Adult | Napas | < 12 or > 20 /menit | To verify (standard adult range) |
| All | Suhu | ≥ 37,5 °C (demam); < 36,0 °C | To verify: Buku Bagan MTBS (the IMCI booklet's figure did not extract) |
| All | SpO₂ | < 95% | To verify (standard) |
| Adult | IMT | < 18,5 kurang; 23-24,9 BB lebih; 25-29,9 obesitas I; ≥ 30 obesitas II | Verified: KMK 509/2025, Tabel 3.1 (D6) |
| Adult L / P | Lingkar perut | > 90 cm (L), > 80 cm (P) | Verified: KMK 509/2025, Tabel 3.2 |
| Child < 2 months | Napas | ≥ 60 /menit | Verified: WHO IMCI Chart Booklet 2014, young infant chart (MTBS is its adaptation) |
| Child 2-11 months | Napas | ≥ 50 /menit | Verified: WHO IMCI Chart Booklet 2014, cough chart |
| Child 1-4 years | Napas | ≥ 40 /menit | Verified: WHO IMCI Chart Booklet 2014, cough chart |
| Child, banded | Nadi (awake) | outside 100-190 (< 1 y), 98-140 (1-2 y), 80-120 (3-5 y), 75-118 (6-11 y), 60-100 (12-17 y) | To verify: PALS charts, secondary sources |
| Child ≥ 5 years | Napas | outside 18-25 (6-11 y), 12-20 (12-17 y) | To verify: PALS charts, secondary sources |
| Child | Status gizi | z-score categories | Permenkes 2/2020 Standar Antropometri Anak (needs age in months) |
| Pregnant | TD | ≥ 140/90 (hipertensi dalam kehamilan); ≥ 160/110 (berat) | To verify: PNPK Preeklampsia / Buku KIA |
| Pregnant | DJJ | < 120 or > 160 /menit | To verify: Buku KIA / POGI |
| Pregnant | TFU | differs from gestational age by > 2 cm from 20 weeks | To verify: McDonald rule, Buku KIA |
| Postpartum | TD | ≥ 140/90 mmHg (preeklampsia pascasalin) | To verify: Buku KIA / POGI |
| Postpartum | Suhu | ≥ 38,0 °C (infeksi nifas) | To verify: Buku KIA / PPK |
| Postpartum | Nadi | > 100 /menit (perdarahan, infeksi) | To verify: Buku KIA / PPK |

Postpartum TFU has no flag: it is often typed in fingers below the umbilicus, and an involution rule by day is left for
clinical review (my call).

## 8. Units

- TD mmHg; Nadi, Napas and DJJ "/menit"; SpO₂ %; Suhu °C, BB kg; TB/PB, lingkar perut, lingkar kepala and TFU cm;
  gestational age in weeks (and days when given); infant age in months; postpartum day as a count of days.
- Postpartum TFU is kept as typed, in cm or in fingers below the umbilicus ("2 jari di bawah pusat").
- A temperature typed in °F (above 50) is converted: (°F − 32) × 5/9, rounded to 0,1. An infant weight typed in grams
  (above 300) is divided by 1000. Everything else is taken as typed in the units above.
- The UI writes a decimal comma ("38,5"); stored numbers use a dot. `readCaseFields` already reads both.

## 9. How the exam section is assembled

1. Collect the doctor's exam entries:
   - lines labelled with a template line's label or alias ("Mata: konjungtiva anemis (+/+)", "TFU: 30 cm"), read by
     `normal-exam.ts`'s own label table over the raw text. Today `structureNote` drops such lines (unknown label, and a
     line containing ":" is never appended to the current field), so the template labels are deliberately not added to
     the shared alias table, which would change parsing in all 18 modes (my call). In the `clinic` draft, a text holding
     template-labelled lines (or a "Hamil:"/"Nifas:" line) counts as structured, so those lines do not land in
     "Keluhan Utama", and the rest of an unlabelled text stays the complaint;
   - vital signs from "Tanda vital:" and the other places `readCaseFields` reads today, for the `measure` lines;
   - the doctor's exam text: what `structureNote` reads as the examination ("Pemeriksaan fisik:", "Tanda vital:" and
     their continuation lines). A finding labelled for a line the group does not have ("DJJ: 140" for a man) is kept
     after "Temuan dokter".
2. For each template line of the patient's group, in table order, write `Label: text` where text is:
   - the doctor's labelled entry or typed measurement, if there is one;
   - otherwise, if any suppress term occurs in the doctor's exam text: "lihat temuan dokter". Once the text carries
     section labels, only the exam text is scanned, never the complaint or history, so symptom words ("sesak", "lemas",
     "bengkak") do not suppress (my call). A fully unlabelled text cannot be split, so all of it is scanned and a match
     reads "lihat catatan dokter" (implementation call, 2026-10-21: no default may contradict what the doctor typed);
   - otherwise the policy default: normal text plus ` [otomatis normal]`, `belum diukur`, or `Tidak diperiksa`.
3. The doctor's exam text, if any, comes first as "Temuan dokter: …", verbatim.
4. Marker handling (decision 2.7): the marker is written into the stored text. One output filter hides it when the
   status is Ditinjau or Final, applied at every output path: the card's document view, Salin, Salin ringkas, Unduh, the
   header export and `pcareCopies`. Nothing rewrites the stored text on review: `message.review` only changes the status
   and `message.edit` resets it to Draf and adds a revision (`changedMessage`, `workflow.ts`), so the marker returns by
   itself when a draft goes back to Draf. On screen (Gaffer, 2026-10-21, proposal A: "Penanda terlalu ramai"), the
   document view never shows the per-line marker; at Draf one line in the existing "Belum diisi" style under the
   document names the filled lines, "Diisi templat normal: Keadaan umum, Kesadaran, … Tinjau sebelum Ditinjau.", each a
   link to the section. Copies and downloads at Draf keep the marker.
5. The doctor can edit any line at any time, before or after review, as today.

The function is pure and deterministic: same entries and demographics, same text. No network call, no AI.

## 10. Sample input and output

Both cases are fictional.

**Input: child.** Laki-laki, 4 tahun. Doctor typed `N 110, RR 36, S 38,2` and
`Tenggorok: faring hiperemis (+), tonsil T2-T2 hiperemis, detritus (-)`.

```
Keadaan umum: Baik, aktif [otomatis normal]
Kesadaran: Compos mentis [otomatis normal]
Tekanan darah: belum diukur
Nadi: 110 /menit
Napas: 36 /menit
Suhu: 38,2 °C
SpO₂: belum diukur
Berat badan: belum diukur
Tinggi badan / panjang badan: belum diukur
Status gizi: belum dinilai
Kepala: Normocephal [otomatis normal]
Mata: Konjungtiva anemis (-/-), sklera ikterik (-/-), mata cekung (-), pupil isokor, refleks cahaya (+/+) [otomatis normal]
Telinga, hidung, tenggorok: faring hiperemis (+), tonsil T2-T2 hiperemis, detritus (-)
Mulut: Mukosa bibir lembap, sianosis (-) [otomatis normal]
Leher: Pembesaran KGB (-), pembesaran tiroid (-) [otomatis normal]
Paru: Gerak napas simetris, tarikan dinding dada ke dalam (-), suara napas vesikuler (+/+), ronki (-/-), wheezing (-/-) [otomatis normal]
Jantung: Bunyi jantung I-II reguler, murmur (-), gallop (-) [otomatis normal]
Abdomen: Supel, bising usus (+) normal, nyeri tekan (-), hepar dan lien tidak teraba [otomatis normal]
Genitalia: Tidak diperiksa
Anus dan rektum: Tidak diperiksa
Ekstremitas: Akral hangat, CRT < 2 detik [otomatis normal]
Kulit: Ruam (-), turgor kulit kembali cepat [otomatis normal]
Status neurologis: Tidak diperiksa
```

The SOAP view's row O shows a fever flag next to 38,2 °C; the record does not.

**Input: pregnant woman.** Perempuan, 28 tahun, hamil 32 minggu. Doctor typed `TD 150/100, N 92` and
`Ekstremitas: edema tungkai (+/+)`, `TFU: 30 cm`, `DJJ: 142 /menit`.

```
Keadaan umum: Baik [otomatis normal]
Kesadaran: Compos mentis [otomatis normal]
Tekanan darah: 150/100 mmHg
Nadi: 92 /menit
Napas: belum diukur
Suhu: belum diukur
SpO₂: belum diukur
Berat badan: belum diukur
Tinggi badan / panjang badan: belum diukur
Kepala: Normocephal [otomatis normal]
Mata: Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+) [otomatis normal]
Telinga, hidung, tenggorok: Sekret telinga (-/-), sekret hidung (-), faring hiperemis (-), tonsil tidak hiperemis, detritus (-) [otomatis normal]
Mulut: Mukosa bibir lembap, sianosis (-) [otomatis normal]
Leher: Pembesaran KGB (-), pembesaran tiroid (-) [otomatis normal]
Paru: Gerak napas simetris, retraksi (-), suara napas vesikuler (+/+), ronki (-/-), wheezing (-/-) [otomatis normal]
Jantung: Bunyi jantung I-II reguler, murmur (-), gallop (-) [otomatis normal]
Payudara: Massa (-), retraksi puting (-) [otomatis normal]
Abdomen: Membesar (hamil), nyeri tekan (-) [otomatis normal]
Tinggi fundus uteri: 30 cm
Leopold I-IV: belum diukur
Denyut jantung janin: 142 /menit
Kontraksi (his): belum diukur
Pemeriksaan dalam: Tidak dilakukan
Genitalia: Tidak diperiksa
Anus dan rektum: Tidak diperiksa
Ekstremitas: edema tungkai (+/+)
Kulit: Ruam (-) [otomatis normal]
Status neurologis: Tidak diperiksa
```

The SOAP view flags TD ≥ 140/90 in pregnancy; the record does not.

## 11. For the clinical team

- Write only what is abnormal, as a labelled line ("Mata: konjungtiva anemis (+/+)") or through the suggestion chips
  once they exist. Every other routine line is filled from the normal template for the patient's age, sex, pregnancy
  and postpartum period.
- Type the age and sex ("Usia: 28", "perempuan"; "Usia: 8 bulan" for an infant) or select the saved patient first: the
  template is chosen from them. For a pregnant patient, click "Hamil" and add the weeks ("Hamil: 32 minggu"); for a
  postpartum patient, click "Nifas" and add the day ("Nifas: hari ke-3").
- In nifas, the uterine contraction, lochia, perineum and TFU lines are never filled for you: write what you found.
- `[otomatis normal]` marks text you did not write. Marking the draft "Ditinjau" or "Final" hides the marker in the
  card and in every copy or export, and means you confirm those lines. Read them before you mark the draft. If the
  draft goes back to Draf, the marker shows again.
- Measurements are never filled for you: an unmeasured vital sign reads "belum diukur".
- Genitalia, anus/rectum, internal examination and the full neurological status read "Tidak diperiksa" unless you write
  a finding.
- If you mention a finding without a label ("konjungtiva anemis"), the matching line reads "lihat temuan dokter" (or
  "lihat catatan dokter" when nothing in the text is labelled) instead of a normal default, so the record never
  contradicts you.
- Edit any line at any time. Report wrong or missing template text to Gaffer; template text changes only after
  clinical review.

## 12. Verification plan (for the implementation)

- Unit tests per group: adult L, adult P, child, infant, pregnant, postpartum; the two samples in section 10 match
  exactly.
- "Usia: 8 bulan" selects the infant group (never 8 years); "Nifas:" parses like "Hamil:"; when both say yes, the
  postpartum group applies.
- A `measure` line never contains a number the doctor did not type.
- `notExamined` lines read "Tidak diperiksa" (or "Tidak dilakukan") unless the doctor wrote a finding.
- Suppression: unlabelled "konjungtiva anemis" turns the eyes line into "lihat temuan dokter".
- Pregnancy comes only from a labelled "Hamil:" line; "Hamil: tidak" is not pregnant; an unlabelled "hamil" is
  ignored; the flag is ignored unless sex is F. Unknown sex gives no sex-specific lines; no template without age and sex.
- Markers are in the stored text; the card, Salin, Salin ringkas, Unduh, the export and the P-Care copies show them at
  Draf and hide them at Ditinjau/Final; an edit or a return to Draf shows them again; the revision history keeps them.
- An old `workspace-backup.json` still imports; storage key and `Workspace.version` unchanged (no new persisted field).
- Clinical sign-off: Gaffer reviews every cell of section 6 and every number of section 7 against its source, and the
  sign-off is recorded in `.agents/DECISIONS.md`.
- Fictional cases only in code, fixtures and tests.

## 13. Where the code goes

The prompt names `src/templates/patient_values/`; the capsule has no `src/templates/` folder. The existing template data
lives in `src/lib/clinical-templates.ts`, so the proposal is one sibling file, `src/lib/normal-exam.ts` (typed data
table plus the pure assembly function), with `tests/normal-exam.test.ts` (D9, approved). Data stays in TypeScript,
not JSON, so the table is type-checked and reviewed with the code.

## 14. Risks

- Medicolegal: after review, auto-filled text is the doctor's attestation. A hurried review attests lines never
  examined. Mitigated by the marker, "Tidak diperiksa" defaults for non-routine exams, and never-generated measurements.
- Contradictions: suppression is keyword-based and misses synonyms and typos. Mitigated by reviewed term lists, tests,
  and preferring labelled entries and chips over free text.
- Clinical accuracy: section 6 text and section 7 numbers are a draft by the designer until Gaffer signs them off.
- Infants: an age typed in years only ("Usia: 1") cannot select the month bands. Today `readCaseFields` reads
  "Usia: 8 bulan" as 8 years, so the AADI modes would send an 8-month-old as 8 years old. That parser is outside this
  spec; fixing it is a follow-up.
- A missing "Hamil:" or "Nifas:" line picks the wrong template (for example "Supel" for a pregnant abdomen). The chips
  for every P patient are the mitigation.
- An output path that skips the marker filter would leak "[otomatis normal]" into a reviewed record, or one that
  hides it too early would hide it at Draf. The verification plan tests every path.
- Rule change: `missingField` no longer covers template exam lines; this must be recorded (section 16).
- The P-Care "Pemeriksaan fisik" copy (phase 5) copies the assembled section with its markers while the draft is Draf.
- English drafts keep the placeholder, so an English record does not meet the "every field filled" rule.

## 15. Decisions

All ten are settled.

| # | Decision | Status |
|---|---|---|
| D1 | Three fill policies: `normal`, `measure` (never generated, "belum diukur"), `notExamined` ("Tidak diperiksa") | Approved 2026-10-21 |
| D2 | Lines defaulting to "Tidak diperiksa": genitalia, anus/rectum, internal examination, full neurological status, breast outside pregnancy and nifas; breast in pregnancy and nifas defaults to normal (antenatal and postnatal care) | Approved 2026-10-21, as listed |
| D3 | Where the clinic path gets its inputs | Decided 2026-10-21: (a), from the typed text (section 2, item 6) |
| D4 | Nifas (postpartum): Gaffer's own example case, not among the requested groups | Approved 2026-10-21: fifth group (section 6, Postpartum column) |
| D5 | Infants: accept months in the age field ("8 bulan") so infant lines and ranges apply | Approved 2026-10-21 |
| D6 | IMT categories | Decided 2026-10-21: Asia-Pacific, KMK 509/2025 (section 2, item 9) |
| D7 | Lansia templates and laboratory reference ranges out of scope for now | Approved 2026-10-21; separate follow-up |
| D8 | The regulation that requires every field to be filled | Decided 2026-10-21: UU 17/2023 Pasal 296 (3); Permenkes 24/2022 Pasal 16 (2) |
| D9 | Code location: `src/lib/normal-exam.ts` instead of the absent `src/templates/patient_values/` | Approved 2026-10-21 |
| D10 | The marker and the legal record | Decided 2026-10-21: (a), stored, hidden in every output once reviewed (section 2, item 7) |

## 16. Proposed `.agents/DECISIONS.md` entry (not written yet)

> 2026-10-21 — Physical-exam normal defaults (Gaffer). The doctor records abnormal findings only; every other routine
> status-generalis line is filled from a reviewed normal template chosen by age (months for infants), sex, pregnancy
> and the postpartum period as typed in the text ("Hamil:" and "Nifas:" lines; no new stored field). Auto-filled lines
> carry "[otomatis normal]" in the stored text; every output hides it once the draft is Ditinjau or Final, and the
> review is the doctor's attestation.
> Measurements are never generated ("belum diukur"); non-routine and intimate examinations default to
> "Tidak diperiksa". `missingField` no longer applies to template exam lines. Reason: UU 17/2023 Pasal 296 ayat (3) and
> Permenkes 24/2022 Pasal 16 ayat (2) require a complete record, including the physical examination.
