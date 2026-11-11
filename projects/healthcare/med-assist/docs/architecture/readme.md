# Med Assist Architecture

Dokumen di folder ini menjadi pegangan arsitektur formal untuk Med Assist.

## Isi

- `sentra-assist-runtime.md`
  - runtime flow side panel
  - extractor RME
  - state sync
  - workflow `AutoComplete+`
  - workflow `Forward to Doctor`
  - rule UI intake untuk kehamilan, disabilitas, obesitas, dan dropdown standard
  - ranking dokter online
  - fallback rules
- `vital-sign-algorithm-map.md`
  - peta algoritme halaman `VITAL SIGN`
  - klasifikasi `aktif sekarang`
  - klasifikasi `aktif downstream`
  - klasifikasi `ada di repo tapi belum wired sebagai engine utama`
- `vital-sign-executive-brief.md`
  - versi 1 halaman untuk Chief / non-engineer
  - menjelaskan apa yang aktif sekarang dan apa yang belum
- `vital-sign-algorithm-table.md`
  - tabel operasional algoritme
  - input, output, status wiring, dan file utama
- `vital-sign-engine-comparison-matrix.md`
  - matriks perbandingan `sentra-assist` vs `dashboard`
  - overlap, gap, drift risk, dan target source of truth
- `assist-ui-dashboard-engine-architecture.md`
  - diagram arsitektur final
  - model `Assist-first UI, Dashboard-first engine`
- `assist-dashboard-migration-blueprint.md`
  - fase migrasi 1-3
  - langkah adopsi canonical engine tanpa merusak UX bedside
- `canonical-clinical-contract.md`
  - kontrak canonical `TriageInput` dan `ClinicalEngineOutput`
  - mapping field nyata dari `Assist` ke engine canonical
- `clinical-trajectory-endpoint-blueprint.md`
  - blueprint endpoint canonical untuk trajectory dan engine evaluate
  - HTTP semantics, latency target, dan behavior UI

## Prinsip

- arsitektur ditulis sebagai `living docs`
- diagram ditulis dengan Mermaid
- keputusan besar dipisahkan ke `docs/adr/`
- dokumen ini menggambarkan implementasi aktif, bukan rencana spekulatif
