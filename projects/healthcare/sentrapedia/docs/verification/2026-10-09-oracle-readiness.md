# Pemeriksaan kesiapan wiring Oracle — 2026-10-09

Permintaan Gaffer: wiring database penyakit memakai file di oracle/, dengan gaffer-routing-superpower. Pemeriksaan ini inventaris dan kontrak lokal; belum merupakan verifikasi klinis, implementasi, atau rencana eksekusi yang disetujui.

## Bukti yang diamati

- oracle/sentrapedia.json: root metadata/categories/diseases, versi deklaratif 1.0.0, 144 entri penyakit, 14 definisi kategori. Metadata menyatakan total_diseases 144 dan total_categories 14.
- oracle/diseases.json: array 144 entri, sama secara struktur/nilai dengan diseases di sentrapedia.json.
- oracle/diseases-data.ts: array DISEASES sama secara struktur/nilai dengan diseases.json, diperiksa sebagai literal AST TypeScript tanpa menjalankan file.
- oracle/data.ts: type Disease, definisi kategori serta referensi umum/metodologi; mengacu pada legacy prototype. Pernyataan sumber/metodologi di dalam file adalah klaim dataset, belum bukti validasi.
- Semua entri memiliki id, nama, kategori, kode, definisi, gejala[], diagnosis, terapi, rujukan. Tidak ada nilai kosong pada sembilan bidang itu. Tidak ada ID atau nama yang sama persis.
- Ada 15 kategori aktual: Pernapasan Bawah dan Saluran Cerna tidak memiliki definisi kategori; Pencernaan didefinisikan tetapi tidak digunakan. Jangan membuang entri atau mengubah label klinis otomatis.
- Kode berulang: A09 (23 Gastroenteritis Akut, 120 Diare Akut pada Anak), B01 (118 Cacar Air, 144 Cacar Air pada Dewasa), B35.6 (38 Tinea Korporis, 39 Tinea Kruris), J32 (12 Sinusitis Kronik, 139 Sinusitis Kronik THT), L01 (42 Impetigo, 126 Impetigo & Ektima). Kode bukan primary key. Kesamaan kode tidak membuktikan entri duplikat; ketepatan kode belum diaudit klinis.
- Tidak ada sumber per entri, URL resmi, nomor KMK, tanggal pedoman, halaman, atau status review klinis dalam skema penyakit. Daftar umum nationalSources/professionalSources/internationalSources tidak cukup untuk kutipan pedoman per penyakit.
- Skema tidak menyediakan pemfis, diagnosis banding, penunjang, KIE atau kriteria diagnosis sebagai bidang terpisah. Jangan menyimpulkannya dari narasi diagnosis/terapi atau memetakan daftar ini sebagai tujuh bidang PNPK lengkap.

SHA-256 sumber asli:

| File | SHA-256 |
| --- | --- |
| data.ts | d7423acc04d2f986f7a460dd8d4711ee19772f32b7a05fcc07d3b5dcb8207946 |
| diseases-data.ts | e7107164ef7090af180fb4b19f80b6012375be056e83c46408ae01e058c2a1c5 |
| diseases.json | 0e5af5cbc9f71a1b1ffbb1dd399b135473a4427c899117b46d6558114e860ced |
| sentrapedia.json | 73e40882cdd313f46f406c99c3474aab9ebde44418d3e1681b0f5aaec9f9cd9a |

## Kesiapan repository

CONTEXT.md, .agents/HANDOFF.md, lib/drafts.ts, components/forms.tsx, components/workspace.tsx, package.json dan tsconfig.json diperiksa. Aplikasi memiliki pencarian workspace serta draf lokal, belum adapter/query penyakit. TypeScript sudah mendukung import JSON. Tidak diperlukan instalasi, provider AI, atau layanan database untuk katalog file lokal ini. Rancangan/rencana sebelumnya di docs/specs dan docs/plans/completed tidak mencakup wiring oracle yang baru diminta. ASSESSMENT.md PNPK dibaca untuk mempertahankan batas kutipan dan review; dataset oracle belum terbukti hasil ekstraksi koleksi PNPK tersebut.

## Usulan cakupan untuk ditinjau Gaffer

Jadikan sentrapedia.json kandidat sumber tunggal lokal, pertahankan semua file oracle asli dan ID. Sediakan pencarian nama/kode/kategori, daftar kategori dari nilai aktual entri, dan detail sembilan bidang asli. Setiap detail menampilkan provenance file, hash dan ID record; status belum diverifikasi klinis. Kutipan halaman PNPK tetap belum tersedia. Integrasikan akses katalog pada navigasi/pencarian Sentrapedia dengan visual yang ada. Tidak menjadikan hasil lookup sebagai diagnosis, ranking DDx berbasis pasien, rekomendasi obat, atau isi klinis otomatis dalam draf.

Risk: R2 untuk integrasi kontrak lokal; inferensi/rekomendasi klinis tetap di luar cakupan. Eksekusi solo sesuai arahan Gaffer sebelumnya. Skill yang dipanggil mensyaratkan persetujuan usulan sebelum planning/implementasi; persetujuan fitur lama tidak digunakan sebagai persetujuan rincian wiring baru. Setelah persetujuan, buat spec/rencana bounded, implementasikan adapter dan UI, lalu typecheck → lint → targeted tests → build/dry-run → browser/ekstraksi dan HANDOFF.

Pemeriksaan struktur berhasil (exit 0). Tidak menjalankan tes/build produk pada tahap inventaris; kode produk dan file oracle belum diubah. Jev dilewati karena inspeksi kontrak lokal deterministik dan belum ada keputusan klinis/eksternal yang akan dieksekusi.
