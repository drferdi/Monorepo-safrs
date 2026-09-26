# Vital Sign Engine Comparison Matrix

Tanggal: 2026-04-06

## Tujuan

Dokumen ini membandingkan implementasi engine `VITAL SIGN / triage` antara:

- `sentra-assist`
- `primary-healthcare/dashboard`

Tujuannya adalah mengidentifikasi:

- overlap
- gap
- risiko drift
- target `source of truth`
- arah migrasi yang aman

## Scope

Perbandingan difokuskan pada domain:

- screening vital sign
- scoring / early warning
- red flags
- occult shock
- trajectory / longitudinal intelligence
- persistence vital
- drafting anamnesa
- consult relay
- structured bedside signs

## Matrix

| Domain                                  | `sentra-assist` sekarang                                                | `dashboard` sekarang                                                                  | Risiko drift  | Rekomendasi source of truth                            | Aksi arsitektur                                                           |
| --------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| Vital screening lokal                   | Ada threshold gate lokal di `components/clinical/TTVInferenceUI.tsx`    | Ada hardcoded vital red flags di `src/lib/cdss/engine.ts`                             | Tinggi        | `dashboard`                                            | Samakan threshold dan pindahkan ke core shared module                     |
| MAP / perfusi dasar                     | Ada `MAP` lokal di UI                                                   | Ada `MAP` dalam occult shock + composite reasoning                                    | Sedang        | `dashboard`                                            | Jadikan `MAP` helper shared                                               |
| NEWS2                                   | Tidak ada NEWS2 penuh                                                   | Ada `NEWS2` nyata di `src/lib/cdss/news2.ts`                                          | Sangat tinggi | `dashboard`                                            | Jangan bangun NEWS2 baru di extension; konsumsi dari engine yang sama     |
| Hardcoded red flags                     | Ada alert lokal intake                                                  | Ada hardcoded red flags formal + alert governance                                     | Tinggi        | `dashboard`                                            | Alert semantics harus disatukan                                           |
| Disease-specific early warning patterns | Tidak ada                                                               | Ada di `src/lib/cdss/early-warning-patterns.ts`                                       | Sangat tinggi | `dashboard`                                            | Extension cukup kirim input/context, bukan implement rule baru            |
| Occult shock                            | Ada engine + komponen di repo                                           | Ada engine yang sangat mirip di dashboard                                             | Sangat tinggi | `dashboard` atau shared core                           | Hindari rawat dua versi; ekstrak jadi shared package                      |
| Trajectory analyzer                     | Ada, tetapi lebih ringan                                                | Ada, lebih kaya (`SpO2`, `AVPU`, momentum)                                            | Tinggi        | `dashboard`                                            | Gunakan dashboard/shared core sebagai engine longitudinal utama           |
| Vital persistence longitudinal          | Tidak ada persistence native; mengandalkan scrape/runtime visit history | Ada DB persistence di `src/lib/vitals/vital-record-service.ts`                        | Sangat tinggi | `dashboard`                                            | Extension kirim intake/vital ke persistence, bukan menyimpan rule sendiri |
| Structured bedside signs                | Belum formal; masih mostly local fields + notes                         | Ada `structured_signs_text` dan parser formal                                         | Tinggi        | `dashboard`                                            | Definisikan kontrak structured signs tunggal                              |
| Composite deterioration summary         | Tidak ada sebagai objek formal                                          | Ada `deterioration_summary_text` pada CDSS input                                      | Sedang        | `dashboard`                                            | Extension kirim sinyal dasar, dashboard hitung komposit                   |
| Intake RME extraction                   | Kuat: chronic history, allergies, pregnancy, payer, special conditions  | Fokus server/CDSS, bukan extractor RME extension                                      | Rendah        | `sentra-assist`                                        | Tetap lokal di extension                                                  |
| AutoComplete+ anamnesa drafting         | Ada dan aktif                                                           | Tidak terlihat sebagai engine yang sama                                               | Rendah        | `sentra-assist`                                        | Tetap lokal, tetapi output bisa dipakai downstream                        |
| Doctor ranking / consult target         | Ada, aktif di extension                                                 | Dashboard fokus presence + receiver side                                              | Sedang        | Shared contract, UI tetap di extension                 | Pertahankan UI di extension, semantik status di backend/dashboard         |
| Consult relay ke dokter                 | Ada `Forward to Doctor`                                                 | Ada telemedicine / triage relay mapper                                                | Sedang        | Shared payload contract                                | Satu kontrak payload lintas app                                           |
| Clinical governance docs                | Ada tapi lebih ringan                                                   | Lebih tegas dan formal (`ARCHITECTURE.md`, `docs/CLINICAL_LOGIC.md`, governance docs) | Sedang        | `dashboard` docs sebagai canonical clinical governance | Extension docs merujuk governance canonical                               |

## Ringkasan Inti

### Yang Sebaiknya Tetap Dimiliki `sentra-assist`

- UX intake cepat
- extractor RME / ePuskesmas
- sinkronisasi field form
- `AutoComplete+`
- pemilihan dokter online
- consult initiation

### Yang Sebaiknya Dipimpin `dashboard`

- NEWS2
- hardcoded vital red flags final
- disease-specific early warning patterns
- occult shock
- trajectory / momentum
- persistence vital longitudinal
- governance semantics untuk alerts

### Yang Paling Berisiko Bila Dibiarkan Ganda

- threshold vital sign
- severity mapping
- occult shock logic
- trajectory risk semantics
- alert titles / actions / escalation meaning

## Keputusan Arsitektur Yang Direkomendasikan

### Model Target

`sentra-assist` menjadi:

- capture layer
- RME extraction layer
- bedside intake layer
- consult relay layer

`dashboard` menjadi:

- clinical intelligence layer
- scoring layer
- longitudinal analysis layer
- governance source of truth

### Prinsip Migrasi

1. jangan memindahkan UX intake extension ke dashboard
2. jangan menggandakan clinical scoring di dua app
3. pindahkan engine yang duplicated ke shared core atau jadikan dashboard sebagai authority
4. extension boleh punya `preview alert` lokal, tetapi semantics final harus sama dengan engine canonical

## Priority Actions

1. Bekukan definisi threshold vital di satu tempat canonical.
2. Putuskan owner tunggal untuk `occult shock`.
3. Jadikan `NEWS2` dashboard sebagai implementasi resmi.
4. Definisikan kontrak `TriageInput` tunggal dari extension ke dashboard.
5. Rancang shared module untuk:
   - vital threshold constants
   - NEWS2
   - occult shock
   - trajectory primitives

## Related Files

### Med Assist

- `components/clinical/TTVInferenceUI.tsx`
- `lib/clinical/anamnesa-composer.ts`
- `lib/emergency-detector/ttv-inference.ts`
- `lib/emergency-detector/occult-shock-detector.ts`
- `lib/iskandar-diagnosis-engine/trajectory-analyzer.ts`
- `lib/iskandar-diagnosis-engine/red-flags.ts`

### Dashboard Intelligence

- `src/lib/cdss/engine.ts`
- `src/lib/cdss/news2.ts`
- `src/lib/cdss/early-warning-patterns.ts`
- `src/lib/cdss/types.ts`
- `src/lib/clinical/trajectory-analyzer.ts`
- `src/lib/occult-shock-detector.ts`
- `src/lib/vitals/vital-record-service.ts`
- `src/lib/telemedicine/consult-to-bridge-mapper.ts`
