---
name: kediri-knowledge
description: >-
  Use this skill for any question, plan, recommendation, or conversation that touches Kediri — Kota Kediri, Kabupaten Kediri, or Kediri Raya. Covers history, culture, landmarks, hospitals, government institutions, statistics, and local navigation. Triggers: "Kediri", "Gambiran", "Simpang Lima Gumul", "Gunung Kelud", "Dhoho", "Mojoroto", "Pesantren", "Pare", any Kediri address, hospital, official, or local place name, and any request to give directions, recommendations, or context inside Kediri.
version: 0.1.0
author: Sentra Artificial Intelligence
license: Proprietary
---

# Pengetahuan lokal Kediri Raya

## Apa yang ada di sini

24 record terverifikasi di `references/kediri_core.jsonl`, masing-masing dengan sumber, waktu, dan tingkat keyakinan. Sebarannya: 21 Kota Kediri, 1 Kabupaten Kediri, 2 Kediri Raya. Jenisnya mencakup titik penting, rumah sakit, institusi, peristiwa sejarah, budaya, dan statistik.

Ini fondasi v0.1, **bukan** dataset Kediri yang lengkap. Bila sesuatu tidak ada di sini, katakan tidak tahu dan cari lewat `web search` — jangan mengarang.

## Tiga hal yang tidak boleh tertukar

**1. Kota ≠ Kabupaten ≠ Kediri Raya.**

Kota Kediri hanya tiga kecamatan: Kota, Mojoroto, Pesantren. Kabupaten Kediri adalah wilayah terpisah yang jauh lebih luas. Kediri Raya mencakup keduanya.

Jangan pernah menyimpulkan sebuah tempat ada di Kota Kediri hanya karena namanya mengandung "Kediri". Simpang Lima Gumul dan Gunung Kelud berada di Kabupaten, bukan Kota. Salah menempatkan berarti salah memberi arah, salah memperkirakan jarak, dan salah menyebut instansi yang berwenang.

**2. Tiga lapis ingatan, tiga cara memperlakukan.**

| Lapis | Isi | Sikap |
|---|---|---|
| `deep_memory` | sejarah, budaya, situs, tradisi | stabil; boleh dipakai langsung |
| `living_registry` | rumah sakit, kontak, pejabat, jam layanan | **berubah**; periksa umurnya |
| `pulse` | berita, statistik terkini, kondisi sementara | cepat basi; sebutkan waktunya |

**3. Legenda bukan fakta.**

Cerita warga, tafsir sejarah, dan legenda tetap bernilai — tetapi sampaikan dengan label. "Menurut cerita yang hidup di masyarakat", bukan "faktanya". Bila ada tafsir yang berbeda, sebutkan bahwa memang berbeda.

## Cara mencari jawaban

Urutan penyaringan: **`scope` → `temporal_class` → kecocokan makna.**

- Pertanyaan tentang keadaan sekarang → dahulukan `living_registry` dan `pulse` dengan waktu verifikasi terbaru.
- Pertanyaan sejarah → dahulukan `deep_memory`, dan munculkan ketidakpastian bila tafsirnya berbeda.
- Percakapan sehari-hari → `local_context` boleh membentuk cara bicara supaya terasa orang lokal, **tetapi tidak boleh menimpa fakta terverifikasi**.

Selalu perhatikan `valid_at` dan `confidence`. Bila sebuah record sudah lama dan menyangkut hal yang berubah, katakan kapan terakhir diverifikasi.

## Wajib diverifikasi ulang sebelum dipakai

Untuk hal-hal ini, **jangan pernah menyebut dari ingatan lalu diam**:

- nomor telepon dan alamat rumah sakit
- nama pejabat yang sedang menjabat
- jam layanan dan jadwal
- prosedur atau syarat administratif

Periksa ulang lewat `web search` ke sumber resmi di `references/source_registry.csv`, lalu sebutkan kapan diperiksa. Untuk keperluan darurat atau operasional, periksa **tepat sebelum** dipakai — bukan mengandalkan yang tersimpan.

Ini bukan formalitas. Menyebut nomor gawat darurat yang sudah berganti bisa merugikan orang sungguhan.

## Kapan menyegarkan

Aturan lengkap di `references/refresh_policy.md`. Ringkasnya: `deep_memory` setahun sekali; `living_registry` 30 hari, kontak penting mingguan; `pulse` harian dan kedaluwarsa dalam 30–90 hari; pejabat mingguan dan saat ada pergantian; statistik **jangan pernah** ditimpa — simpan `valid_at`-nya, nilai lama tetap benar untuk waktunya.

## Sumber resmi

Sembilan sumber tepercaya di `references/source_registry.csv` — BPS Kota dan Kabupaten, Pemkot dan Pemkab, SIRS Kemenkes, RSUD Gambiran, JDIH keduanya, dan data kebudayaan Kemendikbud. Utamakan sumber ini di atas hasil pencarian umum.

## Menambah pengetahuan baru

Record baru mengikuti `references/schema.json`: wajib ada `id`, `type`, `name`, `scope`, `temporal_class`, `confidence`, dan `sources`. Pengecualiannya hanya `behavioral_rule` — aturan internal dari Chief yang memang tidak punya sumber luar.

Untuk pengalaman hidup lokal — kebiasaan, cara warga menyebut tempat, ritme kota — pakai `references/lived_experience_template.jsonl`. Jenis ini yang membuat Avery terdengar seperti orang Kediri, bukan seperti ensiklopedia.

Catat penambahan besar sebagai tugas kanban sesuai skill `execution-audit`.

## Yang belum ada

Ingestion massal BPS, Satu Data, JDIH, registri budaya, daftar rumah sakit lengkap, titik penting, pendidikan, transportasi, kebencanaan, olahraga, kuliner, sejarah lisan, dan denyut berita harian. Bila Chief menanyakan salah satunya, sebutkan bahwa itu tahap berikutnya — jangan berpura-pura sudah punya.
