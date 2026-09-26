# File: docs/CLINICAL_LOGIC.md | App: intelligenceBoard | Repo: abyss-monorepo | Updated: 2026-03-16
# Architected and built by Drferdi.

# Clinical Logic — IntelligenceBoard

> ⚠️ Alat bantu keputusan klinis. Keputusan akhir ada pada dokter.

---

## Iskandar Diagnosis Engine V2 (IDE-V2)

**File:** `src/lib/cdss/engine.ts`

IDE-V2 adalah LLM-first CDSS yang digroundkan pada Knowledge Base 159 penyakit KKI.

### Pipeline

```
1. HARDCODED VITAL RED FLAGS (tidak butuh LLM — always runs)
   ├── SpO2 < 90%              → emergency: Hipoksia Berat
   ├── Sistolik ≥ 180 mmHg     → emergency: Hipertensi Krisis
   ├── Sistolik < 90 mmHg      → emergency: Hipotensi/Syok
   ├── HR > 140 bpm            → urgent: Takikardia Berat
   ├── HR < 45 bpm             → urgent: Bradikardia Berat
   ├── Suhu ≥ 40°C             → urgent: Hiperpireksia
   ├── RR > 30 x/mnt           → urgent: Takipnea Berat
   └── RR < 8 x/mnt            → emergency: Bradipnea/Depresi Napas

2. CANDIDATE RETRIEVAL (Hybrid)
   ├── Keyword pre-filter dari penyakit.json (159 penyakit KKI)
   └── Semantic embedding filter (jika EMBEDDING_API tersedia)
       → Merge + deduplicate, max 18 kandidat

3. LLM REASONING
   ├── Primary: DeepSeek Reasoner — deepseek-reasoner, temp 0.2, max 4096 tokens
   │   System prompt: "Kamu adalah Iskandar Engine V2 — CDSS untuk dokter di Puskesmas"
   │   Output: Structured JSON (min 2, max 5 suggestions)
   └── Fallback: deterministic local fallback / provider-neutral adapter
       Trigger: Jika DeepSeek API error, timeout (30 detik), atau runtime komersial tidak diizinkan

4. VALIDATION
   ├── validateLLMSuggestions: verifikasi ICD-10, nama, plausibility klinis
   └── applyHybridDecisioning: kategorisasi → recommended / review / must_not_miss / deferred

5. OUTPUT (CDSSEngineResult)
   ├── suggestions[]: rank, icd10_code, diagnosis_name, confidence (0-1), reasoning,
   │   key_reasons, missing_information, red_flags, recommended_actions
   ├── red_flags[]: severity (emergency/urgent/warning), condition, action, criteria_met
   ├── alerts[]: type (red_flag/vital_sign/low_confidence/guideline), severity
   ├── validation_summary: counts, unverified_codes, warnings
   └── next_best_questions[]
```

### Knowledge Base

- **File:** `penyakit.json` (dalam `src/lib/cdss/`)
- **Isi:** 159 penyakit Kompendium Klinisi Indonesia (KKI)
- **Format per entry:** `icd10, nama, definisi, gejala[], red_flags[], diagnosis_banding[]`
- **Index:** Field ICD-10, nama, gejala digunakan untuk keyword pre-filter

### Confidence Scale

| Score | Interpretasi |
|-------|-------------|
| 0.0 – 0.2 | Sangat tidak yakin |
| 0.3 – 0.4 | Kurang yakin |
| 0.5 – 0.6 | Mungkin |
| 0.7 – 0.8 | Cukup yakin |
| 0.9 – 1.0 | Sangat yakin |

Confidence < 0.3 → alert `low_confidence` otomatis ditambahkan.

### Status Engine
```typescript
getCDSSEngineStatus() → {
  ready: boolean,             // KB loaded + minimal 1 API key tersedia
  kb_disease_count: number,   // 159 (penyakit KKI)
  model: string               // "IDE-V2 (deepseek-reasoner → deterministic local fallback)"
}
```

---

## Audrey — Voice AI Assistant

**File:** `server.ts` + `src/lib/audrey-persona.ts`

