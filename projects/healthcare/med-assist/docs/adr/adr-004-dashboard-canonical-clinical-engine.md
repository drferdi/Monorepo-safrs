# ADR-004: Dashboard as Canonical Clinical Engine

## Metadata

- **Decision Date**: 2026-04-06
- **Decision Maker**: Chief / Drferdi
- **Review Date**: 2026-07-06
- **Status**: Implemented
- **Related ADRs**: ADR-001, ADR-002, ADR-003

## Status

Accepted

## Context

`sentra-assist` dan `primary-healthcare/dashboard` sama-sama memiliki logic klinis yang terkait dengan:

- vital sign screening
- red flags
- occult shock
- trajectory / longitudinal analysis
- consult relay

Dari audit implementasi aktif:

- `sentra-assist` unggul sebagai workflow bedside / capture layer
- `dashboard` unggul sebagai clinical scoring dan governance layer

Saat ini terdapat risiko duplicated clinical logic, khususnya pada:

- threshold vital sign
- occult shock
- trajectory semantics
- alert severity semantics

Jika dibiarkan, dua app dapat menghasilkan interpretasi klinis berbeda untuk input pasien yang sama.

## Decision

Kami menetapkan:

- `sentra-assist` menjadi `workflow-first UI / capture layer`
- `primary-healthcare/dashboard` menjadi `canonical clinical engine`

Makna keputusan ini:

- `Assist` tetap menjadi surface utama yang dipakai klinisi
- `Dashboard` menjadi source of truth untuk clinical scoring dan alert semantics
- `Assist` tidak memelihara engine klinis paralel untuk domain yang sama

Engine klinis yang harus dipimpin oleh canonical engine:

- hardcoded vital red flags
- NEWS2
- disease-specific early warning patterns
- occult shock
- trajectory / momentum / longitudinal risk
- persistence vital longitudinal
- governance semantics untuk alert

Area yang tetap dimiliki `Assist`:

- extractor RME
- intake form
- `AutoComplete+`
- UI summary pasien
- doctor picker
- `Forward to Doctor`

## Consequences

### Positive

- drift antar app berkurang signifikan
- threshold klinis hanya berubah di satu tempat
- auditability dan governance lebih kuat
- extension tetap ringan dan fokus pada workflow
- klinisi tetap mendapat UX sidebar yang mereka sukai

### Negative

- `Assist` menjadi bergantung pada kontrak engine canonical
- perlu pekerjaan migrasi bertahap
- beberapa logic lokal di `Assist` harus dipensiunkan atau dijadikan preview-only

### Risks

- jika kontrak `TriageInput` tidak disiplin, hasil dari canonical engine tetap bisa tidak konsisten
- jika rollout parsial tanpa phase control, user bisa melihat campuran alert lokal dan alert canonical
- latensi tambahan perlu dijaga agar tidak merusak UX bedside

## Clinical Safety Impact

High

Alasan:

- keputusan ini menyentuh source of truth untuk scoring dan alert klinis

## Compliance Impact

HIPAA / PDPA / auditability relevance

Alasan:

- persistence dan alert semantics harus dapat ditelusuri dengan jelas

## Alternatives Considered

### 1. Copy-paste seluruh engine dashboard ke Assist

Ditolak karena:

- menghasilkan duplicated logic
- memperbesar drift
- memperburuk maintenance
- melemahkan governance

### 2. Membiarkan dua engine berkembang sendiri

Ditolak karena:

- hasil klinis bisa berbeda antar app
- boundary system menjadi kabur
- debugging dan audit menjadi sulit

### 3. Menjadikan Assist sebagai canonical engine

Ditolak karena:

- `Assist` lebih cocok sebagai bedside capture layer
- `dashboard` sudah lebih matang dalam NEWS2, persistence, trajectory, dan governance

## Operational Implication

Model target:

- `Assist = cockpit klinisi`
- `Dashboard = mesin klinis kanonik`

Pedoman implementasi:

- extension hanya memiliki preview logic seperlunya selama masa migrasi
- semantics final harus berasal dari engine canonical
- engine duplicated harus dipindah ke shared core atau dipensiunkan
