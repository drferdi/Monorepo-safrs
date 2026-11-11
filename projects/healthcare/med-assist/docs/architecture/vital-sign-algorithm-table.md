# Vital Sign Algorithm Table

Tanggal: 2026-04-06

## Tabel Operasional

| Algoritme                                     | Input utama                                                                        | Output utama                                           | Status wiring                                        | File utama                                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Gate-based vital alert rules                  | SBP, DBP, HR, RR, Temp, SpO2, Glucose                                              | `ScreeningAlert[]`                                     | Aktif sekarang di halaman `VITAL SIGN`               | `components/clinical/TTVInferenceUI.tsx`                                                                  |
| MAP calculation                               | SBP, DBP                                                                           | nilai `MAP`                                            | Aktif sekarang di halaman `VITAL SIGN`               | `components/clinical/TTVInferenceUI.tsx`                                                                  |
| AutoComplete+ deterministic anamnesa composer | gejala singkat, gender, penyakit kronis, alergi, status kehamilan, penyakit khusus | draft anamnesa, `keluhan_utama`, `keluhan_tambahan`    | Aktif sekarang di halaman `VITAL SIGN`               | `lib/clinical/anamnesa-composer.ts`                                                                       |
| Intake context normalization                  | data RME: chronic history, alergi, kehamilan, payer, penyakit khusus               | field intake terprefill dan context consult            | Aktif sekarang di halaman `VITAL SIGN`               | `entrypoints/content.ts`, `entrypoints/sidepanel/main.tsx`, `components/clinical/TTVInferenceUI.tsx`      |
| Doctor routing ranking                        | availability, poli, facility/location                                              | urutan dokter online                                   | Aktif sekarang di halaman `VITAL SIGN`               | `components/clinical/TTVInferenceUI.tsx`                                                                  |
| Clinical Trajectory Analyzer                  | 3-5 visit history + vitals                                                         | trend, risk tier, deterioration score, recommendations | Aktif downstream setelah user lanjut                 | `lib/iskandar-diagnosis-engine/trajectory-analyzer.ts`, `components/clinical/ClinicalTrajectory.tsx`      |
| Differential Insight Builder                  | keluhan, suggestion diagnosis, vitals                                              | matched symptoms, vital drivers, exam plan             | Aktif downstream setelah user lanjut                 | `lib/iskandar-diagnosis-engine/differential-diagnosis.ts`, `components/clinical/ClinicalDifferential.tsx` |
| Full CDSS Engine                              | encounter anonymized context                                                       | diagnosis suggestions, alerts, validation summary      | Aktif downstream / orkestrator engine                | `lib/iskandar-diagnosis-engine/engine.ts`                                                                 |
| `inferVitals()`                               | complaint text + measured vitals parsial                                           | pulse, RR, temp inferred + metadata                    | Ada di repo, belum jadi engine utama halaman         | `lib/emergency-detector/ttv-inference.ts`                                                                 |
| Occult Shock Detector                         | current BP, glucose, baseline BP history, symptoms                                 | occult shock risk, triggers, recommendations           | Ada di repo, belum jadi gate inline utama            | `lib/emergency-detector/occult-shock-detector.ts`, `components/clinical/OccultShockDetector.tsx`          |
| Hardcoded Red Flag Rules                      | keluhan, vital signs, pregnancy, chronic disease, allergies                        | red flag emergencies                                   | Aktif di CDSS engine, belum jadi alert lokal pertama | `lib/iskandar-diagnosis-engine/red-flags.ts`                                                              |

## Interpretasi Singkat

- `Aktif sekarang di halaman VITAL SIGN`
  - user akan melihat efeknya langsung di layar intake
- `Aktif downstream setelah user lanjut`
  - user baru mendapat output setelah membuka trajectory, differential, atau flow lanjutan
- `Ada di repo, belum jadi engine utama halaman`
  - algoritme tersedia, tetapi jangan diasumsikan sudah menjadi perilaku utama layar intake