### Status Runtime
Voice runtime eksternal sedang dinonaktifkan selama Google exit. Endpoint voice aktif saat ini hanya boleh mengembalikan status disabled atau local-only.

### Mode Operasi
**PTT (Push-to-Talk)** — mode live lama diarsipkan untuk referensi perilaku UX.
- Dokter tekan tombol → event PTT lokal dimulai
- Dokter lepas tombol → turn diselesaikan oleh runtime aktif yang tersedia atau dikembalikan sebagai `disabled`

### Addressing Berbasis Profesi
| Profesi | Panggilan |
|---------|-----------|
| Dokter / Dokter Gigi | `Dokter [NamaDepan]` |
| Bidan | `Bu Bidan [NamaDepan]` |
| Perawat (P) | `Bu Nurse [NamaDepan]` |
| Perawat (L) | `Pak Perawat [NamaDepan]` |
| Chief (ferdi/ferdi-balowerti) | Penanganan khusus |

### Konteks Fasilitas (Hardcoded di System Prompt)
- Nama: UPTD Puskesmas PONED Balowerti, Kota Kediri
- Kepala: drg. Endah Retno W.
- Layanan: pemeriksaan umum, gigi, KIA, gizi, imunisasi, KB, jiwa, farmasi, VCT, lab, TB, kesehatan lingkungan
- **Keterbatasan:** tidak ada CT scan, MRI, spesialis on-site, ICU, ventilator
- **Tersedia:** lab dasar, EKG sederhana, oksimetri, obat esensial Fornas

### Latency Monitoring
- First audio chunk latency: dicatat di log `[Audrey] ⚡ first audio chunk — latency: Xms`
- Turn complete total: dicatat di log `[Audrey] turn_complete — total: Xms`

---

## EMR Auto-Fill Engine

**File:** `src/lib/emr/engine.ts`

### Flow
```
1. Check/reuse browser session (TTL: 30 menit)
2. Login ke ePuskesmas jika session expired
3. Navigate ke halaman yang diperlukan
4. RMETransferOrchestrator dispatch ke handler:
   ├── anamnesa.ts   — Isi anamnesa
   ├── diagnosa.ts   — Isi diagnosa ICD-10
   └── resep.ts      — Isi resep obat
5. Emit progress events via socket-bridge
6. Append ke EMR history
```

### Triage Relay
EMR triage data bisa dikirim dari perawat (triage) ke dokter:
- Socket event: `emr:triage-send` → `emr:triage-receive`
- Server memverifikasi identity pengirim dari session (tidak dari client payload)

---

## Clinical Utilities

| File | Fungsi |
|------|--------|
| `src/lib/clinical/trajectory-analyzer.ts` | Analisis trajectory penyakit kronik |
| `src/lib/clinical/chronic-disease-classifier.ts` | Klasifikasi penyakit kronik |
| `src/lib/clinical/formulary-resolver.ts` | Resolve obat ke FORNAS |
| `src/lib/clinical/finalization-therapy-engine.ts` | Finalisasi terapi berdasarkan diagnosis |
| `src/lib/clinical/manual-medication-suggestions.ts` | Saran obat manual |
| `src/lib/htn-classifier.ts` | Klasifikasi hipertensi |
| `src/lib/glucose-classifier.ts` | Klasifikasi gula darah |
| `src/lib/occult-shock-detector.ts` | Deteksi syok tersembunyi |
| `src/lib/calculators/medical-calculators.ts` | Kalkulator medis |
| `src/lib/lb1/` | LB1 reporting engine (ICD-10 2010, BPJS) |

---

## LB1 Reporting Engine

**Directory:** `src/lib/lb1/`

- Engine untuk generate laporan LB1 (format BPJS/Kemenkes)
- Menggunakan ICD-10 2010 mapping (`icd10-2010.ts`, `icd-mapping.ts`)
- Export ke format Excel/RME (`rme-export.ts`, `template-writer.ts`)
- Proses: `io.ts` → `process.ts` → `transform.ts` → `template-writer.ts`

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
