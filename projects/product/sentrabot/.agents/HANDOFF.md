# HANDOFF — WhatsApp Business Bridge Public Beta

Copied from the gitignored `.agent/HANDOFF.md` by ADR 0007 WP-G on 2026-09-25; content unchanged. The old `.agent/` folder and its database dump stay in place for Chief to remove.

Last updated: 2026-09-01

## Status

- Worktree implementasi aktif: `D:\DEV\Monorepo.worktrees\codex-whatsapp-bridge`
  pada branch `codex/whatsapp-bridge`. Perubahan belum di-commit, di-push, atau
  dideploy.
- Arsitektur yang disetujui: `apps/whatsapp-bridge` adalah bridge Meta yang
  tipis; API tetap memiliki identitas, otorisasi tenant, run, dan persistence.
- Selesai secara lokal: kontrak/migrasi/retensi receipt 30 hari, ingress HMAC
  raw-body yang idempoten, endpoint internal bridge-to-API, penghapusan jalur
  Meta langsung di API, state machine Embedded Signup, token terenkripsi,
  RPC onboarding, serta UI pilihan coexistence atau nomor baru.
- UI memuat SDK Meta saat diperlukan, menerima callback hanya dari domain
  Facebook HTTPS, dan completion membutuhkan OAuth code, WABA ID, dan
  phone-number ID.

## Bukti verifikasi terakhir

- Contracts check: PASS.
- API: 178 test dan typecheck PASS.
- Web: 152 test dan typecheck PASS.
- WhatsApp Bridge: 15 test dan typecheck PASS.
- Scoped Biome dan `git diff --check`: PASS.
- Migration `20260831210754_whatsapp_bridge_connections` sudah diterapkan pada
  PostgreSQL Docker lokal; tidak ada akses data/credential produksi.

## Pekerjaan berikutnya

1. Media inbound melalui bridge tanpa API menerima token WABA.
2. Outbound delivery dan approval interaktif melalui bridge.
3. Test RPC/UI onboarding, katalog lokalisasi Indonesia/Inggris.
4. Compose bridge, deploy dry-run tanpa side effect, dan dokumentasi beta.
5. Verifikasi akhir dan review R2 sebelum menganggap public beta siap.

## Keputusan yang tidak boleh berubah

- Beta bersifat account-first; webhook tidak boleh membuat akun Sentra.
- Pelanggan memiliki WABA dan membayar Meta langsung.
- Coexistence didukung untuk nomor WhatsApp Business App yang memenuhi syarat.
- Token tidak boleh mencapai browser, respons API, log, prompt, atau fixture.
- Tidak ada otorisasi deployment melalui handoff ini.
