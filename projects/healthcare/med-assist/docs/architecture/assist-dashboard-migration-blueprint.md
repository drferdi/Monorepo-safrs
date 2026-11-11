# Assist Dashboard Migration Blueprint

Tanggal: 2026-04-06

## Tujuan

Dokumen ini menjabarkan migrasi bertahap dari model:

- `Assist memiliki sebagian logic klinis lokal`

ke model target:

- `Assist-first UI`
- `Dashboard-first canonical clinical engine`

## Prinsip Migrasi

- tidak ada big-bang rewrite
- UX bedside tidak boleh rusak
- canonical semantics harus naik bertahap
- setiap fase harus menghasilkan boundary yang lebih jelas daripada sebelumnya

## Fase 1 — Contract Alignment

### Goal

Samakan bahasa data antara `Assist` dan `Dashboard`.

### Deliverables

- definisi `TriageInput` canonical
- definisi `ClinicalEngineOutput` canonical
- mapping field intake `Assist` ke kontrak canonical
- daftar logic lokal `Assist` yang sifatnya preview-only

### Input Minimal

- patient context minimal
- vital signs lengkap
- `keluhan_utama`
- `keluhan_tambahan`
- chronic diseases
- allergies
- pregnancy status
- structured bedside signs
- special conditions

### Exit Criteria

- `Assist` mampu membentuk payload canonical tanpa ambiguity
- tim setuju field mana yang authoritative dan mana yang optional

## Fase 2 — Canonical Engine Adoption

### Goal

`Assist` mulai mengonsumsi hasil engine canonical.

### Deliverables

- endpoint / contract yang mengembalikan:
  - red flags
  - NEWS2
  - early warning patterns
  - occult shock
  - trajectory summary bila tersedia
  - recommended actions
- UI `Assist` menampilkan hasil canonical
- local alert logic diturunkan menjadi fallback / preview

### Exit Criteria

- hasil clinical scoring yang tampil di `Assist` sama dengan canonical engine
- tidak ada mismatch semantics antara sidebar dan dashboard

## Fase 3 — Local Logic Retirement

### Goal

Pensiunkan duplicated engine di `Assist`.

### Deliverables

- threshold constants lokal yang duplicated dihapus atau dipindah ke shared core
- occult shock lokal dipensiunkan atau diganti shared engine
- trajectory semantics lokal dipensiunkan bila canonical sudah tersedia
- dokumentasi dan tests diperbarui

### Exit Criteria

- tidak ada domain klinis inti yang dihitung dua kali dengan dua definisi berbeda
- `Assist` menjadi UI / adapter / capture layer yang bersih

## Candidate Shared Core

Jika dipilih model shared package, kandidat paling layak:

- vital threshold constants
- NEWS2
- occult shock
- trajectory primitives
- alert severity mapping

## Candidate Local-Only In Assist

Komponen yang tetap layak hidup lokal:

- extractor RME
- `AutoComplete+`
- UI state
- dropdown / form logic
- consult UI
- doctor selection UI

## Candidate Canonical-In Dashboard

Komponen yang sebaiknya canonical:

- NEWS2
- hardcoded red flags
- disease-specific early warning patterns
- occult shock
- trajectory / momentum
- vital persistence
- clinical governance semantics

## Rollout Risk Watchlist

- alert mismatch antara local preview dan canonical result
- latensi request engine canonical
- field intake belum lengkap tetapi canonical engine sudah dipanggil
- consult payload belum menyertakan context yang cukup

## Recommended Sequencing

1. lock contract
2. integrate canonical scoring response
3. retire duplicated local logic
4. review docs, tests, and governance wording
