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
| `apps/web` (aplikasi utama) | di-port (sub-fase 1/5 — fondasi: scaffold, auth, shell, Master›Murid) |
| `apps/site` (promo/publik) | di-port |
| `apps/api` (backend) | belum di-port |
| `apps/demo` (environment demo) | belum dibuat |

Sudah bermigrasi: `ai/kayyisa/` (knowledge package v3.0.0),
`data/curriculum/`, `data/reference/`, `apps/site` (website publik El-Kayyisa),
`apps/web` sub-fase 1 (fondasi).

## `apps/site` — website publik El-Kayyisa

Website promo/publik El-Kayyisa: Next.js 16, static export (`output: "export"`),
10 route. Detail arsitektur, data, dan verifikasi ada di
`docs/architecture.md`, `docs/data.md`, `docs/testing.md`.

## `apps/web` — aplikasi bimbel utama (sub-fase 1/5)

Sub-fase 1 (fondasi): scaffold Next.js 16 static export, auth cookie-session
terhadap backend arsip, shell ber-navigasi role-aware, dan satu halaman data
nyata (Master › Murid). Detail arsitektur, data, dan verifikasi ada di
`docs/architecture.md`, `docs/data.md`, `docs/testing.md`.
