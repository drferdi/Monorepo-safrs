# ABCDE Protocol Expansion (13 New Protocols) — Design Spec

> Status: content authored and approved by Chief (dr. Ferdi Iskandar) directly
> in-session, 2026-07-06. This spec transcribes his clinical specification
> into the existing `ActionProtocol` data shape — no new clinical content is
> invented here, only structured per this codebase's established format.
>
> Sub-project **A** of 4 identified during brainstorming (see "Scope" below
> for B/C/D, deferred to separate specs).

## Problem

Chief provided a comprehensive clinical specification — grounded in Permenkes
47/2018, WHO-ICRC Basic Emergency Care, ABCDE/SAMPLE methodology, and named
guideline bodies (AHA, GINA, GOLD, ADA, WAO, NICE, Kemenkes, WHO, SCCM,
PAHO) — proposing 13 new stabilization protocols to fill confirmed gaps in
`lib/emergency-detector/action-protocols.ts` (currently 9 protocols): no
hypertension-crisis-specific protocol, no eclampsia protocol, no dengue
shock protocol, no meningitis/meningococcal protocol, no dedicated
asthma/COPD exacerbation protocol (beyond generic resp-failure), no upper
airway obstruction protocol, no PE/aortic dissection protocol, no
neuro-red-flag (SAH/head injury/Cushing) protocol, no cauda equina
protocol, no obstetric-abdomen/bleeding protocol, no toxicology/respiratory
depression protocol, no geriatric-occult-risk protocol, and no generic
safety-net/clinical-concern protocol.

This directly extends the earlier confirmed gap list from this session's
"Peta Deteksi Kegawatan" analysis (2 gaps: HTN crisis, eclampsia) with 11
additional gaps Chief identified from the full ~91-entity catalog.

## Scope

**In scope (this spec, sub-project A):**

- Add `contraindications?: string[]` to the `ActionProtocol` interface
  (`lib/emergency-detector/action-protocols.ts`) — optional, does not change
  any of the 9 existing protocol entries.
- Append 13 new `ActionProtocol` entries to `ACTION_PROTOCOLS`, transcribed
  faithfully from Chief's specification into the existing shape (`id`,
  `name`, `condition`, `steps: ActionStep[]` grouped by ABCDE phase,
  `contraindications`, `referralCriteria`, `source`).
- Unit tests confirming each new protocol is retrievable via
  `getActionProtocol(id)` and has non-empty `steps`/`referralCriteria`.

**Out of scope (separate sub-projects, NOT done here):**

- **Sub-project B** — mapping the ~91 detected alert entities (21 legacy
  `buildAlerts()` types + 70 Pattern-Engine v2 patterns) to these 13 new
  protocols (extending `resolveActionProtocolId()` / patterns'
  `actionProtocolId` field). Depends on this spec landing first.
- **Sub-project C** — the 7-part UI restructure (Verdict / Why this matters
  / Do now / Do not do / Refer trigger / Reassessment timer / Evidence
  gate) replacing the current `EmergencyDashboard` title+reasoning+
  recommendations rendering. Depends on A and B.
- **Sub-project D** — reconciling Chief's MERAH/KUNING/HIJAU/Standby entity
  classification against the already-built (not yet wired)
  `computeTriageVerdict()`, which is currently purely severity-tier-based.
- Any change to the 9 existing protocols, to `htn-classifier.ts`,
  `clinical-patterns.ts`, or `vital-guardrails.ts` thresholds.
