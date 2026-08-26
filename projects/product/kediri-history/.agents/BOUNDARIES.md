# BOUNDARIES — Pagar yang Mengikat Kediri

Berlaku di setiap sesi. Root `.agents/BOUNDARIES.md` tetap berlaku penuh di atas berkas ini.

Last updated: 2026-08-26

---

## 1. Keputusan Chief G01–G05 (2026-08-26)

| Kode | Isi | Konsekuensi harian |
| --- | --- | --- |
| **G01** | Kediri adalah capsule berdaulat, dikecualikan dari workspace root | Jangan tambahkan Kediri ke `pnpm-workspace.yaml` root; jangan konsumsi catalog/lockfile/config root |
| **G02** | Tidak ada remote, deployment, atau integrasi eksternal baru tanpa otorisasi eksplisit Chief | Phase 22 berhenti sampai Chief memerintahkan. CI capsule-local boleh disiapkan, tetapi verifikasi harus tetap lolos sepenuhnya secara lokal |
| **G03** | Kemasan fisik boleh menyesuaikan; **tanggung jawab arsitektural tidak boleh runtuh** | Batas modul ditegakkan uji parsing import (`tests/architecture/module-boundaries.test.ts`), bukan paket `workspace:*` |
| **G04** | Sentra-GSAP adalah standar authoring root, **bukan** dependensi capsule | Tidak boleh: symlink ke capsule, duplikat skill Kediri, dependensi npm/file. Capsule yang diekstraksi harus jalan tanpa `../../.agents/skills` |
| **G05** | Verifikasi harus dapat dijalankan sepenuhnya secara lokal | Setiap klaim "lolos" wajib punya keluaran perintah yang benar-benar dijalankan |

## 2. Larangan editorial (dari brief Chief, tetap mengikat)

- **Jangan** menerbitkan otomatis hasil impor riset.
- **Jangan** mengarang informasi sejarah yang hilang.
- **Jangan** mendamaikan diam-diam bukti yang bertentangan. Tautan `contradicts` adalah bukti
  yang sah dan harus tetap terlihat.
- **Jangan** menyajikan folklor sebagai fakta sejarah.
- **Jangan** menyajikan rekonstruksi sebagai bukti dokumenter.
- **Jangan** melewati rantai `EvidenceClaim → EvidenceLink → Source`.
- **Jangan** memaparkan master media privat atau dokumen hak ke publik.

## 3. Larangan lintas-proyek

- **Jangan** melakukan refactor Monorepo yang tidak berkaitan.
- **Jangan** mengubah proyek Sentra lain.
- Mutasi di luar capsule hanya pada path yang benar-benar dimiliki task aktif sesi ini.

## 4. Publikasi

Tidak ada `git push`, pembuatan remote, atau perubahan visibilitas tanpa perintah Chief **pada
sesi itu juga**. Gate pre-push root memblokir push yang menyentuh `projects/**` kecuali dengan
override sadar. Commit lokal tetap membutuhkan perintah Chief.

## 5. Yang tetap berstatus FAIL sampai dijalankan

Gate Sentra-GSAP (`sentra:gsap:qa`, tinjauan visual independen, `sentra:gsap:verify`) adalah
gate tingkat repositori. Selama belum dijalankan terhadap sumber ini, motion **tidak** boleh
disebut production-ready. Gate yang tidak dijalankan dihitung gagal, bukan netral.
