# Changelog

All notable changes to Asisten Medis are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are the extension manifest
version (`wxt.config.ts`); the reasoning behind each change is in `.agents/DECISIONS.md`.

## Unreleased

### Added

- A chronic medication no visit gave a signa takes the PPK 2022 / PIONAS standard start of its
  stock medicine, marked "dosis standar", and can be continued.
- Standard repository files: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
  and this changelog.
- The README follows Chief's AsistenMedis design, with the Asisten Medis CDSS logo.
- Visit summary: Tatalaksana shows STATUS (Lanjutan / Baru) and INTERAKSI (DDInter partners
  within the resep, a matched allergy) with the check's result under the table; Tren Tanda Vital
  shows up to four earlier visits, the diagnosis and GDS, and a sparkline before the arrow.

### Changed

- Abbreviations and English names (NAC, CTM, PCT, acetaminophen) are read through the RME
  synonym table, so one drug is one chronic card with the latest signa any of its names carried.
- `docs/` file names are lowercase; finished and superseded documents moved to the local
  `archieved/` folder.
- The visit summary PDF follows the approved Clinical Visit Summary template: one A4 page, ten
  numbered blocks, IBM Plex Sans Bold, the Sentra logomark in the title block.
- The visit summary's DPJP follows the login; dr. Ferdi Iskandar verifies, and when he is the
  DPJP, dr. Dibya Arfianda, Sp.OG or dr. Boyong Baskoro, Sp.OG verifies, alternating by RM and day.
- The header reads "Prototype" under the credit line, in place of the Latin motto.

### Removed

- Code no production entry reached (unmounted clinical components, the trajectory chart set,
  the platform and ECG API clients and their tests), moved to `archieved/`.
- The sign-in sound before the sponsor page; one welcome sound plays when the main UI opens.
- The IBM Plex Sans Regular file and the white logomark, no longer used by the PDF.

### Fixed

- Every riwayat signa form is read (3X1/2, 2x1.5, 3x½, 3 dd 1, "3 kali sehari"); halves and
  decimals reach the RME resep as written; no card reads "Signa tidak tercatat".

## 2.1.0 - 2026-10-03

### Added

- Visit summary PDF ("Unduh PDF" on the RME Terapi step), with DPJP and verifier from the
  signed-in user.
- STATS: Statistik Harian from the ePuskesmas daily service report, identity-free, with CSV
  export.

### Changed

- Gate 3 reports a random glucose of 200 mg/dL or more in the diabetes category without
  symptoms.
- The DDI check reads Indonesian and stock names and fails closed when its table cannot be read.

### Security

- Bridge entries fill only their own patient's tab; visit history is kept in memory only; the
  patient's identity reaches the crew portal masked; web-accessible resources and reinjection
  are limited to ePuskesmas.
