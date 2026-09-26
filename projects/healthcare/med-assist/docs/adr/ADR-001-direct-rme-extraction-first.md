# ADR-001: Direct RME Extraction First

## Metadata

- **Decision Date**: 2026-03-15
- **Decision Maker**: Chief / Drferdi
- **Review Date**: 2026-06-15
- **Status**: Implemented
- **Related ADRs**: ADR-004

## Status

Accepted

## Context

Awalnya ekstraksi riwayat penyakit terlalu bergantung pada tabel ICD dan scan text umum. Pada halaman RME nyata, `Penyakit Kronis` sering tampil sebagai field direct yang lebih akurat daripada tabel fallback.

## Decision

Med Assist menggunakan strategi `direct field first` untuk field klinis penting di RME.

Prioritas:

1. field direct berlabel jelas
2. row tabel / cell sebelah
3. fallback regex ringan atau text scan

## Consequences

### Positif

- akurasi extractor meningkat
- sinkronisasi ke UI lebih konsisten
- lebih tahan terhadap variasi tampilan tabel

### Negatif

- logic extractor lebih kompleks
- tetap bergantung pada kualitas label di DOM

## Scope Saat Ini

- `Penyakit Kronis`
- `Nama Faskes`
- `Penjamin / BPJS / Cara Bayar / Jaminan`
- `Penyakit Khusus`
- `Risiko Kehamilan`
- `Riwayat Alergi`
- `Status Kehamilan`

## Alternatives Considered

### 1. Pure table-based extraction

Ditolak karena tabel RME memiliki variasi DOM yang tinggi dan sering tidak konsisten antar faskes.

### 2. Full AI-based parsing per field (pre-DAS approach)

Ditolak karena latensi tinggi dan biaya AI cloud untuk setiap DAS scan operation.

### 3. Hybrid regex-first approach

Ditolak karena regex rentan terhadap perubahan label lokal dan format regional.
