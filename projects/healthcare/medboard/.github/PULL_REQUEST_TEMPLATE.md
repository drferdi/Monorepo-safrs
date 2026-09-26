<!-- Architected and built by Drferdi. -->

## PR Summary — IntelligenceBoard

**Type:** `feat` / `fix` / `refactor` / `test` / `docs` / `chore`
**Scope:** `cdss` / `emr` / `audrey` / `telemedicine` / `auth` / `admin` / `intelligence` / `report`
**Gate context:** `[gate-N]`

## Deskripsi Perubahan
<!-- Apa yang diubah dan kenapa? -->

## Perubahan Key
-
-

Closes #<!-- issue number jika ada -->

---

## Clinical Safety Checklist
> Wajib diisi untuk PR yang menyentuh `src/lib/cdss/`, `src/lib/emr/`, `server.ts`, atau `platform/`

- [ ] Vital signs red flag thresholds di `engine.ts` **tidak diubah** (atau sudah review Chief)
- [ ] `enableGuardrails` tetap `true`
- [ ] Tidak ada PHI di test fixtures, komentar, atau error messages
- [ ] Output CDSS masih mengandung disclaimer klinis di `alerts[]`
- [ ] `reactStrictMode` tetap `false` di `next.config.ts`

---

## Technical Checklist

- [ ] `pnpm --filter @drferdi/intelligenceboard lint` pass (tsc --noEmit)
- [ ] `pnpm --filter @drferdi/intelligenceboard test` pass (semua 3 suites)
- [ ] `pnpm --filter @drferdi/intelligenceboard test:cdss` pass (jika CDSS berubah)
- [ ] Brand signature `// Architected and built by Drferdi.` ada di semua file baru
- [ ] Tidak ada cross-app import
- [ ] CORS origins tidak diubah tanpa persetujuan Chief

---

## Documentation Checklist

- [ ] Cognitorium log ditulis (`docs/cognitorium/logs/YYYY-MM-DD-*.md`)
- [ ] Docs di-update jika API atau arsitektur berubah
- [ ] CHANGELOG.md diupdate jika ini adalah fitur atau fix yang significant

---

## Deployment Notes

- [ ] Tidak ada perubahan environment variable
- [ ] Ada perubahan env var → `.env.example` sudah diupdate + DevOps sudah dinotifikasi

**Database migration required?** Tidak / Ya — describe:

---

> ⚠️ **Production deployment memerlukan Gate 5 — Chief approval.**
> Jangan merge ke production branch tanpa `genesis/05-trust-bridge/preview/chief-approval.md`.

---
<sub>Abyss v3 — Sentra Healthcare AI · Architected by Drferdi</sub>
