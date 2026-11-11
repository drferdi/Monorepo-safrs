# ADR-002: Minimum Visit History Threshold

## Metadata

- **Decision Date**: 2026-03-20
- **Decision Maker**: Chief / Drferdi
- **Review Date**: 2026-06-20
- **Status**: Implemented
- **Related ADRs**: ADR-004

## Status

Accepted

## Context

Clinical trajectory membutuhkan histori yang cukup agar pola kunjungan sebelumnya masih bermakna. Histori yang terlalu sedikit berisiko menghasilkan interpretasi yang menyesatkan.

## Decision

Gunakan aturan:

- target histori: 5 kunjungan
- minimum usable: 3 kunjungan
- jika histori hanya 1-2 kunjungan, status menjadi `insufficient`

## Consequences

### Positif

- mencegah overclaim dari histori yang terlalu dangkal
- membuat fallback lebih eksplisit
- mudah dijelaskan ke pengguna klinis

### Negatif

- beberapa pasien tidak akan mendapat trajectory walau ada histori parsial

## UI / Runtime Effect

- `prefetchedVisitHistory.status = ready | insufficient`
- trajectory menampilkan `Data not available` bila histori < 3

## Alternatives Considered

### 1. No minimum threshold

Ditolak karena histori dengan 1-2 kunjungan terlalu rentan menghasilkan false positive dalam analisis trajectory.

### 2. Higher minimum threshold (≥5)

Ditolak karena terlalu banyak pasien yang akan kehilangan fitur trajectory, terutama di faskes dengan EMR baru.

### 3. Dynamic threshold based on diagnosis type

Ditolak karena kompleksitas implementasi tinggi dan sulit dijelaskan ke pengguna klinis.
