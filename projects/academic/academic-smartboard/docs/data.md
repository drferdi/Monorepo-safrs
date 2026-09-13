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
- `apps/web/` sub-fase 1–2: kode aplikasi saja (komponen, lib, test unit) —
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

## `apps/web` — data (sub-fase 1–2/5)

Sub-fase 1–2 **tidak menyentuh data pribadi nyata di repo** — tidak ada
record siswa/tentor/keluarga di-commit. Halaman memanggil backend FastAPI
arsip (dev-only, di luar monorepo) lewat `NEXT_PUBLIC_BACKEND_URL`; respons
hanya di memori client selama sesi. Test unit memakai mock / fungsi murni,
bukan data nyata.

Endpoint yang dipanggil `apps/web` (sub-fase 1–2), selain auth/students
fondasi:

| Area | Endpoint (relatif `/api`) |
| --- | --- |
| Jadwal | `GET/POST/PUT/DELETE /schedules` |
| Sesi | `GET /sessions`, `GET /sessions/{id}`, attendance/verify/cancel/reschedule, evaluations draft/submit, tutor check-in/out, attendance catch-up |
| Master pendukung | `GET /tutors`, `/subjects`, `/schools`, `/grade-levels` |
| Kurikulum | `GET /curriculum/status\|structure\|outcomes\|alignment\|coverage` |
| Perkembangan | `GET /students/{id}/progression` |

**Belum dipanggil (carve-out):** jurnal kolaboratif, trajectory Kayyisa —
penanda komentar di detail perkembangan; endpoint jurnal/AI menunggu
sub-fase 4/5.

Kalau sub-fase berikutnya butuh sampel data arsip untuk fixture/test,
aturan karantina `raw_data/` di bawah tetap berlaku penuh — sampel HARUS
disintesis/dianonimkan, bukan disalin dari `raw_data/` arsip.

## Data yang DILARANG masuk

`raw_data/` repo arsip (nama siswa, email tentor, gaji, pembagian tim) — R3,
karantina permanen per ADR 0003. Semua `.env*` repo arsip juga dikarantina.

## Penyimpanan runtime (target port)

Postgres via Prisma 7 (`packages/database`) — menggantikan MongoDB multi-tenant
repo arsip. Skema per modul dirancang di plan fase api.
