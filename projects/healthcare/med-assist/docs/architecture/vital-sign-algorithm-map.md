# Vital Sign Algorithm Map

Tanggal: 2026-04-06

## Tujuan

Dokumen ini memetakan algoritme yang terkait dengan halaman `VITAL SIGN` pada Med Assist.

Fokus dokumen ini adalah membedakan dengan tegas:

- algoritme yang benar-benar aktif di layar `VITAL SIGN` saat ini
- algoritme yang baru berjalan setelah user lanjut ke flow berikutnya
- algoritme yang sudah ada di codebase tetapi belum menjadi mesin utama layar `VITAL SIGN`

## Brief Best Practice

- intake vital sign di layanan akut umumnya memakai rule early warning yang deterministik
- `NEWS2` masih menjadi acuan umum untuk deteksi deteriorasi dewasa, tetapi tidak selalu cocok untuk semua baseline pasien
- untuk FKTP / side panel cepat seperti Med Assist, pendekatan `gate threshold` masih layak selama jelas, konsisten, dan tidak disalahartikan sebagai skor NEWS2 penuh

Referensi eksternal yang relevan:

- RCP NEWS2
- NICE `Sepsis: recognition, diagnosis and early management (NG253)` pembaruan 19 November 2025

## Ringkasan Cepat

Status halaman `VITAL SIGN` saat ini:

- mesin utama saat user berada di layar ini adalah `rule-based screening gates`
- mesin dokumentasi klinis aktif adalah `AutoComplete+ deterministic anamnesa composer`
- mesin analitik yang lebih berat berjalan setelah user lanjut ke `Trajectory`, `Differential`, atau `Forward to Doctor`
- halaman ini belum memakai `NEWS2` penuh

## A. Aktif Sekarang Di Halaman VITAL SIGN

### 1. Gate-Based Vital Alert Rules

Lokasi utama:

- `components/clinical/TTVInferenceUI.tsx`

Algoritme:

- membaca input `SBP`, `DBP`, `HR`, `RR`, `Temp`, `SpO2`, `Glucose`
- menjalankan threshold rule lokal
- menghasilkan `ScreeningAlert[]`

Gate aktif:

- `GATE_1_HEMODYNAMIC`
  - `MAP < 65` atau `SBP < 90`
- `GATE_2_BP`
  - `SBP >= 180` atau `DBP >= 120`
- `GATE_3_GLUCOSE`
  - hipoglikemia `< 70`
  - hiperglikemia berat `>= 300`
- `GATE_4_RESPIRATORY`
  - hipoksia signifikan `SpO2 < 90`
  - borderline hypoxia `SpO2 <= 93`
- `GATE_5_CIRCULATION`
  - takikardia `HR >= 130`
- `GATE_6_RESP_RATE`
  - takipnea `RR >= 30`
- `GATE_7_TEMPERATURE`
  - demam tinggi `Temp >= 39`

Karakter:

- deterministik
- rule-based
- lokal di UI
- tidak bergantung AI

### 2. Mean Arterial Pressure (MAP)

Lokasi utama:

- `components/clinical/TTVInferenceUI.tsx`

Rumus:

```text
MAP = (SBP + 2 x DBP) / 3
```

Peran:

- menjadi bagian dari `GATE_1_HEMODYNAMIC`
- membantu mendeteksi perfusi rendah

### 3. AutoComplete+ Deterministic Anamnesa Composer

Lokasi utama:

- `lib/clinical/anamnesa-composer.ts`
- dipanggil dari `components/clinical/TTVInferenceUI.tsx`

Algoritme:

- memecah input gejala singkat menjadi maksimal 3-4 phrase utama
- mengekstrak durasi jika benar-benar tertulis
- menyusun:
  - `keluhan_utama`
  - `keluhan_tambahan`
  - `riwayat_penyakit.sekarang`
- menambahkan konteks:
  - penyakit kronis
  - alergi
  - status kehamilan
  - penyakit khusus
- menandai fakta yang belum dikonfirmasi

Karakter:

- deterministik
- fact-bound
- bukan AI generatif bebas
- aktif langsung di kolom gejala pada layar ini

### 4. Intake Context Normalization

Lokasi utama:

- `entrypoints/sidepanel/main.tsx`
- `entrypoints/content.ts`
- `components/clinical/TTVInferenceUI.tsx`

Peran:

- mengambil data RME yang relevan ke layar `VITAL SIGN`
- menyinkronkan ke field intake

Context yang aktif:

- riwayat penyakit kronis
- riwayat alergi
- status kehamilan
- risiko kehamilan
- penyakit khusus
- payer / BPJS
- faskes

Karakter:

- deterministic extraction + normalization
- bukan engine risk scoring
- tetapi mempengaruhi keputusan klinis di layar ini

### 5. Doctor Routing Ranking

Lokasi utama:

- `components/clinical/TTVInferenceUI.tsx`

Algoritme:

- ranking dokter online berdasarkan:
  1. `availability_status`
  2. kecocokan `poli`
  3. kecocokan `facility/location`
  4. nama dokter

Karakter:

- bukan algoritme vital sign
- tetapi aktif di halaman yang sama ketika user melakukan `Forward to Doctor`

## B. Aktif Setelah User Lanjut Dari Halaman Ini

