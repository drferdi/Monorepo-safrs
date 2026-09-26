# Crew MedLens ECG Backend Contract

## Product Boundary

MedLens ECG is backend-first. Med Assist is a thin clinical client and calls only:

```text
medlensClient.analyzeEcgImage(file)
```

The network boundary is:

```text
POST /api/medlens/ecg/analyze
```

## Auth

The route must use the existing Crew auth boundary:

- accept Crew cookie-backed session when available
- accept `X-Crew-Access-Token` for configured automation-token workflows
- return `401` for missing or expired auth
- return `403` for authenticated users without MedLens access

No separate MedLens token is required for v1.

## Request

```http
POST /api/medlens/ecg/analyze
Content-Type: multipart/form-data
X-Crew-Access-Token: <existing Crew automation token when used>
```

Multipart fields:

```text
file: PNG, JPG, or JPEG ECG printout image
```

Server-side validation:

- reject missing `file` with status `400`
- reject non-image or unsupported extension with status `415`
- reject files larger than 10 MB with status `413`
- do not log raw image bytes
- do not persist image bytes beyond the request unless Crew has an explicit audited retention policy

## Success Response

Return JSON matching `MedlensEcgAnalyzeResponse`:

```json
{
  "status": "ok",
  "module": "ecg",
  "image_quality": { "readable": true, "issues": [] },
  "ocr_extracted_values": {
    "heart_rate_or_ventricular_rate": "82 bpm",
    "pr_interval": "164 ms",
    "qrs_duration": "96 ms",
    "qt": "376 ms",
    "qtc": "428 ms",
    "p_axis": "55 deg",
    "r_axis": "69 deg",
    "t_axis": "31 deg",
    "rhythm_statement": "Normal sinus rhythm",
    "machine_interpretation_text": "Nonspecific ST abnormality"
  },
  "ocr_metadata": {
    "ocr_source": "crop",
    "selected_region": "structured-ecg",
    "region_score": 18,
    "candidate_count": 3,
    "fallback_used": false
  },
  "raw_ecg_relevant_text": [
    "Ventricular rate 82 bpm",
    "PR interval 164 ms",
    "QRS duration 96 ms",
    "QT/QTc 376/428 ms"
  ],
  "ignored_or_redacted_identifiers_detected": true,
  "physician_verification_required": true,
  "extracted_observations": {
    "heart_rate": 82,
    "rhythm": "Normal sinus rhythm",
    "pr_interval": "164 ms",
    "qrs_duration": "96 ms",
    "qt_qtc": "376 ms / 428 ms",
    "axis": "P 55 deg | R 69 deg | T 31 deg",
    "st_t_changes": [],
    "notable_findings": ["Nonspecific ST abnormality"]
  },
  "clinical_support": {
    "summary": "ECG text extraction support only. Printed ECG text was mapped conservatively and every value still requires physician verification against the original ECG printout.",
    "possible_considerations": [],
    "red_flags": [],
    "recommended_physician_checks": [
      "Verifikasi heart rate, rhythm, dan interval secara manual dari printout EKG.",
      "Cocokkan teks OCR dengan hasil cetak asli sebelum dipakai dalam dokumentasi klinis."
    ]
  },
  "limitations": [
    "Only ECG-relevant printed text is exposed in v1 output.",
    "Confidence is conservative and every printed value requires physician verification.",
    "Do not use OCR text extraction as a substitute for ECG interpretation or diagnosis."
  ],
  "confidence": "moderate",
  "disclaimer": "This output supports clinical reasoning and requires physician verification. It is not a final diagnosis."
}
```

## Safety Rules

The backend must enforce:

- no final diagnosis claim
- no waveform digitization in v1
- no waveform interpretation in v1
- no treatment recommendation
- no patient identifier output in structured response
- raw OCR text must be filtered to ECG-relevant lines only
- `physician_verification_required` must always be `true`
- missing values must stay `null` or empty arrays
- confidence must stay conservative; use `low` unless structured ECG text is clearly extracted

## Error Responses

Use neutral messages:

```json
{ "message": "MedLens belum tersedia saat ini." }
```

```json
{ "message": "Field file wajib berisi gambar EKG." }
```

```json
{ "message": "Format gambar EKG tidak didukung. Gunakan PNG, JPG, atau JPEG." }
```

Never return user-facing text that mentions:

- localhost
- port
- terminal
- command
- Native Messaging
- companion app
- `node services/medlens-local/server.mjs`

## Staging Smoke

1. Configure Med Assist against Crew staging.
2. Login or configure an automation token.
3. Upload a de-identified ECG PNG from MedLens.
4. Confirm Crew receives `POST /api/medlens/ecg/analyze`.
5. Confirm request is `multipart/form-data`.
6. Confirm multipart field name is `file`.
7. Confirm response renders OCR measurements, machine text, confidence, limitations, privacy guard, physician checks, and disclaimer.
8. Confirm patient identifiers do not render.
9. Disable the Crew MedLens route and confirm Med Assist shows a neutral unavailable message.