- Feature-flagging/degradation logic ("if facility lacks X, downgrade to
  minimal stabilization + refer") mentioned in Chief's "Asumsi kerja" —
  this is a real, separate capability (checking facility resource
  availability) not yet designed; flagged as a future sub-project, not
  silently added here.

## Architecture

`ActionProtocol` interface gains one optional field:

```ts
export interface ActionProtocol {
  id: string;
  name: string;
  condition: string;
  steps: ActionStep[];
  contraindications?: string[]; // NEW — "do not do" warnings, kept separate
  // from positive steps so a future UI can
  // render them as their own section
  referralCriteria: string[];
  source: string;
}
```

13 new entries appended to `ACTION_PROTOCOLS` (full content below). Existing
9 entries are untouched — no `contraindications` added to them retroactively
(they simply have none; adding empty arrays would be noise).

## The 13 Protocols (full transcription)

### PROTO_HTN_EMERGENCY

- **name:** Hipertensi Emergensi
- **condition:** Krisis hipertensi bertahap — TD sangat tinggi dengan atau tanpa kerusakan organ target
- **steps:**
  - A: Pastikan jalan napas terbuka.
  - B: Oksigen bila SpO2 rendah atau distress.
  - C: Ukur ulang TD dengan teknik benar; identifikasi gejala organ target — nyeri dada (ACS/diseksi), defisit neurologis (stroke), edema paru, tanda AKI, kehamilan/preeklampsia.
  - other: Bila ada gejala organ target di atas: MERAH — siapkan rujuk untuk terapi antihipertensi IV terpantau.
  - other: Bila asimtomatik tanpa bukti kerusakan organ: JANGAN turunkan TD cepat di triase. Nilai kepatuhan obat, atur ulang pengukuran dan follow-up/rujukan sesuai SOP.
- **contraindications:**
  - Jangan menurunkan TD secara cepat/agresif pada pasien asimtomatik tanpa bukti kerusakan organ target.
- **referralCriteria:**
  - Nyeri dada ACS/diseksi aorta
  - Defisit neurologis akut / stroke
  - Ensefalopati hipertensif
  - Edema paru akut
  - Tanda AKI (acute kidney injury)
  - Kehamilan dengan TD ≥160/110 atau gejala preeklampsia berat
- **source:** AHA 2024 Hypertensive Emergency Guidelines

### PROTO_PREECLAMPSIA_ECLAMPSIA

- **name:** Preeklampsia Berat / Eklamsia
- **condition:** Kehamilan + TD tinggi ± gejala berat (nyeri kepala hebat, gangguan visual, nyeri epigastrium/RUQ, sesak/edema paru, kejang, oliguria)
- **steps:**
  - A: Miringkan pasien ke kiri bila kejang, pastikan jalan napas, pasang OPA jika kejang aktif.
  - B: Oksigen.
  - C: Ukur ulang TD dengan teknik benar; pasang akses IV.
  - D: Nilai gejala berat: nyeri kepala hebat, gangguan visual, nyeri epigastrium/RUQ, kejang, oliguria; cek trombosit/SGOT bila tersedia.
  - other: Bila TD berat (≥160/110) atau ada gejala berat: MERAH — berikan MgSO4 untuk profilaksis/terapi kejang sesuai SOP, berikan antihipertensi yang aman untuk kehamilan (nifedipin/metildopa) sesuai SOP, rujuk ke FKRTL setelah stabilisasi awal.
- **contraindications:**
  - Jangan menunda pemberian MgSO4 pada eklamsia/preeklampsia berat dengan alasan menunggu hasil lab.
  - Jangan gunakan antihipertensi yang tidak aman untuk kehamilan.
- **referralCriteria:**
  - TD sistolik ≥160 atau diastolik ≥110 pada kehamilan
  - Kejang (eklamsia)
  - Gejala berat: nyeri kepala hebat, gangguan visual, nyeri epigastrium, sesak/edema paru, oliguria
- **source:** Kemenkes RI (Pedoman Hipertensi dalam Kehamilan)

### PROTO_DENGUE_SHOCK

- **name:** Dengue Berat / Syok Dengue
- **condition:** Demam + tanda perdarahan + tanda syok, curiga dengue berat
- **steps:**
  - A: Pastikan jalan napas terbuka.
  - B: Oksigen.
  - C: Pasang akses IV, berikan cairan kristaloid isotonik secara hati-hati sesuai fase penyakit dan respons klinis, pantau nadi/TD/CRT/diuresis ketat.
  - other: Rujuk ke RS dengan kemampuan tata laksana dengue berat.
- **contraindications:**
  - Hindari NSAID dan aspirin (risiko perdarahan).
  - Hindari pemberian cairan berlebihan tanpa pemantauan ketat (risiko overload saat fase kebocoran plasma reda).
- **referralCriteria:**
  - Tanda syok (TD turun, nadi cepat lemah, CRT memanjang)
  - Perdarahan bermakna
  - Diuresis menurun
  - Tidak respons terhadap resusitasi cairan awal
- **source:** WHO Dengue Guidelines / PAHO-WHO Dengue Management Algorithm

### PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS

- **name:** Meningitis / Sepsis Meningokokus
- **condition:** Demam + kaku kuduk/penurunan kesadaran, atau demam + petekie + toksik
- **steps:**
  - A: Terapkan isolasi droplet bila dicurigai meningokokus.
  - B: Oksigen bila diperlukan.
  - C: Pasang akses IV.
  - D: Koreksi hipoglikemia dan kejang bila ada.
  - other: Berikan antibiotik parenteral segera bila tersedia sesuai SOP — jangan menunggu hasil pemeriksaan penunjang untuk memulai terapi.
  - other: Rujuk segera ke RS.
- **contraindications:**
  - Jangan menunda pemberian antibiotik untuk menunggu hasil laboratorium/pencitraan.
- **referralCriteria:**
  - Semua kasus suspek meningitis/sepsis meningokokus harus dirujuk segera
  - Petekie yang meluas, tanda syok, atau penurunan kesadaran progresif
- **source:** WHO 2025 Meningitis Guidelines (target antibiotik dalam 1 jam)

### PROTO_ASTHMA_COPD_EXACERBATION

- **name:** Eksaserbasi Asma / COPD
- **condition:** Sesak + wheezing/silent chest, riwayat asma atau COPD, RR/SpO2 abnormal
- **steps:**
  - A: Posisikan pasien duduk tegak.
  - B (asma): SABA inhalasi/nebulisasi berulang, tambahkan ipratropium, oksigen terkontrol, kortikosteroid sistemik diberikan dini.
  - B (COPD): Bronkodilator kerja pendek, oksigen terkontrol (hati-hati target SpO2 88-92% bila risiko retensi CO2), steroid sistemik/antibiotik sesuai indikasi dan SOP.
  - other: Rujuk bila berat, respons buruk terhadap terapi awal, silent chest, mengantuk, atau bingung.
- **contraindications:**
  - Jangan memberikan oksigen tanpa target/tanpa titrasi pada pasien COPD berisiko retensi CO2 — gunakan target saturasi konservatif sesuai SOP.
- **referralCriteria:**
  - Silent chest
  - Mengantuk berat atau bingung (tanda kelelahan napas)
  - Tidak respons terhadap bronkodilator + steroid awal
  - SpO2 tetap rendah setelah terapi
- **source:** GINA 2025 (Global Initiative for Asthma), GOLD 2026 (COPD)

### PROTO_UPPER_AIRWAY_OBSTRUCTION

- **name:** Epiglotitis / Obstruksi Laring
- **condition:** Sulit napas + suara serak/stridor, curiga obstruksi jalan napas atas
- **steps:**
  - A: JANGAN memaksa pemeriksaan tenggorok. Biarkan pasien pada posisi paling nyaman baginya — jangan dibaringkan bila memperburuk gejala.
  - B: Berikan oksigen tanpa memprovokasi pasien.
  - other: Siapkan rujukan emergensi dengan notifikasi RS tujuan terlebih dahulu.
- **contraindications:**
  - Jangan memeriksa tenggorok secara paksa (dapat memicu spasme laring total).
  - Jangan memaksa posisi berbaring bila pasien merasa lebih nyaman duduk/tegak.
- **referralCriteria:**
  - Semua kasus suspek epiglotitis/obstruksi laring harus dirujuk emergensi dengan notifikasi RS
- **source:** Praktik klinis standar tata laksana jalan napas atas darurat

### PROTO_PE_AORTIC_DISSECTION

- **name:** Emboli Paru / Diseksi Aorta
- **condition:** Nyeri dada non-ACS yang berpotensi mematikan — sesak mendadak (curiga PE) atau nyeri dada/punggung robek mendadak (curiga diseksi aorta)
- **steps:**
  - A: Pastikan jalan napas terbuka.
  - B: Oksigen; EKG 12 sadapan bila tersedia.
  - C: Nilai tanda syok, hipotensi, atau hipertensi berat; nilai defisit nadi/neurologis (diseksi) atau faktor risiko PE (postpartum, hemoptisis, unilateral leg swelling).
  - other: JANGAN menunda rujukan untuk menunggu pemeriksaan penunjang lokal. Analgesia sesuai SOP untuk diseksi aorta. Rujuk emergensi.
- **contraindications:**
  - Hindari bolus cairan agresif pada dugaan diseksi aorta kecuali pasien syok.
  - Jangan menunda rujukan untuk mengejar kepastian diagnosis di fasilitas primer.
- **referralCriteria:**
  - Hipotensi atau sinkop dengan dugaan PE
  - SpO2 rendah dengan dugaan PE
  - Nyeri dada/punggung robek mendadak dengan defisit nadi/neurologis
  - Hipertensi berat dengan nyeri dada/punggung mendadak hebat
- **source:** AHA/ACC Guidelines (Acute Aortic Syndrome, Pulmonary Embolism)

### PROTO_NEURO_RED_FLAG

- **name:** Red Flag Neurologis (SAH / Cedera Kepala Berat)
- **condition:** Nyeri kepala thunderclap mendadak, atau cedera kepala dengan tanda peningkatan TIK (Cushing's Triad)
- **steps:**
  - A: Imobilisasi servikal bila ada riwayat trauma.
  - B: Oksigen.
  - C: Elevasi kepala tempat tidur bila pasien tidak hipotensi.
  - D: Kontrol kejang dan muntah sesuai SOP.
  - other: Rujuk emergensi segera.
- **contraindications:**
  - Jangan mengelevasi kepala bila pasien hipotensi/syok.
- **referralCriteria:**
  - Semua kasus suspek SAH (nyeri kepala thunderclap) atau cedera kepala berat harus dirujuk emergensi
- **source:** NICE Head Injury Guideline

### PROTO_CAUDA_EQUINA

- **name:** Cauda Equina Syndrome
- **condition:** Retensi/inkontinensia urin baru, gangguan BAB, saddle anesthesia, kelemahan tungkai bilateral progresif, nyeri radikular berat
- **steps:**
  - other: Dokumentasikan onset gejala dan temuan neurologis secara rinci (kekuatan motorik, sensasi saddle, tonus sfingter bila memungkinkan).
  - other: Berikan analgesia yang aman sesuai SOP.
  - other: Rujuk segera untuk MRI dan evaluasi bedah saraf/ortopedi — ini bukan kasus observasi di Puskesmas.
- **contraindications:**
  - Jangan menahan pasien untuk observasi di Puskesmas — ini kondisi time-critical yang butuh MRI dan bedah saraf/ortopedi segera.
- **referralCriteria:**
  - Semua kasus dengan kecurigaan cauda equina syndrome harus dirujuk segera
- **source:** GIRFT (Getting It Right First Time) Cauda Equina Syndrome Pathway 2026

### PROTO_OBSTETRIC_ABDOMEN_BLEEDING

- **name:** Kegawatan Abdomen Obstetri (KET / Abortus)
- **condition:** Hamil (atau dugaan hamil) + nyeri perut + perdarahan
- **steps:**
  - A: Pastikan jalan napas terbuka.
  - B: Oksigen bila diperlukan.
  - C: Lakukan tes kehamilan bila status belum jelas; nilai tanda syok/perdarahan; pasang akses IV; berikan cairan bila hemodinamik tidak stabil.
  - other: Rujuk untuk USG dan evaluasi lanjutan.
- **contraindications:**
  - Jangan menunda rujukan untuk menunggu USG/lab lokal bila pasien syok, nyeri hebat, sinkop, atau perdarahan aktif.
- **referralCriteria:**
  - Tanda syok atau hemodinamik tidak stabil
  - Nyeri perut hebat
  - Sinkop
  - Perdarahan aktif bermakna
- **source:** Praktik klinis standar kegawatan obstetri-ginekologi

### PROTO_TOX_RESP_DEPRESSION

- **name:** Depresi Napas Akibat Obat / Overdosis
- **condition:** RR rendah/borderline + mengantuk berat, curiga overdosis obat
- **steps:**
  - A: Posisikan jalan napas terbuka; posisi miring bila risiko muntah.
  - B: Berikan bantuan napas dengan bag-valve-mask bila ventilasi tidak adekuat; oksigen.
  - D: Cek gula darah sewaktu; berikan nalokson bila curiga overdosis opioid dan tersedia, sesuai SOP.
  - other: Observasi ketat, rujuk.
- **contraindications:**
  - Jangan mengandalkan nalokson tunggal tanpa terus memantau jalan napas — efeknya bisa lebih pendek dari opioid penyebab (risiko relaps depresi napas).
- **referralCriteria:**
  - Ventilasi tidak adekuat meski sudah dibantu
  - Tidak respons terhadap nalokson (bila diberikan)
  - Penurunan kesadaran menetap
- **source:** Praktik BLS/toksikologi klinis standar

### PROTO_GERIATRIC_OCCULT_RISK

- **name:** Risiko Tersembunyi pada Lansia (Ortostatik / Frailty)
- **condition:** Hipotensi ortostatik, atau frailty dengan tanda vital naik perlahan — tidak boleh dianggap "hijau" hanya karena angka tidak ekstrem
- **steps:**
  - C: Cek tekanan darah/nadi ortostatik bila aman untuk dilakukan.
  - D: Cek gula darah sewaktu.
  - other: Nilai hidrasi, obat-obatan yang dikonsumsi, kemungkinan infeksi tersembunyi, delirium, riwayat jatuh, dan asupan makan/minum.
- **contraindications:**
  - Jangan menyimpulkan "stabil/aman" hanya berdasarkan angka vital yang belum mencapai ambang ekstrem pada pasien lansia frail.
- **referralCriteria:**
  - Pasien frail yang tinggal sendiri
  - Delirium baru
  - Hipotensi atau takikardia bermakna
  - Dehidrasi atau asupan makan/minum gagal
  - Caregiver menyatakan kekhawatiran signifikan
- **source:** Praktik kedokteran gawat darurat geriatri standar

### PROTO_SAFETY_NET_CLINICAL_CONCERN

- **name:** Safety-Net untuk Kekhawatiran Klinis / Kode Merah Otomatis
- **condition:** Kode merah otomatis dari sistem, deteriorasi progresif, vital borderline, nyeri hebat, atau kekhawatiran klinis umum tanpa diagnosis pasti
- **steps:**
  - other: Ulangi pengukuran tanda vital.
  - other: Jangan pulangkan pasien sebelum dilakukan reassessment.
  - other: Cari kemungkinan diagnosis time-critical yang mungkin terlewat.
  - other: Rujuk bila nyeri hebat, pasien tampak toksik, tren vital memburuk, pasien/keluarga tampak sangat khawatir, atau data yang ada tidak cukup untuk menyatakan pasien aman.
- **contraindications:**
  - Jangan memulangkan pasien hanya berdasarkan satu kali pengukuran vital yang tampak normal bila ada kekhawatiran klinis yang jelas.
- **referralCriteria:**
  - Tren vital memburuk meski belum mencapai ambang kritis
  - Kekhawatiran klinis kuat dari nakes atau keluarga tanpa diagnosis pasti
  - Data tidak cukup untuk menyatakan pasien aman dipulangkan
- **source:** Prinsip keselamatan pasien umum (clinical safety-netting)

## Testing Plan

- `getActionProtocol('PROTO_HTN_EMERGENCY')` through all 13 new ids returns
  a defined protocol (not `undefined`).
- Each new protocol has non-empty `steps` and non-empty `referralCriteria`.
- Existing 9 protocols remain retrievable and unchanged (regression guard —
  assert their `id`/`name`/`steps.length` match pre-change values, so
  appending new entries never accidentally mutates the array order/content
  the 9 old ones depend on).
- `ACTION_PROTOCOLS.length === 22` after this change (9 existing + 13 new).

## Open Assumptions

- Facility-resource-based automatic downgrade ("stabilisasi minimal + rujuk
  segera" when e.g. no oxygen/IV access available) from Chief's "Asumsi
  kerja" is a distinct, larger capability — not designed or implemented
  here. Flagged for a future separate spec once sub-projects B/C/D are
  further along.
- Source citation strings use the guideline body name only (matching this
  file's existing plain-text `source` convention, e.g. `"PMK 47/2018, WHO
Emergency Triage"`), not the specific journal/URL footnotes from Chief's
  original message (those weren't included as resolvable links in what was
  pasted).
