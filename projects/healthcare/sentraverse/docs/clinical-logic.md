# Clinical Logic — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Scope

This document describes the clinical content and logic **displayed** on
`sentra-main`. This site contains no executable clinical decision logic — it
presents Sentra's capabilities to an external audience through static and
simulated content.

Real clinical logic (CDSS Iskandar Engine, Audrey Live, trajectory analysis)
runs in the production dashboard: `app/primary-healthcare/dashboard/` (repo:
`intelligence-dashboard`).

---

## Sentra's 7 Clinical Protocols (Displayed in `Services.tsx`)

The landing page presents Sentra's platform through seven clinical service
modules. The descriptions below are sourced directly from
`components/Services.tsx`.

| ID  | Protocol                                | Description                                                                                                                                                                                                                                                         |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | **Synthesia Engine**                    | NLP klinis real-time yang mentransformasi narasi pasien tidak terstruktur — keluhan, riwayat penyakit, catatan dokter — menjadi entitas medis terstruktur. Melakukan ekstraksi entitas, normalisasi terminologi medis, dan sintesis input ke bahasa klinis standar. |
| 02  | **Bayesian Algorithm**                  | Mesin probabilitas posterior yang menghitung diagnosis diferensial berdasarkan rasio likelihood gejala, prevalensi klinis, dan faktor risiko spesifik pasien. Menghasilkan hipotesis diagnostik terurut dengan interval kepercayaan untuk validasi dokter.          |
| 03  | **Clinical Trajectory**                 | Pemetaan trajectory pasien longitudinal yang memvisualisasikan progresi penyakit lintas kunjungan. Mendeteksi anomali tren, memprediksi jendela deteriorasi, dan memungkinkan intervensi klinis dengan presisi waktu yang tepat.                                    |
| 04  | **Optical Character Recognition**       | Kecerdasan dokumen tingkat medis yang mengekstrak data terstruktur dari rekam fisik — hasil laboratorium, radiograf, resep — dengan skor kepercayaan per field.                                                                                                     |
| 05  | **AI Powered Pharmaceutical**           | Lapisan farmakovigilans otomatis yang mencocok-silangkan profil medikasi pasien terhadap basis data interaksi obat-obat, rekam alergi, dan kontraindikasi komorbiditas. Menghasilkan peringatan keamanan real-time sebelum finalisasi resep.                        |
| 06  | **Smart Referral & Auto Documentation** | Mesin sintesis rujukan cerdas dan dokumentasi klinis otomatis. Menghasilkan ringkasan pemulangan terstandarisasi, surat rujukan, dan catatan kunjungan — mengurangi beban administratif dokter hingga 40%.                                                          |
| 07  | **Clinical Prognosis**                  | Pemodelan prediktif outcome yang menyintesis data trajectory pasien, profil komorbiditas, dan pola respons terapi untuk menghasilkan asesmen prognostik berbasis evidens. Mendukung pengambilan keputusan klinis dengan timeline terstratifikasi risiko.            |

---

## SentraSim Demo Case — Clinical Basis

The SentraSim simulation is built around a CAP (Community-Acquired Pneumonia)
case. The clinical content is reviewed for plausibility by Dr. Ferdi Iskandar.

**Case:** Female, 46 years — RSIA Melinda DHAI

**Clinical presentation:**

- High fever (38.8°C), productive green cough
- Dyspnea on light exertion
- Right-sided pleuritic chest pain

**Key findings:**

- Leukocytosis 15,200/uL — neutrophilic pattern
- CRP 86 mg/L — significant acute inflammation
- Chest X-ray: right lower lobe infiltrate, consolidation pattern consistent
  with CAP

**Triage tags displayed:** Demam Tinggi (SYMPTOM), Batuk Produktif Hijau
(SYMPTOM), Sesak Aktivitas Ringan (RED FLAG), Nyeri Pleuritik Kanan
(OBSERVATION)

---

## ClinicalTrajectory Demo Case — Clinical Basis

**Patient profile:** Adult with Hypertension Stage 2 + DM Type 2 — 4-visit
longitudinal follow-up

**Clinical significance of trajectory:**

- SBP progression: 140 → 148 → 155 → 168 mmHg (+28 mmHg over 3 visits) —
  consistent with uncontrolled Stage 2 HTN
- GDS progression: 210 → 238 → 262 → 284 mg/dL — worsening hyperglycemia,
  approaching crisis threshold
- Combined trajectory: elevated cardiovascular risk, particularly for
  hypertensive crisis and acute coronary syndrome

**Risk probability basis:**

- "Krisis Hipertensi 72%" — SBP 168 with progressive trend, approaching
  hypertensive emergency threshold (≥180 mmHg)
- "Stroke/ACS 58%" — Stage 2 HTN + uncontrolled DM is a validated high-risk
  combination per JNC 8 and ADA guidelines
- "Krisis Glikemik 45%" — GDS 284 mg/dL with upward trend, approaching DKA/HHS
  risk zone

---

## Insights Articles — Clinical Content

Three articles published at v1.0.0, authored/verified by Dr. Ferdi Iskandar:

| Article                                             | Clinical Topics Covered                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Bagaimana AI Mengubah Diagnosis Klinis di Indonesia | Misdiagnosis rates, maternal mortality, clinical decision support, Sentra pilot results                 |
| Clinical Decision Support vs EMR Tradisional        | EMR limitations, CDSS definition, integration patterns, clinical workflow                               |
| Keselamatan Pasien di Era Digital Health            | Malpractice analysis (140+ cases), three pillars of digital clinical safety, Sentra safety architecture |

All articles cite Dr. Ferdi Iskandar's direct clinical and legal research
background. Statistical claims must not be modified without his review.

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
