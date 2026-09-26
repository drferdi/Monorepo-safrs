# Clinical Trajectory Endpoint Blueprint

Tanggal: 2026-04-06

## Tujuan

Dokumen ini mendefinisikan endpoint canonical yang dipakai `sentra-assist` untuk meminta hasil trajectory dari engine server.

Fokus fase 1:

- `Assist` berhenti menganggap trajectory sebagai engine final lokal
- `Assist` mengirim payload canonical ke server
- server mengembalikan trajectory summary yang siap dirender di sidebar

## Endpoint Utama Yang Direkomendasikan

### `POST /api/clinical/engine/evaluate`

Endpoint utama untuk scoring menyeluruh.

Dipakai saat sidebar membutuhkan:

- red flags
- NEWS2
- early warning patterns
- occult shock
- trajectory
- recommended actions

### `POST /api/clinical/trajectory/evaluate`

Endpoint khusus trajectory.

Dipakai jika tim ingin rollout bertahap:

- fase 1A: trajectory dulu
- fase 1B: baru full engine evaluate

Jika tim ingin satu pintu saja, endpoint ini boleh tidak dibuat dan seluruh kebutuhan cukup lewat `POST /api/clinical/engine/evaluate`.

## Rekomendasi Produk

Untuk rollout nyata, saya lebih menyarankan:

- canonical endpoint utama: `POST /api/clinical/engine/evaluate`
- endpoint trajectory khusus hanya sebagai adapter transisi

Alasannya:

- menghindari dua kontrak yang cepat drift
- lebih konsisten dengan model `dashboard as canonical engine`
- lebih mudah untuk observability, audit, dan retries

## Request Contract: `POST /api/clinical/trajectory/evaluate`

```json
{
  "request_id": "assist-1743900000000-ab12",
  "request_time": "2026-04-06T10:15:00.000Z",
  "source": {
    "app": "sentra-assist",
    "engine_mode": "canonical"
  },
  "patient": {
    "patient_id": "RM12345",
    "rm": "RM12345",
    "gender": "P",
    "age": 29,
    "facility_name": "Balowerti"
  },
  "vitals": {
    "sbp": 92,
    "dbp": 58,
    "hr": 118,
    "rr": 28,
    "temp": 38.7,
    "spo2": 93,
    "glucose": {
      "value": 246,
      "type": "GDS"
    }
  },
  "narrative": {
    "symptom_text_raw": "demam, lemas, mual",
    "keluhan_utama": "Demam, lemas, dan mual",
    "keluhan_tambahan": "Keluhan dirasakan sejak 2 hari..."
  },
  "context": {
    "chronic_diseases": ["HT"],
    "allergies": ["Obat"],
    "pregnancy_status": "tidak_hamil",
    "special_conditions": []
  },
  "history": {
    "visits_used": 4,
    "prefetched_visits": []
  }
}
```

## Response Contract: `POST /api/clinical/trajectory/evaluate`

```json
{
  "request_id": "assist-1743900000000-ab12",
  "processed_at": "2026-04-06T10:15:00.280Z",
  "source": {
    "engine": "dashboard-clinical-engine",
    "engine_version": "2026.04.06",
    "mode": "canonical"
  },
  "trajectory": {
    "available": true,
    "visit_count": 4,
    "overall_trend": "declining",
    "overall_risk": "high",
    "momentum_level": "accelerating",
    "deterioration_state": "deteriorating",
    "narrative": "Tren 4 kunjungan terakhir menunjukkan perburukan bertahap pada tekanan darah, respirasi, dan suhu.",
    "recommendations": [
      {
        "category": "action",
        "priority": "high",
        "text": "Prioritaskan review dokter pada kunjungan ini."
      }
    ],
    "raw_context": {
      "trajectory_context": {
        "momentumLevel": "accelerating",
        "convergencePattern": "multi-parameter-worsening",
        "convergenceScore": 3,
        "worseningParams": ["sbp", "rr", "temp"],
        "isAccelerating": true,
        "timeToCriticalDays": 1,
        "treatmentResponseNote": "Belum tampak respons stabil",
        "narrative": "Perburukan multi-parameter",
        "visitCount": 4
      }
    }
  },
  "governance": {
    "disclaimer": "Trajectory bersifat dukungan keputusan dan wajib ditinjau klinisi.",
    "review_required": true,
    "authoritative_engine": "dashboard"
  }
}
```

## Response Contract: `POST /api/clinical/engine/evaluate`

Jika memakai endpoint menyeluruh, response minimal:

```json
{
  "request_id": "assist-1743900000000-ab12",
  "scoring": {},
  "alerts": [],
  "early_warning_patterns": [],
  "trajectory": {},
  "recommendations": {
    "immediate_actions": [],
    "monitoring_actions": [],
    "referral_actions": [],
    "next_best_questions": []
  },
  "governance": {
    "disclaimer": "Hasil ditinjau klinisi.",
    "review_required": true,
    "authoritative_engine": "dashboard"
  }
}
```

## HTTP Semantics

### Success

- `200 OK`
  - engine berhasil menghitung trajectory canonical
- `202 Accepted`
  - jika tim ingin async processing untuk payload sangat berat, tetapi tidak direkomendasikan untuk flow bedside utama

### Client Errors

- `400 Bad Request`
  - payload tidak valid
- `409 Conflict`
  - patient context tidak konsisten dengan history
- `422 Unprocessable Entity`
  - vitals atau narrative tidak cukup untuk trajectory canonical

### Server Errors

- `500 Internal Server Error`
  - engine failure
- `503 Service Unavailable`
  - engine canonical down atau timeout

## Latency Target

Untuk flow sidebar:

- target p50: < 350 ms
- target p95: < 900 ms
- hard timeout di client: 2.5 s

Jika lewat timeout:

- `Assist` boleh tampilkan status `server unavailable`
- `Assist` tidak boleh mengklaim local preview sebagai hasil canonical

## UI Behavior di Assist

Jika response trajectory berhasil:

- render summary trajectory di panel sidebar
- pakai label yang menyebut hasil canonical
- simpan `request_id` untuk audit trail

Jika response gagal:

- tampilkan state error eksplisit
- optional: tampilkan preview lokal sebagai `preview only`, bukan `canonical`

## Rollout Notes

- fase 1 paling aman mulai dari `trajectory` dan `news2`
- setelah stabil, lanjutkan `early warning patterns` dan `occult shock`
- semua response harus membawa `request_id` untuk observability lintas app

## Related Files

- `docs/architecture/canonical-clinical-contract.md`
- `docs/architecture/assist-dashboard-migration-blueprint.md`
- `docs/adr/ADR-004-dashboard-canonical-clinical-engine.md`
