# MedLens Backend-First Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengalihkan MedLens ECG dari local-service-first menjadi backend-first tanpa mengubah contract result klinis yang sudah ada.

**Architecture:** Extension tetap menjadi client tipis yang hanya memanggil adapter `medlensClient`. Crew/MedLens backend menjadi transport utama untuk upload, OCR, parser, dan result assembly. Local harness di repo ini tetap hidup hanya untuk internal dev/test dan tidak pernah menjadi UX operasional.

**Crew backend acceptance contract:** `docs/medlens/2026-06-21-crew-medlens-backend-contract.md`

**Tech Stack:** WXT extension, TypeScript, MedLens client adapter, Crew/MedLens HTTP API, existing OCR/parser/result-contract modules

---

### Task 1: Freeze the Frontend Boundary

**Files:**

- Modify: `(legacy) code-prototype/prototpe-assist/lib/api/medlens-client.ts`
- Reference: `(legacy) code-prototype/prototpe-assist/lib/clinical/medlens/ecg-types.ts`
- Test: `(legacy) code-prototype/prototpe-assist/lib/api/medlens-client.test.ts`

- [ ] Keep upload entrypoint fixed at `medlensClient.analyzeEcgImage(file)`.
- [ ] Keep endpoint path fixed at:

```text
POST /api/medlens/ecg/analyze
```

- [ ] Keep request body fixed at:

```text
multipart/form-data
field: file
```

- [ ] Keep response normalized to existing `MedlensEcgAnalyzeResponse`.
- [ ] Send upload through the existing Crew authenticated upload transport:

```text
authedUpload('/api/medlens/ecg/analyze', formData)
```

- [ ] Do not hardcode localhost as product default.

### Task 2: Freeze the Backend Contract

**Files:**

- Reference: `(legacy) code-prototype/prototpe-assist/lib/clinical/medlens/ecg-types.ts`
- Reference: `(legacy) code-prototype/prototpe-assist/lib/clinical/medlens/ecg-result-normalizer.ts`
- Reference: `(legacy) code-prototype/prototpe-assist/services/medlens-local/ecg-analyzer.mjs`

- [ ] Crew/MedLens backend must return this contract shape:

```json
{
  "status": "ok",
  "module": "ecg",
  "image_quality": { "readable": true, "issues": [] },
  "ocr_extracted_values": {
    "heart_rate_or_ventricular_rate": null,
    "pr_interval": null,
    "qrs_duration": null,
    "qt": null,
    "qtc": null,
    "p_axis": null,
    "r_axis": null,
    "t_axis": null,
    "rhythm_statement": null,
    "machine_interpretation_text": null
  },
  "ocr_metadata": {
    "ocr_source": "crop",
    "selected_region": null,
    "region_score": 0,
    "candidate_count": 0,
    "fallback_used": false
  },
  "raw_ecg_relevant_text": [],
  "ignored_or_redacted_identifiers_detected": false,
  "physician_verification_required": true,
  "extracted_observations": {
    "heart_rate": null,
    "rhythm": null,
    "pr_interval": null,
    "qrs_duration": null,
    "qt_qtc": null,
    "axis": null,
    "st_t_changes": [],
    "notable_findings": []
  },
  "clinical_support": {
    "summary": "",
    "possible_considerations": [],
    "red_flags": [],
    "recommended_physician_checks": []
  },
  "limitations": [],
  "confidence": "low",
  "disclaimer": "This output supports clinical reasoning and requires physician verification. It is not a final diagnosis."
}
```

- [ ] Keep these safety rules in backend:
  - no final diagnosis claim
  - no waveform interpretation in v1
  - no patient identifier output
  - uncertainty remains visible
  - physician verification remains mandatory

### Task 3: Backend Auth and Availability

**Files:**

- Modify later: `(legacy) code-prototype/prototpe-assist/lib/api/medlens-client.ts`
- Coordinate with Crew backend owner

- [ ] Decide one auth transport only for MedLens backend:
  - default: existing Crew session cookie or `X-Crew-Access-Token` from Med Assist auth config
  - no separate MedLens token unless Crew backend requires a future entitlement split

- [ ] Return non-technical operational failures to frontend, for example:

```json
{ "message": "MedLens belum tersedia saat ini." }
```

- [ ] Never return physician-facing instructions to start local service or type terminal commands.

### Task 4: Local Harness Demotion

**Files:**

- Keep internal: `(legacy) code-prototype/prototpe-assist/services/medlens-local/server.mjs`
- Keep internal: `(legacy) code-prototype/prototpe-assist/services/medlens-local/ecg-analyzer.mjs`
- Keep internal: `(legacy) code-prototype/prototpe-assist/services/medlens-local/ecg-ocr.mjs`

- [ ] Keep harness only for:
  - parser/OCR regression tests
  - synthetic fixture smoke tests
  - backend development comparison

- [ ] Do not expose these internal commands in physician-facing UX:

```bash
node services/medlens-local/server.mjs
```

### Task 5: Verification Gate for Crew Cutover

**Files:**

- Test: `(legacy) code-prototype/prototpe-assist/lib/api/medlens-client.test.ts`
- Test: `(legacy) code-prototype/prototpe-assist/components/clinical/medlens/EcgDiagnosticAssist.test.tsx`
- Test: `(legacy) code-prototype/prototpe-assist/tests/medlens-local/server.test.ts`

- [ ] Frontend focused verification:

```bash
npm exec vitest run lib/api/medlens-client.test.ts components/clinical/medlens/EcgDiagnosticAssist.test.tsx
```

- [ ] Shared contract verification:

```bash
npm exec vitest run lib/clinical/medlens/ecg-result-normalizer.test.ts tests/medlens-local/server.test.ts tests/medlens-local/ecg-ocr.test.ts
```

- [ ] Repo gate:

```bash
npm run typecheck
npm run build
```

### Recommended Phase Order

1. Route frontend adapter through existing Crew authenticated upload transport
2. Keep contract exactly stable
3. Move OCR/parser execution to Crew backend
4. Preserve local harness only for internal regression/testing
5. Remove any remaining product copy that implies localhost or terminal use
