# `Academic Smartboard`

Status: Draft governance capsule — implementation is not created by this wizard.

## Objective

`Platform bimbingan belajar multi\-tenant: penjadwalan sesi, kurikulum, evaluasi, payroll tutor, dan agen AI Kayyisa untuk Kurikulum Merdeka\.`

## Boundaries

- In scope: `governance capsule for the web app binding `apps/web`; capabilities: ai`
- Out of scope: `application implementation, deployment, credentials, purchases, messages, and production changes`
- Human owner: `Chief`

## Interfaces

- Consumes: `none declared; the selected app binding is not created or modified`
- Exposes: `the SAFRS capsule documentation only`

## Local verification

Document only commands that exist and have been run. Root verification remains mandatory.

## Status migrasi

Capsule ini menampung semua permukaan produk smartboard hasil migrasi dari repo
arsip `abyss-monorepo` (ADR 0003; spec:
`docs/superpowers/specs/2026-08-20-smartboard-migration-design.md`).

| App | Status |
| --- | --- |
| `apps/web` (aplikasi utama) | di-port (sub-fase 4/5 + home surfaces Dashboard/Pengajar/Tutorial; sub-fase 5 admin/Kayyisa chat + api/demo masih terbuka) |
| `apps/site` (promo/publik) | di-port |
| `apps/api` (backend) | belum di-port |
| `apps/demo` (environment demo) | belum dibuat |

Sudah bermigrasi: `ai/kayyisa/` (knowledge package v3.0.0),
`data/curriculum/`, `data/reference/`, `apps/site` (website publik El-Kayyisa),
`apps/web` sub-fase 1–2 (fondasi + penjadwalan/akademik). Capsule mandiri:
lockfile + workspace sendiri; `recharts`/`sonner` dipin di `apps/web` (bukan
root catalog).

## `apps/site` — website publik El-Kayyisa

Website promo/publik El-Kayyisa: Next.js 16, static export (`output: "export"`),
10 route. Detail arsitektur, data, dan verifikasi ada di
`docs/architecture.md`, `docs/data.md`, `docs/testing.md`.

## `apps/web` — aplikasi bimbel utama (sub-fase 1–2/5)

Sub-fase 1 (fondasi) + sub-fase 2 (penjadwalan + akademik) sudah di-port.
Detail: `docs/architecture.md`, `docs/data.md`, `docs/testing.md`. Plan
sub-fase 2: `docs/plans/completed/2026-08-22-smartboard-web-subphase2-akademik.md`.
