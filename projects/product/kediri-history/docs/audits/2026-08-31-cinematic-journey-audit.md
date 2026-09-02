# Audit Journey Sinematik — 2026-08-31

## Ruang lingkup dan metode

Audit ini menilai delta launch-critical dari Journey 26 scene. Status `PASS`
berarti dibuktikan oleh kode dan/atau perintah yang benar-benar dijalankan;
`PARTIAL` berarti ada bagian visual/perangkat yang tetap memerlukan inspeksi
manusia. `NEEDS MANUAL CHECK` bukan pengganti bukti otomatis.

| Severity | Temuan | Status | Bukti | Rekomendasi |
| --- | --- | --- | --- | --- |
| Blocker | Scene 10 harus bebas teks raster dan tidak mengonflasikan Jayakatwang/Jayabaya. | PASS | `production-narrative.ts` memasok `JAYAKATWANG`, `RAJA KEDIRIAN TERAKHIR`, dan atribusi Raden Wijaya; `10-1292-the-return.webp` dan derivatif 768 diperiksa secara visual. | Pertahankan klaim di DOM; jangan memasukkan kembali teks ke raster. |
| Blocker | Brantas harus menjadi thread dekoratif lintas air, batas, rute, rel/jembatan, dan runway modern. | PARTIAL | `brantas-thread.ts` memiliki lima path kompatibel dan satu `ScrollTrigger` scrub desktop/tablet; test reduced-motion browser PASS. | **NEEDS MANUAL CHECK:** inspeksi visual desktop/tablet pada lima anchor, termasuk subordinasi opacity dan ritme peralihan. |
| Blocker | First-load harus menjadi empat frame tepat 8,0 detik dan bypass pada hash/restorasi/mobile/reduced. | PASS | `director.ts` memakai label absolut 0/2/4/6 dan tahanan hingga 8; Playwright desktop PASS untuk chrome tersembunyi dan kembali sesudah pembuka. | Pantau CLS/perceived timing pada perangkat fisik. |
| High | Swiss restraint: drop-shadow dekoratif handoff keluar. | PASS | Aturan `drop-shadow` dihapus dari `globals.css`; unit contract PASS. | Jangan menghapus mask fungsional atau overlay citra yang telah disahkan. |
| High | Rekomendasi audit eksternal untuk Lenis/snap global. | FAIL (sebagai preskripsi) | Bertentangan dengan Technical Bible: GSAP ScrollSmoother sudah otoritatif dan tiap scene punya koreografi sendiri. | Tidak diimplementasikan; tanpa Lenis, tanpa snap global. |
| Medium | CLS, contrast perangkat nyata, performa, dan proporsi komposisi akhir. | PARTIAL | Kontrak CSS/token dan Playwright terarah lulus; tidak ada pengukuran lapangan/perangkat fisik dalam audit ini. | **NEEDS MANUAL CHECK:** desktop/tablet/mobile nyata, frame pacing, contrast, dan observasi CLS. |

## Bukti otomatis yang dijalankan

| Perintah | Hasil aktual |
| --- | --- |
| `pnpm --filter @kediri/web test -- production-narrative.test.ts brantas-visual-thread.test.ts` | PASS — 2 file, 13 test. Sebelumnya RED: 4 kegagalan tepat karena Scene 10, opening, dan dua berkas Brantas belum ada. |
| `pnpm run lint` | PASS — 0 error; 14 warning `noDescendingSpecificity` yang sudah ada pada `globals.css`. |
| `pnpm run typecheck` | PASS — exit 0. |
| `pnpm run test` | PASS — 7 file, 80 test; token gate 52 contrast checks dan 0 raw values. |
| `pnpm run build` | PASS — `next build --webpack`, 20 rute tercantum, termasuk `/journey`. |
| `pnpm --filter @kediri/web exec playwright test --config playwright.config.ts --grep "first-load prologue\|Scene 10 exposes\|Brantas line\|leaving and returning"` | PASS — 6 passed, 2 skipped (projek mobile yang sengaja tidak relevan). |
| `pnpm --filter @kediri/web exec playwright test --config playwright.config.ts --grep "first-load prologue keeps chrome"` | PASS — 1 desktop passed, 1 mobile skipped; mengunci Brantas juga tidak tercat sebelum t=8. |

## Rekomendasi launch

**Tiga blocker kode di atas tidak tersisa.** Rekomendasi ini tetap bukan
pernyataan production-ready: gate Sentra-GSAP contribution dan pemeriksaan
visual/performa perangkat nyata belum dijalankan. Apabila salah satu dari tiga
blocker kembali gagal, rekomendasinya otomatis **NO-GO**.
