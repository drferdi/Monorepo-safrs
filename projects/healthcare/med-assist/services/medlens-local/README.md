# MedLens Local Harness

Internal development/test harness untuk MedLens ECG v1.

Harness ini **bukan** bagian dari physician-facing product flow. UI operasional Sentra Assist tidak boleh meminta user klinis menyalakan service ini atau mengetik command terminal.

## Run

Command internal untuk menjalankan harness ini:

```bash
node services/medlens-local/server.mjs
```

`npm run medlens:dev` belum disediakan saat ini. Karena harness ini hanya untuk internal dev/test, command di atas cukup didokumentasikan di README ini dan tidak boleh muncul di UX operasional.

Harness akan aktif di:

```text
http://127.0.0.1:4010
```

## Internal Endpoint

```text
POST /api/medlens/ecg/analyze
```

Field upload:

```text
file
```

Format v1:

- PNG
- JPG
- JPEG

## Notes

- Harness ini hanya untuk development/test v1.
- Baseline repo-tracked MedLens ECG v1 ada di `docs/medlens/2026-06-21-medlens-ecg-v1-baseline.md`.
- Frontend production-facing harus mengarah ke backend MedLens/Crew lewat transport upload terautentikasi Crew yang sudah ada.
- Jika ingin memakai harness ini dari extension untuk internal testing, arahkan Crew API base URL dev/test ke `http://127.0.0.1:4010`.
- Feature flag OCR lokal:

```text
MEDLENS_ECG_OCR_ENABLED=false
```

- Default lokal sekarang OCR aktif. Set `MEDLENS_ECG_OCR_ENABLED=false` hanya bila ingin mematikan OCR untuk test/fallback internal.
- Jika OCR aktif, service mencoba beberapa region teks printout secara konservatif dulu, lalu fallback ke full-image OCR bila crop tidak usable.
- OCR lokal membaca teks cetak EKG lalu hasilnya masuk ke parser ECG-only dan guard redaksi identifier.
- OCR v1 memakai `tesseract.js` untuk membaca teks cetak EKG yang terlihat saja.
- Tidak ada waveform digitization atau interpretasi diagnosis otomatis.
- Jika OCR gagal, service tetap mengembalikan shell assistive dengan limitation yang jujur.
- Frontend extension tetap harus mengaksesnya lewat `medlensClient.analyzeEcgImage(file)`.

## Internal Smoke Checklist

1. Set MedLens API base URL ke harness lokal untuk sesi dev/test.
2. Jalankan harness:

```bash
node services/medlens-local/server.mjs
```

3. Buka MedLens ECG UI di extension.
4. Upload synthetic atau de-identified ECG image.
5. Pastikan structured result tampil dengan section terpisah untuk:
   - extracted ECG measurements
   - OCR-extracted machine text
   - OCR confidence
   - limitations
   - physician verification checks
6. Pastikan patient identifiers tidak muncul di output terstruktur atau extracted text list.
7. Pastikan disclaimer `This output supports clinical reasoning and requires physician verification. It is not a final diagnosis.` tampil.
8. Pastikan confidence tampil, dan jika `low`, UI menekankan review printout asli sebagai referensi utama.
9. Matikan harness, lalu ulangi submit untuk memastikan state unavailable tampil graceful tanpa instruksi terminal.
