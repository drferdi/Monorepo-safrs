# Privacy & Data Handling — MedBoard

---

## Prinsip Utama

App ini **tidak menyimpan data identitas pasien (PHI)** di manapun — by architecture.

---

## Implementasi PHI-Free yang Ada

### CDSSEngineInput — PHI-Free by Type Design
```typescript
interface CDSSEngineInput {
  keluhan_utama: string
  usia: number                     // Usia numerik — bukan tanggal lahir
  jenis_kelamin: "L" | "P"        // Jenis kelamin — bukan nama
  vital_signs?: VitalSigns        // Data klinis anonim
  chronic_diseases?: string[]     // Kondisi kronik — tanpa nama pasien
  // ← tidak ada: nama, NIK, nomor HP, alamat, tanggal lahir
}
```

### CDSS Audit Log — Numerik Saja
`writeCDSSAuditEntry()` hanya menyimpan:
- `sessionId` — opsional, bukan patient ID
- `validationStatus`, `modelVersion`, `latencyMs`
- `outputSummary`: jumlah suggestions, red flag count — **bukan konten diagnosis**

### Security Audit Log — Hashed
`writeSecurityAuditLog()` di `src/lib/server/security-audit.ts`:
- `userId` di-hash SHA-256 sebelum disimpan
- IP address: hanya dari `x-forwarded-for` (reverse proxy Caddy)
- Tidak ada nama pasien di metadata

### Sentry PHI Scrubber
File: `src/lib/intelligence/sentry.config.ts`

Field yang otomatis di-scrub sebelum event dikirim ke Sentry:
```
patientId, patientName, patientLabel, fullName, displayName,
medicalRecordNumber, mrn, nik
```

Value patterns:
- NIK 16 digit → `[REDACTED-NIK]`
- MRN format → `[REDACTED-MRN]`

Session replay: **sepenuhnya dinonaktifkan**
```typescript
replaysSessionSampleRate: 0,
replaysOnErrorSampleRate: 0,
```

### Socket.IO — Identity dari Session, Bukan Client
Semua socket events menggunakan identity yang diverifikasi dari server-side session cookie:
```typescript
senderId: session.username,      // dari cookie — bukan dari client payload
senderName: session.displayName, // dari cookie — bukan dari client payload
```
Tidak ada payload dari client yang bisa memalsukan identity.

### Telemedicine — Data yang Disimpan
Model `TelemedicineAppointment` di Prisma schema memang menyimpan `patientId` dan `patientPhone` untuk kebutuhan scheduling telemedicine. Ini adalah **satu-satunya tempat** data identitas disimpan, dengan alasan:
- `patientId`: username crew internal (bukan NIK)
- `patientPhone`: opsional, hanya untuk WhatsApp notifikasi
- `patientJoinToken`: one-time token untuk join tanpa login

---

## Kepatuhan Regulasi

### PDPA Indonesia (UU No. 27 Tahun 2022)
- Data minimization: hanya data klinis yang diperlukan untuk CDSS
- Basis pemrosesan: kepentingan layanan kesehatan
- Tidak ada penyimpanan data identitas di luar scheduling telemedicine

### Permenkes
- Penanganan data rekam medis mengacu pada regulasi ePuskesmas yang berlaku
- EMR auto-fill: data dikirim ke sistem ePuskesmas resmi milik Puskesmas

---

## Response Insiden Privacy

Jika PHI terdeteksi keluar dari sistem:
1. Suspend endpoint terkait segera
2. Notifikasi Chief dalam 1 jam
3. Dalam 72 jam: analisis dampak sesuai kewajiban PDPA
4. Tulis incident log di `docs/cognitorium/logs/`

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
