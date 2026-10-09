# Perbandingan Oracle dan MIRA yang dipakai Med Assist

Tanggal: 2026-10-09. Lingkup: pemeriksaan kode/dokumentasi lokal dan GET health lokal saja. Tidak ada perubahan Med Assist/MIRA, pembacaan kredensial, inferensi berbayar, instalasi, atau implementasi wiring Sentrapedia.

## Kesimpulan

MIRA sudah memiliki integrasi diagnosis yang dapat diadaptasi untuk Sentrapedia. Oracle adalah dataset referensi lokal 144 entri. Keduanya memenuhi fungsi berbeda: reasoning kasus melalui layanan MIRA, lookup/detail penyakit dari Oracle. Baik skema Oracle maupun kontrak MIRA yang tersedia belum menyediakan kutipan PNPK per dokumen/halaman.

Layanan yang dipakai Med Assist adalah assist/service step mode di D:/DEV/gafferverse/mira-system, bukan runner simulasi penuh upstream. engine.py membatasi dua panggilan model per step (planning, structured assessment), memakai post-check deterministik, budget/error breaker dan contract validation. README menjelaskan step mode tidak membutuhkan FHIR/Qdrant. Estimasi 35–50 panggilan pada asesmen upstream lama tidak digunakan untuk menilai jalur layanan ini.

## Bukti kesiapan saat diperiksa

- GET http://127.0.0.1:8787/healthz mengembalikan HTTP 200, status ok; fields status/version/contractVersion. Ini membuktikan layanan lokal merespons, belum membuktikan inferensi/model/provider saat ini berhasil.
- SHA-256 mira-step-request.schema.json dan mira-step-response.schema.json identik antara Med Assist lib/diagnosis-engine/contract dan MIRA assist/service/contract.
- Med Assist lib/diagnosis-engine/mira-engine.ts memiliki adapter POST /v1/diagnosis/step, contract v1, timeout 15 s, abort, validasi JSON, dan PII guard sebelum kirim. run-diagnosis.ts menampilkan differential, missing information dan next-best actions; failure kembali ke legacy dengan notice.
- wxt.config.ts menetapkan mira sebagai default production build bila flag tidak diberikan. Development tanpa flag masih legacy. ADR-005 Accepted 2026-09-28 merekam keputusan Gaffer. Sebagian komentar/doc lama masih menyebut off-by-default/proposed; kode config dan catatan accepted membedakan production/development.
- mira-supervisor.ts dan native messaging com.sentra.mira menyediakan autostart untuk extension. Sentrapedia web biasa tidak memiliki API Chrome nativeMessaging; perlu koneksi server ke layanan yang sudah hidup dan strategi lifecycle tersendiri.
- Service auth.py/app.py baru mendukung development token; startup production ditolak sebelum verifier production tersedia. Local readiness tidak diperlakukan sebagai production readiness.

## Perbandingan

| Aspek | Oracle Sentrapedia | MIRA Med Assist |
| --- | --- | --- |
| Bentuk | File JSON/TS, 144 record | HTTP reasoning service + adapter extension |
| Masukan | Nama/kode/kategori untuk lookup | CaseState terstruktur: demografi tanpa identitas, keluhan, anamnesis, vital, pemfis, hasil, obat, kondisi/alergi dan fasilitas |
| Hasil | Definisi, gejala, narasi diagnosis/terapi/rujukan | likely/alternatives/cannotMiss, evidence supporting/opposing, missingInformation, nextBestActions, disposition/unfilled dan metadata |
| Analisis kasus | Belum ada engine | Jalur reasoning dan rendering sudah ada |
| Jejak sumber | Identitas file/record dapat dibuat; referensi umum belum membuktikan isi per entri | Engine/version/model/trace/cost/latency; evidence adalah alasan terkait kasus, belum kutipan bibliografi pedoman |
| Cakupan | 144 record; 15 kategori aktual; label/kode perlu review | Kode output dapat berada di luar KB lokal; ketepatan klinis perlu evaluasi terpisah |
| Ketergantungan | Lokal, lookup tidak memanggil model | Layanan lokal dan provider model yang dikonfigurasi; langkah inferensi dapat memakai kuota/biaya |
| Saat layanan gagal | Lookup lokal tetap tersedia | Med Assist memakai legacy fallback; Sentrapedia belum memiliki engine fallback itu |
| Terapi | Narasi asli belum ditinjau | Kontrak step tidak menyediakan regimen obat; jalur obat Med Assist terpisah memakai KB/safety filter saat prescription API tidak dikonfigurasi |
| Penerapan Sentrapedia | Adapter data dan UI lookup | Adapter CaseState/response, jalur server, de-identification, review UI, timeout/error handling, konfigurasi server dan lifecycle |

## Arah wiring yang disarankan

1. Pertahankan Oracle sebagai katalog referensi lokal dengan provenance/status review. Tidak mengubah kode kategori atau menjadikan ICD primary key; tidak menghapus diagnosis MIRA karena tidak ada dalam katalog 144 entri.
2. Adaptasi kontrak MIRA v1 sebagai file lokal/versioned contract Sentrapedia. Hubungkan melalui API server Sentrapedia ke layanan yang sudah tersedia; credential tetap server-side. Tidak mengimpor source dari capsule Med Assist, memakai VITE/client token, atau membawa dependency extension/native host ke web.
3. Bedakan alasan reasoning kasus dari sumber pedoman. Simpan trace/versi/input terde-identifikasi dan status review pada hasil analisis. PNPK resmi dan kutipan halaman memerlukan registri/retrieval terverifikasi terpisah. Tidak menganggap output MIRA otomatis tervalidasi oleh Oracle atau PNPK.
4. Saat MIRA tidak tersedia, tampilkan status unavailable dan pertahankan katalog/draf; jangan mengarang legacy diagnosis engine di Sentrapedia. Inference aktif termasuk clinical logic R3; rincian integrasi/review dan izin pemakaian layanan tetap perlu ditetapkan sebelum implementasi.

Tidak diperlukan pemilihan penyedia AI baru untuk mengadaptasi layanan yang sudah dipakai. Pemeriksaan ini tidak membaca src/.env atau menjalankan POST diagnosis sehingga provider/model aktif, biaya aktual, dan hasil klinis live hari ini belum diuji. Isi README tentang model/biaya historis tidak dianggap konfigurasi atau tarif terkini.

## Rujukan kode utama

- Med Assist: lib/diagnosis-engine/types.ts, mira-engine.ts, run-diagnosis.ts, mira-supervisor.ts, contract/mira-step-{request,response}.schema.json; wxt.config.ts; docs/adr/adr-005-pluggable-diagnosis-engine-mira-candidate.md.
- Terapi: Med Assist lib/api/sentra-api.ts, getPrescriptions branch ketika PRESCRIPTION_API_CONFIGURED false (baris 956 dst).
- MIRA service: assist/service/README.md, engine.py, app.py, auth.py, contract/SOURCE.md. Asesmen upstream assist/MIRA_ASSESSMENT.md dibedakan dari step service yang digunakan.
- Oracle: docs/verification/2026-10-09-oracle-readiness.md dan oracle/sentrapedia.json.

Hasil: perbandingan/health/kontrak terverifikasi langsung. Tidak menjalankan ulang tes/build atau mengklaim akurasi klinis, kesiapan production, maupun wiring Sentrapedia selesai.
