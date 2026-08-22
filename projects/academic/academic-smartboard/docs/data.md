# Data

Record actual data classes, ownership, retention, privacy constraints, environments, and migration rules. Identify production and safety-critical data as R3 surfaces.

## Generated capsule context

- Sensitive domains: education
- Computed risk: R1
- No credentials, production data, or environment entries are created.

## Data yang ada di capsule

- `data/curriculum/`: master kurikulum + hierarki + capaian pembelajaran (publik, R1)
- `data/reference/`: registri lisensi dan sumber (publik, R1)
- `data/synthetic/`: seed demo — HANYA data generate, lihat `data/synthetic/README.md`
- `ai/kayyisa/runtime/knowledge/`: JSONL knowledge pack, integritas dijaga
  `manifest.json` (sha256); perubahan terklasifikasi R2 via `.safrs/sensitive-paths.json`
  (pola `projects/**/ai/**`)
- `apps/site/src/content/`: konten publik situs El-Kayyisa (modul TS bertipe,
  10 halaman) — publik, R1
- `apps/site/public/`: 6 gambar webp artikel wawasan hasil optimasi
  (504K total) — publik, R1
- `apps/web/` sub-fase 1: kode aplikasi saja (komponen, lib, test unit) —
  nol data pribadi/nyata disimpan di repo ini, lihat bagian `apps/web` di
  bawah

## `apps/site` — data

Konten publik saja; **nol data pribadi**. Testimoni placeholder ("Testimoni
menunggu persetujuan") dari arsip **tidak di-port** — bagian testimoni
dihilangkan sampai ada testimoni riil yang disetujui, bukan diisi data
placeholder.

2 foto orang dari arsip (`tutor-profile.png`, `mentor-berhijab.png`)
**DIKECUALIKAN** dari `public/` — konsen/lisensi belum terverifikasi.
Kedua foto **DIHILANGKAN** dari situs (tidak dirender, tanpa placeholder —
bagian `tentang` tidak punya field gambar) sampai ada konfirmasi tertulis
dari Chief. `public/` hanya memuat 6 gambar webp artikel wawasan hasil
optimasi (504K total), tanpa foto orang.

## `apps/web` — data (sub-fase 1/5)

Sub-fase 1 **tidak menyentuh data pribadi nyata** — repo ini menyimpan nol
record siswa/tentor/keluarga. Halaman Master › Murid memanggil
`GET /api/students` pada backend arsip (FastAPI + MongoDB, dijalankan
manual, dev-only, terpisah dari monorepo ini) saat runtime di browser;
respons hanya ada di memori client selama sesi, tidak pernah ditulis ke
disk atau di-commit. Test unit (`api.test.ts`) memakai mock `axios`, bukan
data nyata.

Kalau sub-fase berikutnya (2-5) butuh sampel data arsip untuk fixture/test,
aturan karantina `raw_data/` di bawah tetap berlaku penuh — sampel HARUS
disintesis/dianonimkan, bukan disalin dari `raw_data/` arsip.

## Data yang DILARANG masuk

`raw_data/` repo arsip (nama siswa, email tentor, gaji, pembagian tim) — R3,
karantina permanen per ADR 0003. Semua `.env*` repo arsip juga dikarantina.

## Penyimpanan runtime (target port)

Postgres via Prisma 7 (`packages/database`) — menggantikan MongoDB multi-tenant
repo arsip. Skema per modul dirancang di plan fase api.
