---
name: Bug Report
about: Laporkan bug di AADI (MedBoard)
title: "[BUG][AADI] "
labels: bug, aadi, needs-triage
assignees: ''
---
<!-- Architected and built by Drferdi. -->

## Ringkasan
<!-- Satu kalimat: apa yang rusak? -->

## Modul yang Terdampak
- [ ] CDSS / Iskandar Engine
- [ ] Audrey Voice AI
- [ ] EMR Auto-Fill (Playwright)
- [ ] Telemedicine
- [ ] Intelligence Dashboard
- [ ] Auth / Crew Access
- [ ] LB1 Report Automation
- [ ] Admin Panel
- [ ] ACARS Chat
- [ ] Lainnya: ______

## Langkah Reproduksi
1.
2.
3.

## Expected vs Actual
**Expected:**
**Actual:**

## Environment
- Versi / Commit: <!-- git rev-parse --short HEAD -->
- Environment: Local / Production (VPS)
- Browser (jika UI bug):

## Error Log / Stack Trace
```
<!-- Paste error di sini -->
<!-- ⚠️ WAJIB: Hapus semua PHI (nama pasien, NIK, No HP) sebelum paste -->
```

## Clinical Safety Impact
- [ ] Bug mempengaruhi output CDSS / diagnosis suggestion
- [ ] Bug bisa menyebabkan PHI bocor ke log atau API response
- [ ] Bug menonaktifkan atau bypass guardrails
- [ ] Bug mempengaruhi vital signs red flag detection

> ⚠️ **Jika salah satu kotak di atas dicentang → ini adalah P0 Clinical Safety Incident.**
> Segera nonaktifkan endpoint terkait dan notifikasi Chief (Dr. Ferdi Iskandar) dalam 1 jam.

---
<sub>Abyss v3 — Sentra Healthcare AI · Architected by Drferdi</sub>
