# Assist UI + Dashboard Clinical Engine Architecture

Tanggal: 2026-04-06

## Tujuan

Dokumen ini menetapkan model arsitektur target:

- `Assist` menjadi surface utama untuk klinisi
- `Dashboard Intelligence` menjadi canonical clinical engine

Dengan model ini, klinisi tetap bekerja di sidebar / widget yang mereka sukai, tetapi perhitungan klinis inti tidak diduplikasi.

## Prinsip Inti

- `Assist` = workflow-first UI
- `Dashboard` = source of truth untuk clinical scoring
- tidak ada engine klinis paralel yang hidup sendiri di extension

## Diagram Konteks

```mermaid
flowchart LR
    Nurse[Perawat / Dokter]
    RME[ePuskesmas RME]
    Assist[Med Assist Sidebar]
    Extractor[RME Extractor + Intake Form]
    Payload[Triage Input Contract]
    Engine[Dashboard Clinical Engine]
    Persist[Vital Persistence + Longitudinal Store]
    Outputs[Scoring + Alerts + Trajectory + Recommendations]
    Relay[Forward to Doctor / Consult Relay]

    Nurse --> Assist
    RME --> Extractor
    Assist --> Extractor
    Extractor --> Payload
    Payload --> Engine
    Engine --> Persist
    Engine --> Outputs
    Outputs --> Assist
    Assist --> Relay
```

## Diagram Boundary

```mermaid
flowchart TD
    subgraph Assist["Med Assist (UI / Workflow Layer)"]
        A1[RME extraction]
        A2[Intake form]
        A3[AutoComplete+]
        A4[Doctor picker]
        A5[Consult initiation]
    end

    subgraph Engine["Dashboard Intelligence (Canonical Clinical Engine)"]
        E1[Hardcoded vital red flags]
        E2[NEWS2]
        E3[Early warning patterns]
        E4[Occult shock]
        E5[Trajectory / momentum]
        E6[Clinical persistence]
        E7[Governance semantics]
    end

    A1 --> A2
    A2 --> A3
    A3 --> E1
    A2 --> E2
    A2 --> E3
    A2 --> E4
    A2 --> E5
    E1 --> A4
    E2 --> A4
    E3 --> A4
    E4 --> A4
    E5 --> A4
    A4 --> A5
```

## Runtime Flow

```mermaid
sequenceDiagram
    participant User as Klinisi
    participant Assist as Med Assist
    participant Engine as Dashboard Engine
    participant Store as Vital Store
    participant Doctor as Doctor Target

    User->>Assist: Isi vital sign + gejala + context RME
    Assist->>Assist: Susun intake + AutoComplete+
    Assist->>Engine: Kirim TriageInput canonical
    Engine->>Engine: Hitung red flags, NEWS2, patterns, occult shock, trajectory
    Engine->>Store: Persist vital + metadata + risk
    Engine-->>Assist: Kirim scoring + alerts + recommendations
    Assist-->>User: Tampilkan hasil di sidebar
    User->>Assist: Forward to Doctor
    Assist->>Doctor: Kirim consult payload
```

## Apa Yang Hidup Di Assist

`Assist` tetap memiliki:

- extractor RME / ePuskesmas
- intake form bedside
- `AutoComplete+`
- summary pasien
- consult snapshot
- doctor ranking UI
- `Forward to Doctor`

`Assist` tidak menjadi owner utama untuk:

- NEWS2
- red flag semantics final
- occult shock final
- trajectory risk semantics
- longitudinal persistence

## Apa Yang Hidup Di Dashboard Engine

`Dashboard` menjadi owner utama untuk:

- hardcoded vital red flags canonical
- NEWS2 canonical
- disease-specific early warning patterns
- occult shock canonical
- trajectory / momentum canonical
- vital persistence longitudinal
- alert severity semantics dan governance

## Triage Input Contract

Input minimum yang sebaiknya dikirim dari `Assist` ke engine canonical:

- patient context minimal
  - gender
  - age
  - RM / patient identifier aman
- vital signs
  - SBP
  - DBP
  - HR
  - RR
  - Temp
  - SpO2
  - Glucose
- narrative
  - `keluhan_utama`
  - `keluhan_tambahan`
- context tambahan
  - chronic diseases
  - allergies
  - pregnancy status
  - structured bedside signs
  - extracted special conditions

## Output Contract

Output minimum yang dikirim balik dari engine canonical ke `Assist`:

- red flags
- NEWS2 score + risk level
- early warning matches
- occult shock result
- trajectory summary jika tersedia
- recommended actions
- governance disclaimer

## Keuntungan Model Ini

- klinisi tetap bekerja di flow yang mereka sukai
- logic klinis final tidak duplicated
- auditability lebih kuat
- perubahan threshold cukup di satu tempat
- drift antar app turun drastis

## Yang Harus Dihindari

- copy-paste seluruh engine dashboard ke extension
- membiarkan `Assist` punya threshold klinis versi sendiri tanpa sinkronisasi
- menempatkan governance semantics di dua tempat berbeda

## Kalimat Keputusan Produk

Kalimat yang aman dipakai:

- `Assist adalah cockpit klinisi.`
- `Dashboard intelligence adalah mesin klinis kanonik.`
- `Assist menampilkan dan mengirim, dashboard menghitung dan memutuskan semantics klinis.`

## Related Files

- `docs/architecture/vital-sign-engine-comparison-matrix.md`
- `docs/architecture/vital-sign-algorithm-map.md`
- `docs/architecture/vital-sign-executive-brief.md`
