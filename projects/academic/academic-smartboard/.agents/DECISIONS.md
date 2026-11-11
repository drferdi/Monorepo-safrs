# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-09-13 - Smartboard web sub-fase 2 closed; capsule-local deps + sentinel dynamic routes

Migrated from root .agents/DECISIONS.md (original date kept).

Chief closed `apps/web` sub-fase 2 (penjadwalan + akademik). Durable choices:

1. **`recharts@3.6.0` / `sonner@2.0.3`** dipin di
   `projects/academic/academic-smartboard/apps/web/package.json` (+ capsule
   lockfile), **bukan** root `catalog:` — agar capsule tetap extractable
   (ADR 0006 / independence).
2. **Route dinamis** `/sesi/[id]` dan `/akademik/perkembangan/[studentId]`
   memakai `generateStaticParams()` sentinel `placeholder` + client fetch by
   `useParams()` (bukan query-string fallback) agar URL arsip tetap.
3. **Carve-out:** panel Jurnal Kolaboratif dan Kayyisa trajectory tidak di-port
   di sub-fase 2; penanda komentar di detail perkembangan menuju sub-fase 4/5.
4. **Keselarasan/cakupan** memuat matriks/coverage + `CurriculumReadingPane`;
   mapel cakupan dari `GET /curriculum/structure` (korpus nasional), bukan
   master bimbel saja.

Evidence: plan
`docs/plans/completed/2026-08-22-smartboard-web-subphase2-akademik.md`,
roadmap baris 2 COMPLETED, commits lokal `fa5dcdb`…`791f02d` + commit tutup
Task 16. E2E manual vs backend arsip dan filtered publish tetap milik Chief.
Smartboard produk keseluruhan **belum** complete (sub-fase 3–5, api, demo).
