# Phase 1 Implementation Task Breakdown

Tanggal: 2026-04-06

## Tujuan Sprint

Mengirim `sentra-assist` ke posisi siap integrasi canonical engine tanpa memecah UX bedside.

Target sprint ini bukan memindahkan semua logic klinis sekaligus, tetapi:

- mengunci kontrak
- menyiapkan mapper
- membuka jalur request/response canonical
- membuat hasil canonical bisa dirender di `Assist`

## Sprint Outcome

Pada akhir sprint:

- `Assist` mampu membentuk `TriageInput` canonical
- server memiliki endpoint canonical awal
- `Assist` dapat menampilkan response trajectory canonical
- logic lokal mulai ditandai sebagai `preview-only`

## Workstream A - Contract

### A1. Lock schema request canonical

- owner: architecture
- output:
  - schema `TriageInput`
  - mapping field Assist -> canonical
- done jika:
  - semua field inti punya owner yang jelas
  - tidak ada ambiguity pada pregnancy, glucose, chronic disease, allergy

### A2. Lock schema response canonical

- owner: architecture
- output:
  - schema `ClinicalEngineOutput`
  - severity vocabulary tunggal
- done jika:
  - sidebar dan dashboard bisa memakai semantics yang sama

## Workstream B - Med Assist

### B1. Build canonical payload mapper

- file target:
  - `lib/api/`
  - `entrypoints/sidepanel/main.tsx`
  - `components/clinical/TTVInferenceUI.tsx`
- task:
  - map patient context
  - map vitals
  - map anamnesa draft
  - map chronic/allergy/pregnancy/special conditions
  - map disability/obesity

### B2. Add canonical engine client

- file target:
  - `lib/api/bridge-client.ts` atau client baru yang lebih spesifik
- task:
  - tambah request function untuk endpoint canonical
  - bawa `request_id`
  - surface error eksplisit

### B3. Render canonical trajectory result

- file target:
  - `components/clinical/ClinicalTrajectory.tsx`
  - `entrypoints/sidepanel/main.tsx`
- task:
  - tampilkan summary canonical
  - tampilkan governance/source marker
  - fallback ke preview lokal hanya jika dibutuhkan

### B4. Mark local logic as preview-only

- task:
  - audit copywriting di UI
  - bedakan preview lokal vs canonical result
- done jika:
  - user tidak bisa salah baca preview sebagai authoritative output

## Workstream C - Dashboard Engine

### C1. Expose canonical endpoint

- file target:
  - route handler dashboard
  - service wrapper ke engine existing
- task:
  - validasi request
  - map ke `CDSSEngineInput`
  - panggil trajectory / engine service
  - kirim response canonical

### C2. Add response adapter

- task:
  - normalisasi result trajectory
  - normalisasi red flags / NEWS2 / recommendations
  - tambahkan `request_id`, `processed_at`, `engine_version`

### C3. Observability

- task:
  - log correlation/request id
  - latency metric
  - failure metric

## Workstream D - Test and Validation

### D1. Contract tests

- verify:
  - Assist payload valid terhadap schema
  - server response valid terhadap schema

### D2. Golden scenario tests

- minimum scenarios:
  - hipertensi berat
  - hipoksia
  - hiperglikemia
  - pasien perempuan hamil
  - history insufisien

### D3. Mismatch tests

- verify:
  - preview lokal tidak menimpa canonical
  - timeout canonical tidak tampil sebagai success

## Workstream E - Docs and Governance

### E1. Update architecture docs

- update kontrak
- update migration blueprint
- update README arsitektur

### E2. Update ADR references

- pastikan implementasi sprint masih sejalan dengan ADR canonical engine

## Recommended Sprint Sequencing

1. lock request schema
2. lock response schema
3. implement server endpoint
4. implement Assist mapper + client
5. render canonical result
6. add tests
7. update docs

## Exit Criteria

- `Assist` bisa mengirim payload canonical tanpa ambiguity
- endpoint canonical merespons minimal trajectory summary
- source marker canonical tampil di UI
- tidak ada terminology clash antara preview lokal dan canonical result

## Risks

- payload Assist belum cukup lengkap untuk engine canonical
- latensi server terasa mengganggu UX bedside
- severity semantics existing di Assist belum sepenuhnya seragam
- regression pada workflow dokter online / consult relay

## Out of Scope for Phase 1

- memensiunkan seluruh local alert logic
- memindahkan seluruh extractor ke server
- rewrite total `ClinicalTrajectory`
- engine sharing package lintas app

## Related Files

- `docs/architecture/canonical-clinical-contract.md`
- `docs/architecture/clinical-trajectory-endpoint-blueprint.md`
- `docs/architecture/assist-dashboard-migration-blueprint.md`
