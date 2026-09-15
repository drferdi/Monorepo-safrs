Last updated: 2026-09-15 (Smartboard web — HANDOFF refresh)

## Capsule

`projects/academic/academic-smartboard` — migrasi dari arsip
`D:\Devops\abyss-monorepo\apps\academic\smartboard` (read-only). Backend runtime
tetap FastAPI arsip via `NEXT_PUBLIC_BACKEND_URL` sampai `apps/api` di-port.

## Current state

### `apps/web` — selesai sampai home surfaces

| Slice | Status | Commit / plan |
| --- | --- | --- |
| Sub-fase 1 fondasi | COMPLETED | plan completed (login, shell, Master Murid) |
| Sub-fase 2 jadwal/akademik | COMPLETED | `docs/plans/completed/2026-08-22-smartboard-web-subphase2-akademik.md` |
| Sub-fase 3 payroll | COMPLETED | `cf9bee2` · `…-subphase3-payroll.md` |
| Sub-fase 4 ops + master | COMPLETED | `69f4d67` · `…-subphase4-ops.md` |
| Orphan home: Dashboard / Pengajar / Tutorial | COMPLETED | `e6752dc` |

- **Home setelah login:** `/` → `/dashboard` (bukan `/master/murid`).
- **Kayyisa di dashboard:** stub jujur (`data-testid=kayyisa-stub`); chat penuh = S5.
- **Tutorial:** teks saja; aset gambar/PDF arsip belum di capsule.
- **Verifikasi terakhir (`e6752dc`):** unit **90 PASS**, typecheck PASS, build PASS,
  `test:build` **32 PASS**.

### Produk capsule — belum complete

- Sub-fase 5 web: HakAkses, TutorDirectory, TemplateEvaluasi, AuditLog,
  Persetujuan, PlatformConsole, widget chat Kayyisa — **plan belum ditulis**.
- `apps/site` — sudah di-port.
- `apps/api` — belum di-port (Hono/Prisma target).
- `apps/demo` — belum.
- Roadmap index: `docs/plans/active/2026-08-21-smartboard-web-roadmap.md`.

### Git / publish

- Branch `main` lokal **ahead/behind** remote (jangan push mentah).
- **Jangan** `git push origin main` tanpa BOUNDARIES filtered publish + capsule gate.
- Jangan campur dirty tree di luar smartboard/plans/HANDOFF ke commit smartboard.

## Next action (prioritas)

1. Chief: E2E manual vs backend arsip — login → `/dashboard` per role
   (owner/admin/tentor/finance/ortu) → action queue → sesi → payroll/ops bila perlu.
2. Tulis + eksekusi plan **sub-fase 5** (admin platform + Kayyisa chat).
3. Setelah S5 web: mulai fase `apps/api` per spec migrasi.
4. Publish: hanya lewat filtered publish yang disetujui Chief.

## Owner collision

Tidak ada writer aktif lain pada scope smartboard web saat HANDOFF ini ditulis.
