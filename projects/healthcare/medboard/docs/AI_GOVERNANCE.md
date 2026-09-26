# File: docs/AI_GOVERNANCE.md | App: intelligenceBoard | Repo: abyss-monorepo | Updated: 2026-03-16
# Architected and built by Drferdi.

# AI Governance — IntelligenceBoard

> _"Technology enables, but humans decide."_ — Sentra Healthcare Solutions

---

## AI Components Aktif

| Komponen | Model | Tujuan | Status |
|----------|-------|--------|--------|
| **Iskandar Engine V2 (IDE-V2)** | DeepSeek Reasoner + deterministic local fallback | Differential diagnosis CDSS | ✅ Production |
| **Audrey Voice AI** | Voice lane under re-baseline | Voice clinical assistant | ⛔ Disabled during Google exit |
| **AI Insights Panel** | via `src/lib/intelligence/ai-insights.ts` | Intelligence Dashboard insights | ✅ Production |

---

## Prinsip Non-Negosiable

### 1. Human Authority
Semua output CDSS adalah **decision support** — bukan diagnosis definitif. Disclaimer klinis wajib di setiap response:
```
"Ini adalah alat bantu keputusan klinis. Keputusan akhir ada pada dokter."
```
Alert `guideline` dengan disclaimer ini selalu di-inject ke setiap `CDSSEngineResult.alerts[]`.

### 2. Transparency
Setiap suggestion CDSS menyertakan:
- `confidence` score (0–1, jelas di UI)
- `reasoning` — narasi reasoning LLM
- `key_reasons[]` — faktor pendukung
- `missing_information[]` — data yang belum ada
- `rag_verified: boolean` — apakah ICD-10 valid di KB
- `decision_status` — recommended / review / must_not_miss / deferred
- `AI Disclosure Badge` — ditampilkan di Intelligence Dashboard

### 3. Guardrails Struktural
Hardcoded vital signs red flags di `engine.ts` **tidak bisa diubah oleh LLM**:
- SpO2 < 90% → emergency (hardcoded, bukan LLM)
- Sistolik ≥ 180 atau < 90 → emergency (hardcoded)
- HR > 140 atau < 45 → urgent (hardcoded)
- Suhu ≥ 40°C → urgent (hardcoded)
- RR > 30 atau < 8 → urgent/emergency (hardcoded)

LLM hanya menghasilkan suggestions dan clinical red flags tambahan — vital red flags sudah fixed.

### 4. PHI-Free by Design
LLM **tidak menerima** nama pasien, NIK, tanggal lahir, atau identifier apapun.
`CDSSEngineInput` hanya berisi data klinis anonim (keluhan, vital, usia/jenis kelamin, kondisi kronik).

---

## Accountability

| Keputusan | Penanggung Jawab |
|-----------|----------------|
| Diagnosis akhir | Dokter pemeriksa |
| Clinical validation IDE-V2 | Chief (Dr. Ferdi Iskandar) |
| Production deployment approval | Chief (Gate 5 sign-off) |
| Red flag threshold changes | Chief — wajib review klinis |
| Security incident response | Chief + DevOps |
| PHI breach response | Chief (notifikasi dalam 1 jam) |

---

## Observability & Audit Trail

### Sentry (Error Tracking)
- Config: `src/lib/intelligence/sentry.config.ts`
- PHI scrubbing aktif via `beforeSend` hook
- Session replay: **nonaktif** (`replaysSessionSampleRate = 0`)
- Traces sample rate: 10% di production, 100% di development

### Langfuse (LLM Observability)
- Config: `src/lib/intelligence/langfuse.config.ts`
- Standalone mode: no-op (tracing di monorepo level)
- Target: trace setiap IDE-V2 call dengan input hash + output summary

### Security Audit Log (Database)
- Setiap request ke `/api/cdss/diagnose` dicatat
- Fields: action, result, userId (SHA-256), role, IP, model_version, output summary
- PHI tidak masuk ke audit log

### CDSS Audit
- `writeCDSSAuditEntry()` dipanggil setelah setiap diagnosis request
- Menyimpan: sessionId, validationStatus, modelVersion, latencyMs, outputSummary (numerik)
- Output summary: jumlah suggestions, red flags — **bukan konten diagnosis**

---

## Incident Response

1. Identifikasi komponen AI yang bermasalah
2. Suspend endpoint terkait segera
3. Notifikasi Chief dalam 1 jam
4. Root cause analysis
5. Tulis incident log di `docs/cognitorium/logs/`
6. Fix melalui gate process normal (tidak ada hotfix bypass gate)

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
