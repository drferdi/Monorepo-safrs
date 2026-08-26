# Lingkungan Lokal — Cara Menjalankan Kediri dari Nol

Semua perintah dijalankan dari **akar capsule**, bukan akar Monorepo.

Last updated: 2026-08-26

---

## Urutan dari mesin bersih

```bash
docker compose -f infra/docker-compose.yml up -d
pnpm install
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

## Port

| Port | Isi |
| --- | --- |
| 4320 | Server produksi (`node scripts/serve.mjs`) dan dev |
| 4321 | Playwright e2e — **sengaja dipisah**, lihat `DECISIONS.md` |
| 54330 | PostgreSQL 18 capsule (Monorepo memakai 54329) |
| 9010 / 9011 | MinIO API / konsol |

## Nilai `.env.local` yang cocok dengan compose

Kredensial pengembangan lokal, bukan rahasia produksi. Daftar lengkapnya ada di `AGENTS.md`
capsule; `.env.example` hanya memuat nama variabel dan **tidak boleh** memuat nilai.

## Basis data

- Skema dikelola **migrasi**, bukan push otomatis (`push: false`).
- `pnpm run db:seed` menanam tiga irisan vertikal yang sudah ditinjau. Ia **tidak pernah**
  mengimpor `research/original/`.
- Turunkan stack dengan `docker compose -f infra/docker-compose.yml down`. Tambahkan `-v`
  **hanya** bila memang ingin membuang data semai.

## Object storage

Dua bucket dengan kebijakan berbeda, dan perbedaan itu nyata di lapisan objek:

| Bucket | Isi | Akses anonim |
| --- | --- | --- |
| `kediri-public` | derivatif yang sudah bersih hak | 200 |
| `kediri-private` | master arsip, dokumen hak | 403 |

## Fallback bila Docker tidak tersedia

PGlite (`@electric-sql/pglite-socket`) adalah Postgres WASM yang wire-compatible dan dapat
dijalankan di port 54330 yang sama. Skema dan migrasi identik. Ia **kurang tahan saat build
paralel** — build Next dengan banyak worker dapat memutus koneksinya. Sah sebagai fallback,
tidak cukup sebagai satu-satunya bukti rilis.

## Rantai verifikasi

```bash
pnpm run verify          # lint, typecheck, test, build, verify:production
pnpm run test:e2e
node scripts/deploy-dry-run.mjs
```

Dari **akar Monorepo**, untuk membuktikan kedaulatan capsule:

```bash
rm -rf projects/product/kediri-history/apps/web/.next
node tools/project-standalone/src/cli.mjs verify product/kediri-history
```

Menghapus artefak lebih dulu bukan kerapian — lihat `04_TRAPS.md`.
