# Dokumentasi Sentraverse

Indeks dokumentasi aplikasi. Konvensi penamaan: `lowercase-kebab.md`. Dokumen
kanonik level-repo (README, ARCHITECTURE, CHANGELOG, dll.) tetap di root
aplikasi.

## Arsitektur & Keputusan

| Dokumen                                                        | Isi                                                                                      |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [architecture.md](./architecture.md)                           | Overview arsitektur singkat (deep-dive: [`ARCHITECTURE.md`](../ARCHITECTURE.md) di root) |
| [adr-001-nextjs-app-router.md](./adr-001-nextjs-app-router.md) | ADR: Next.js App Router + React 19                                                       |
| [design-governance.md](./design-governance.md)                 | Aturan spacing, tipografi, density, checklist review desain                              |
| [data-model.md](./data-model.md)                               | Model data konten (insights, sentrapedia, dsb.)                                          |

## Operasional

| Dokumen                                    | Isi                                                |
| ------------------------------------------ | -------------------------------------------------- |
| [setup.md](./setup.md)                     | Setup lingkungan pengembangan                      |
| [deployment.md](./deployment.md)           | Panduan deployment (termasuk rewrite `/dashboard`) |
| [testing.md](./testing.md)                 | Strategi & perintah pengujian                      |
| [troubleshooting.md](./troubleshooting.md) | Masalah umum & solusinya                           |
| [api.md](./api.md)                         | Referensi API & integrasi                          |

## Tata Kelola & Kepatuhan

| Dokumen                                  | Isi                                           |
| ---------------------------------------- | --------------------------------------------- |
| [ai-governance.md](./ai-governance.md)   | Tata kelola AI klinis                         |
| [clinical-logic.md](./clinical-logic.md) | Logika klinis & batasan keluaran              |
| [privacy.md](./privacy.md)               | Kebijakan privasi (sumber halaman `/privacy`) |

## Arsip Proses

`superpowers/specs/` dan `superpowers/plans/` berisi arsip desain & rencana
implementasi per tanggal (`YYYY-MM-DD-<topik>.md`) — jejak historis pekerjaan,
bukan dokumen hidup.
