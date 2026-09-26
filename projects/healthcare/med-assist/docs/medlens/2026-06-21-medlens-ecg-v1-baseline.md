# MedLens ECG v1 Baseline

## Product Purpose

MedLens ECG v1 adalah shell assistive clinical image intelligence untuk membantu physician review terhadap printout EKG. Baseline ini hanya mendukung OCR-extracted ECG text yang relevan, menjaga uncertainty tetap terlihat, dan tidak memosisikan output sebagai diagnosis final.

## Current Architecture

- WXT extension tetap bertindak sebagai client/UI.
- MedLens diarahkan sebagai integrasi backend-first melalui adapter frontend.
- Local harness di repo ini tetap ada pada `services/medlens-local/`, tetapi hanya untuk internal dev/test.
- Frontend hanya memanggil adapter `medlensClient.analyzeEcgImage(file)`.
- Service boundary sengaja tipis agar transport dapat diarahkan ke Crew/MedLens backend tanpa mengubah UI logic.

## Backend API Boundary

- Base URL dan auth mengikuti konfigurasi Crew session/automation token yang sudah dipakai Med Assist.
- Endpoint: `POST /api/medlens/ecg/analyze`
- Content type: `multipart/form-data`
- Field upload: `file`

## Internal Local Harness

- Harness lokal internal tetap tersedia di `services/medlens-local/`.
- Base URL harness internal: `http://127.0.0.1:4010`
- Harness ini tidak boleh muncul sebagai langkah operasional di UI physician-facing.

## Supported Input Types

Baseline v1 hanya menerima:

- `PNG`
- `JPG`
- `JPEG`

## OCR Scope

- OCR hanya untuk teks printout EKG.
- OCR region selection memakai crop konservatif dengan scoring ECG-specific dan fallback ke full-image OCR.
- OCR tidak membaca waveform.
- OCR tidak mengekstrak patient identity untuk dipakai sebagai output.
- OCR dapat dimatikan lewat `MEDLENS_ECG_OCR_ENABLED=false`, dan saat nonaktif service tetap mengembalikan structured assistive shell yang jujur.

## Extracted Fields

Field hanya diisi bila benar-benar berhasil diekstrak dari OCR text yang relevan:

- `heart_rate`
- `rhythm`
- `pr_interval`
- `qrs_duration`
- `qt_qtc`
- `axis`
- `st_t_changes`
- `notable_findings`
- machine interpretation text yang berhasil terbaca

Jika tidak terbaca dengan cukup yakin, field tetap `null`, array kosong, atau state "Not extracted" di UI.

## Privacy and Data Minimization

- Patient identifiers tidak ditampilkan di UI result.
- Identifier-like text diperlakukan sebagai hal yang harus di-redact atau diabaikan.
- Baseline ini fokus pada ECG-relevant text saja, bukan demographic extraction.
- Raw OCR text tidak diposisikan sebagai output pengguna.

## Confidence Behavior

- Confidence v1 tetap konservatif.
- `low` dipakai untuk OCR gagal, sinyal lemah, fallback penuh dengan hasil minim, atau limitation besar.
- `moderate` hanya dipakai bila OCR crop terpilih menghasilkan beberapa pengukuran ECG terstruktur yang bermakna tanpa failure besar.
- `high` bukan target baseline v1.

## UI Safety Framing

UI harus membedakan dengan jelas:

- OCR-extracted ECG measurements
- OCR-extracted machine text
- OCR confidence
- limitations
- recommended physician verification checks
- disclaimer

Framing yang dipakai:

- supports physician review
- OCR-extracted ECG text
- requires physician verification
- not a final diagnosis
- uncertainty remains visible

## Clinical Safety Contract

- Output hanya mendukung physician review, bukan menggantikan physician judgment.
- Machine text yang tampil harus dilabeli sebagai hasil OCR printout, bukan kesimpulan Sentra.
- Missing value tidak boleh disamarkan sebagai normal.
- Uncertainty, limitations, dan confidence harus tetap terlihat.
- Semua hasil memerlukan physician verification dan bukan final diagnosis.

## Known Limitations

- Belum ada ECG diagnosis.
- Belum ada waveform digitization atau waveform interpretation.
- Belum ada PDF support.
- Belum ada radiology module lain di baseline ini.
- OCR masih dibatasi pada ECG printout text yang terlihat.
- Confidence sengaja konservatif dan bukan ukuran akurasi klinis final.

## MedLens ECG v1 Non-Goals

- no ECG diagnosis
- no waveform interpretation
- no PDF support yet
- no radiology module yet
- no patient identity extraction
- no autonomous clinical decision-making
- no treatment recommendation

## Operational UX Rule

- Med Assist bukan developer tool.
- UI physician-facing tidak boleh meminta user klinis:
  - menjalankan local service
  - mengetik command terminal
  - menyalakan helper lokal
  - memahami localhost atau port
- Jika backend belum tersedia, UI hanya boleh menampilkan state unavailable yang netral dan non-teknis.

## Internal Dev/Test Smoke Checklist

1. Pastikan session Crew atau automation token dev/test tersedia pada konfigurasi Med Assist.
2. Untuk internal harness saja, arahkan Crew API base URL dev/test ke `http://127.0.0.1:4010` lalu jalankan harness lokal.
3. Buka MedLens ECG UI di extension.
4. Upload synthetic atau de-identified ECG image.
5. Pastikan structured result render dengan section terpisah untuk extracted ECG measurements, OCR-extracted machine text, confidence, limitations, physician checks, dan disclaimer.
6. Pastikan identifier pasien tidak tampil di output.
7. Pastikan disclaimer `This output supports clinical reasoning and requires physician verification. It is not a final diagnosis.` terlihat.
8. Pastikan confidence muncul dan uncertainty tidak disembunyikan.
9. Jika backend/harness tidak tersedia, UI harus tetap graceful tanpa instruksi terminal.

## Migration Readiness

- Frontend harus tetap memanggil `medlensClient.analyzeEcgImage(file)`.
- Adapter ini adalah boundary yang memungkinkan Crew/MedLens backend dipasang tanpa rewrite UI logic.
- Local harness hanya menjadi dev/test transport alternatif.
- Saat migrasi backend dilakukan, perubahan utama seharusnya cukup pada Crew backend route, session entitlement, atau transport contract kecil yang kompatibel.

## Next Recommended Phase

Phase berikutnya yang paling aman adalah memperkuat kualitas OCR ECG text pada boundary yang sama, sambil tetap mempertahankan clinical safety framing, redaction guard, dan migration-ready adapter contract.
