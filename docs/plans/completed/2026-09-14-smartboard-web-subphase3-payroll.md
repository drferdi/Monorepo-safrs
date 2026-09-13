# Smartboard `apps/web` Sub-fase 3: Payroll + Finance

- **Status:** COMPLETED — 2026-09-14 (migrasi dari arsip; verifikasi capsule hijau).
- **Owner:** Chief
- **Roadmap:** `docs/plans/active/2026-08-21-smartboard-web-roadmap.md` (baris 3/5)
- **Sumber:** `D:/Devops/abyss-monorepo/apps/academic/smartboard/frontend/src/pages/{RekapHonor,Payroll,Pembayaran,Tarif,Lembur}.jsx`

## Scope (migrasi, bukan invent)

| Route target | Arsip |
| --- | --- |
| `/keuangan/honor` | RekapHonor |
| `/keuangan/payroll` | Payroll |
| `/keuangan/pembayaran` | Pembayaran |
| `/keuangan/tarif` | Tarif (CRUD inline; tanpa port MasterCrud penuh) |
| `/lembur` | Lembur |

**Non-goal:** halaman tuition/SPP terpisah — tidak ada di frontend arsip. Dashboard `FinanceActivityCard` tidak di-port di sub-fase ini.

## Verifikasi (2026-09-14)

- unit **71 PASS**, typecheck PASS, build PASS, `test:build` **17 PASS**
- Nav: grup Pengajar + Keuangan; role filter tentor/finance sesuai arsip
- Backend tetap FastAPI arsip via `NEXT_PUBLIC_BACKEND_URL`
