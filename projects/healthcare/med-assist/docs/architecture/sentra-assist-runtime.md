# Med Assist Runtime Architecture

Tanggal: 2026-04-06

## Scope

Dokumen ini menjelaskan mekanisme runtime Med Assist yang aktif saat ini pada side panel ePuskesmas.

## Context

```mermaid
flowchart LR
    Nurse[Perawat / Nakes]
    RME[ePuskesmas RME]
    Content[Content Script]
    Sidepanel[Side Panel React]
    TTV[TTVInferenceUI]
    Trajectory[ClinicalTrajectory]
    Bridge[Bridge Client]
    Crew[Crew Dashboard]
    Doctor[Dokter Online]

    Nurse --> Sidepanel
    RME --> Content
    Content --> Sidepanel
    Sidepanel --> TTV
    TTV --> Trajectory
    TTV --> Bridge
    Bridge --> Crew
    Crew --> Doctor
```

## Runtime Boot Sequence

```mermaid
flowchart TD
    A[Mount / Initiate] --> B[fetchPatientData]
    B --> C[getPatientInfo]
    B --> D[scanMedicalHistory]
    B --> E[scanVisitHistory]
    B --> F[scanClinicalContext]
    C --> G[patientData]
    D --> H[prefilledHistoryFlags]
    D --> I[patientHistorySummary]
    E --> J[prefetchedVisitHistory]
    F --> K[clinicalContext]
```

## Data Surfaces

### 1. Patient Identity

Sumber: `getPatientInfo`

Output:

- `name`
- `gender`
- `age`
- `rm`
- `dob`
- `bpjsStatus`
- `kelurahan`

### 2. Chronic History

Sumber: `scanMedicalHistory`

Strategi:

- prioritas `Penyakit Kronis` direct field
- fallback tabel / ICD / text scan

Mapping internal:

- `dm`
- `ht`
- `jantung`
- `stroke`
- `ginjal`
- `asma`

### 3. Clinical Context

Sumber: `scanClinicalContext`

Field aktif:

- `facilityName`
- `payerLabel`
- `specialConditions`
- `pregnancyRisk`
- `allergies`
- `pregnancyStatus`

### 4. Visit History

Sumber: `scanVisitHistory`

Aturan:

- target 5 kunjungan
- minimum usable 3
- `< 3` => `insufficient`

## UI Synchronization

```mermaid
flowchart LR
    Chronic[Chronic flags] --> Header[Header Riwayat Penyakit]
    Chronic --> Form[Dropdown Riwayat Penyakit Kronis]
    Chronic --> Summary[Summary Analisis]
    Chronic --> Consult[Consult Payload]

    Context[Clinical context] --> Snapshot[Consult Snapshot]
    Context --> Footer[Footer Consult]
    Context --> Form2[Riwayat Alergi / Status Kehamilan]
    Context --> Form3[Disabilitas / Obesitas]
```

## AutoComplete+

Input utama:

- vital signs
- gejala / keluhan
- riwayat penyakit kronis efektif
- alergi
- status kehamilan
- preset
- disabilitas
- obesitas

Output:

- `alerts`
- draft anamnesa deterministik yang langsung mengisi kolom gejala
- summary analisis
- `TTVInferenceData`

Aturan penting:

- input 3-4 gejala tidak dihalusinasi menjadi fakta baru
- detail yang tidak ditulis user tidak diisi secara spekulatif
- hasil draft tetap editable oleh nakes di kolom gejala yang sama

## Intake UI Rules

- row intake padat setelah kolom gejala:
  - `Riwayat Alergi | Status Kehamilan`
  - `Disabilitas | Obesitas`
- `Status Kehamilan`
  - pasien perempuan: wajib diisi, diberi cue pink halus saat kosong
  - pasien laki-laki: field statis `Tidak relevan`
- dropdown standard custom dipakai untuk:
  - `Riwayat Alergi`
  - `Disabilitas`
  - `Obesitas`
  - `AutoComplete+ Preset`

## Forward to Doctor

```mermaid
sequenceDiagram
    participant UI as Side Panel
    participant Bridge as Bridge Client
    participant Crew as Crew Dashboard
    participant Doctor as Dokter

    UI->>Bridge: getOnlineDoctors()
    Bridge->>Crew: GET /api/doctors/online
    Crew-->>Bridge: doctors[]
    Bridge-->>UI: doctors[]
    UI->>Bridge: sendConsultToDoctor(payload)
    Bridge->>Crew: POST /api/consult
    Crew-->>Bridge: consultId
    Bridge-->>UI: consultId
    Crew-->>Doctor: inbox / notifikasi
```

## Doctor Ranking Logic

Urutan prioritas:

1. `availability_status`
2. kecocokan `poli`
3. kecocokan `facility_name/location_name`
4. nama dokter

UI transparansi:

- `matched poli`
- `same facility`

## Fallback Rules

- nama pasien invalid => `---`
- chronic history kosong => `Menunggu Input`
- payer kosong => fallback ke `bpjsStatus`
- `Penyakit Khusus` kosong => `Tidak terdeteksi`
- `Risiko Kehamilan` kosong => `Tidak terdeteksi`
- histori `< 3` => `Data not available` pada jalur trajectory
- `Status Kehamilan` pasien laki-laki => `Tidak relevan`
- `Obesitas` memakai wording `Terkonfirmasi` / `Tidak Terkonfirmasi`

## Related Files

- `entrypoints/content.ts`
- `entrypoints/sidepanel/main.tsx`
- `components/clinical/TTVInferenceUI.tsx`
- `lib/api/bridge-client.ts`
- `docs/forward-to-doctor-integration.md`
- `docs/architecture/vital-sign-algorithm-map.md`
