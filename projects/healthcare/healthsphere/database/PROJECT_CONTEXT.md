# Project Context: Primary Healthcare Data Repository

> Dokumen ini adalah sumber kebenaran utama untuk agent. Jika ada konflik,
ikuti bagian `Agent Contract` dan `Decision Log`.

## 1. Ringkasan Project
- Nama project: Primary Healthcare Data Repository
- ID project: pkm-data-repo
- Domain: Healthcare Data / Clinical Datasets
- Repo: abyss-monorepo (legacy) app\primary-healthcare\database
- Owner: Dr. Ferdi Iskandar (Chief)
- Status: Active (Data Source)
- Last updated: 2025-05-22

## 2. Tujuan Utama
- Masalah yang diselesaikan: Kebutuhan akan dataset klinis standar (ICD-10, daftar penyakit) yang terpusat dan terstruktur untuk digunakan oleh aplikasi dashboard dan website Puskesmas.
- Outcome yang diharapkan: Tersedianya referensi data medis yang akurat dan siap konsumsi oleh engine CDSS dan fitur pencarian ICD-X.
- Definisi sukses: Konsistensi kode diagnosis di seluruh ekosistem aplikasi Primary Healthcare.
- Non-goals: Menjadi database transaksional (fokus pada master data / referensi).

## 3. Agent Contract
### 3.1 Harus Dilakukan
- Selalu sapa user sebagai Boss atau Chief.
- Pastikan perubahan pada dataset mengikuti standar WHO ICD-10.
- Jaga integritas file JSON; pastikan format valid dan terbaca oleh parser aplikasi.
- Berikan peringatan jika melakukan perubahan pada kode diagnosis yang sudah mapan.

### 3.2 Jangan Dilakukan
- Jangan menghapus atau mengubah kode ICD-10 tanpa dasar medis yang kuat.
- Jangan memasukkan data pasien (PHI) ke dalam repository ini (ini hanya untuk master data).

### 3.3 Gaya Kerja
- Jawaban harus: Berorientasi pada data, akurat, dan metodis.
- Saat ragu, agent harus: Melakukan cross-check dengan dataset ICD-10 resmi atau bertanya pada Chief.
- Jika ada konflik konteks, agent harus: Mengacu pada dataset utama (`icd10.json`).

## 4. Konteks Bisnis
- User utama: Developer (sebagai data source), Dokter (melalui aplikasi).
- Use case utama: CDSS diagnostic mapping, ICD-X autocomplete, LB1 report categorization.
- Terminologi domain: ICD-10, ICD-X, 144 Penyakit Puskesmas, Mapping Diagnosis.
- Constraint bisnis: Data harus akurat secara klinis untuk menghindari kesalahan koding diagnosis.

## 5. Konteks Teknis
- Stack: JSON, CSV, YAML (Master Data).
- Arsitektur: Static Data Repository.
- Service / module penting: `icd10.json` (Daftar diagnosis), `144_penyakit_puskesmas.json` (Standar penyakit FKTP).
- Data flow ringkas: Data Source -> JSON -> Application CDSS/ICD-X Engine.
- Integrasi eksternal: Digunakan oleh `primary-healthcare/dashboard` dan `primary-healthcare/website`.

## 6. Struktur Repo
- Folder penting: `backups/`.
- File utama: `icd10.json`, `144_penyakit_puskesmas.json`, `icdx-extensions.json`.
- File yang dilarang diubah sembarangan: Semua file JSON utama (harus melalui validasi).

## 7. Workflow Kerja
### 7.1 Setup
- N/A (Repository data statis).

### 7.2 Development
- Menambah/mengubah data: Edit file JSON dan pastikan validitas syntax.
- Validasi: Gunakan linter JSON atau skrip validasi jika tersedia di monorepo.

### 7.3 Release / Deploy
- Proses update: Sinkronisasi data ke aplikasi yang bergantung melalui CI/CD atau manual copy.

## 8. Keputusan Penting
- 2025-05-22 - Inisialisasi Project Context sebagai repositori data terpusat untuk ekosistem Puskesmas.

## 9. Known Constraints
- Ukuran file `icd10.json` cukup besar (2.6MB), perlu penanganan memori saat parsing di sisi aplikasi.

## 10. Known Issues / Tech Debt
- Belum ada skrip otomatisasi untuk validasi integritas relasi antar dataset.

## 11. Open Questions
- Apakah perlu dikonversi ke format database yang lebih efisien (misal: SQLite) untuk penggunaan offline?

## 12. Acceptance Criteria
- Output dianggap benar jika: File JSON valid secara sintaksis dan akurat secara medis.
- Test yang harus lolos: JSON lint success.

## 13. Change Log
- 2025-05-22 - Initial creation of PROJECT_CONTEXT.md.

## 14. JSON Snapshot
```json
{
  "project": {
    "name": "Primary Healthcare Data Repository",
    "id": "pkm-data-repo",
    "domain": "Healthcare Data",
    "repo": "abyss-monorepo (legacy) app/primary-healthcare/database",
    "owner": "Dr. Ferdi Iskandar (Chief)",
    "status": "active",
    "last_updated": "2025-05-22"
  },
  "objective": {
    "problem": "Need for centralized and structured clinical datasets for Puskesmas apps.",
    "desired_outcome": "Accurate medical data reference ready for application consumption.",
    "success_definition": "Consistency in diagnostic codes across the ecosystem.",
    "non_goals": ["Transactional database"]
  },
  "agent_contract": {
    "must_do": [
      "Sapa sebagai Boss/Chief",
      "Follow WHO ICD-10 standards",
      "Ensure JSON syntax validity",
      "Warn on legacy code changes"
    ],
    "must_not_do": [
      "Alter diagnosis codes without medical basis",
      "Include patient PHI data"
    ],
    "working_style": {
      "response_style": "Data-oriented, Methodical",
      "when_unsure": "Cross-check with official ICD-10 sources",
      "conflict_policy": "icd10.json as source of truth"
    }
  },
  "business_context": {
    "users": ["Developers", "Medical Apps"],
    "primary_use_cases": ["CDSS Mapping", "ICD-X Autocomplete", "LB1 Categorization"],
    "terminology": {
      "ICD-10": "International Classification of Diseases 10th Revision",
      "144 Penyakit": "Standardized list of diseases for Indonesian Puskesmas"
    },
    "business_constraints": ["Clinical accuracy is mandatory"],
    "business_risks": ["Coding errors leading to reporting issues"]
  },
  "technical_context": {
    "stack": ["JSON", "CSV"],
    "architecture": "Static Data Repository",
    "core_services": ["ICD-10 Dataset", "Puskesmas Disease List"],
    "data_flow": ["Source Data -> JSON -> Application Engine"],
    "external_integrations": ["Used by Dashboard and Website apps"]
  },
  "repo_map": {
    "important_folders": ["backups"],
    "main_files": ["icd10.json", "144_penyakit_puskesmas.json", "icdx-extensions.json"]
  },
  "workflow": {
    "setup": {},
    "development": {
      "validation": ["JSON Linter"]
    },
    "release": {
      "sync_process": ["Manual/CI copy to dependent apps"]
    }
  },
  "decisions": [
    {
      "date": "2025-05-22",
      "decision": "Centralization of clinical data reference"
    }
  ],
  "known_constraints": ["Large JSON file sizes"],
  "known_issues": ["Lack of automated relationship validation scripts"],
  "change_log": [
    {
      "date": "2025-05-22",
      "summary": "Initial creation"
    }
  ]
}
```