### 1. Clinical Trajectory Analyzer

Lokasi utama:

- `lib/iskandar-diagnosis-engine/trajectory-analyzer.ts`
- dirender lewat `components/clinical/ClinicalTrajectory.tsx`

Sumber data:

- maksimal 5 kunjungan terakhir
- minimum 3 kunjungan usable

Algoritme:

- trend per vital:
  - `improving`
  - `declining`
  - `stable`
  - `insufficient_data`
- risk per parameter
- `early_warning_burden`
- `trajectory_volatility`
- `time_to_critical_estimate`
- `acute_attack_risk_24h`
- `mortality_proxy`
- `global deterioration score`

Karakter:

- deterministik
- longitudinal
- tidak berjalan otomatis hanya dari user membuka `VITAL SIGN`

### 2. Differential Insight Builder

Lokasi utama:

- `lib/iskandar-diagnosis-engine/differential-diagnosis.ts`
- dipakai oleh `components/clinical/ClinicalDifferential.tsx`

Algoritme:

- ekstraksi signal keluhan
- matching signal ke suggestion diagnosis
- derivasi `vital drivers`
- derivasi `supporting exam plan`

Karakter:

- deterministic enrichment
- membantu penalaran diferensial
- downstream dari halaman `VITAL SIGN`

### 3. Full CDSS Engine

Lokasi utama:

- `lib/iskandar-diagnosis-engine/engine.ts`

Pipeline:

1. anonymize
2. red flag checks
3. symptom matcher
4. epidemiology weights
5. constrained LLM reasoner
6. traffic light
7. validation
8. audit

Karakter:

- engine besar lintas-fitur
- tidak identik dengan mesin lokal halaman `VITAL SIGN`

## C. Ada Di Repo Tapi Belum Menjadi Mesin Utama Halaman VITAL SIGN

### 1. `inferVitals()`

Lokasi utama:

- `lib/emergency-detector/ttv-inference.ts`

Fungsi:

- inferensi `pulse`, `RR`, dan `temperature` dari pola gejala
- memakai keyword symptom pattern
- menghasilkan nilai dalam range melalui random sampling

Status saat ini:

- ada di codebase
- tidak menjadi mesin utama halaman `VITAL SIGN` aktif saat ini

Catatan:

- karena memakai random range, modul ini lebih cocok dianggap helper eksperimen / legacy support daripada decision core saat ini

### 2. Occult Shock Detector

Lokasi utama:

- `lib/emergency-detector/occult-shock-detector.ts`
- `components/clinical/OccultShockDetector.tsx`

Algoritme:

- baseline BP median dari 3 kunjungan
- relative hypotension `delta SBP >= 40`
- `MAP < 65`
- perfusion assessment
- integrated priority workflow

Status saat ini:

- engine-nya ada
- UI komponennya ada
- tetapi belum menjadi gate inline utama pada layar `VITAL SIGN`

### 3. Hardcoded Red Flag Rules

Lokasi utama:

- `lib/iskandar-diagnosis-engine/red-flags.ts`

Rule yang tersedia:

- qSOFA / sepsis
- ACS
- preeklampsia
- stroke FAST
- hipoglikemia berat
- anafilaksis

Status saat ini:

- aktif di CDSS engine
- belum menjadi sumber alert lokal pertama di `TTVInferenceUI`

## D. Apa Yang BUKAN Aktif Sekarang

Halaman `VITAL SIGN` saat ini bukan:

- `NEWS2` penuh
- sepsis scoring engine lengkap di layar utama
- occult shock inline wajib
- auto-inference vital signs penuh dari keluhan

## E. Source Of Truth Saat Ini

Kalau tim bertanya "halaman VITAL SIGN sekarang sebenarnya ditenagai apa?", jawaban paling akurat adalah:

1. `components/clinical/TTVInferenceUI.tsx`
   - source of truth untuk screening lokal, intake, dan consult initiation
2. `lib/clinical/anamnesa-composer.ts`
   - source of truth untuk `AutoComplete+`
3. `entrypoints/sidepanel/main.tsx`
   - source of truth untuk wiring patient context, chronic history, visit history, dan routing ke flow lanjutan

## F. Keputusan Arsitektur Yang Aman Untuk Komunikasi Tim

Kalimat yang aman dipakai ke tim:

- halaman `VITAL SIGN` saat ini memakai `custom deterministic gate-based screening`
- halaman ini belum memakai `NEWS2` penuh
- `Trajectory`, `Differential`, dan `CDSS Engine` adalah layer lanjutan setelah intake
- `inferVitals()` dan `Occult Shock` ada di repo, tetapi belum menjadi engine utama halaman inti saat ini

## Related Files

- `components/clinical/TTVInferenceUI.tsx`
- `entrypoints/sidepanel/main.tsx`
- `lib/clinical/anamnesa-composer.ts`
- `lib/emergency-detector/ttv-inference.ts`
- `lib/emergency-detector/occult-shock-detector.ts`
- `lib/iskandar-diagnosis-engine/red-flags.ts`
- `lib/iskandar-diagnosis-engine/trajectory-analyzer.ts`
- `lib/iskandar-diagnosis-engine/differential-diagnosis.ts`
- `lib/iskandar-diagnosis-engine/engine.ts`
