# ADR-003: Forward to Doctor via Crew Dashboard

## Metadata

- **Decision Date**: 2026-03-25
- **Decision Maker**: Chief / Drferdi
- **Review Date**: 2026-06-25
- **Status**: Implemented
- **Related ADRs**: ADR-004

## Status

Accepted

## Context

Med Assist perlu meneruskan consult klinis dari nakes ke dokter yang sedang tersedia tanpa membuat side panel menjadi sistem komunikasi yang berdiri sendiri.

## Decision

Gunakan Crew Dashboard sebagai backend consult dan presence dokter.

Flow:

1. side panel memanggil `GET /api/doctors/online`
2. user memilih dokter
3. side panel mengirim `POST /api/consult`

## Ranking Rule

Frontend mengurutkan daftar dokter berdasarkan:

1. `availability_status`
2. kecocokan `poli`
3. kecocokan `facility`
4. nama dokter

## Transparency Rule

UI harus menjelaskan ranking dengan marker ringan:

- `matched poli`
- `same facility`

## Consequences

### Positif

- presence dokter dipusatkan di server
- side panel tetap ringan
- consult payload lebih audit-friendly

### Negatif

- kualitas ranking bergantung pada metadata dokter dari server
- UX online doctor tetap tergantung freshness heartbeat server

## Alternatives Considered

### 1. Built-in real-time chat in sidepanel

Ditolak karena akan membuat extension terlalu kompleks dan sulit diaudit.

### 2. Third-party messaging integration

Ditolak karena menambah dependency eksternal dan risiko keamanan data pasien.

### 3. Static doctor list without ranking

Ditolak karena UX buruk — dokter yang tidak tersedia atau tidak relevan akan muncul di daftar.
