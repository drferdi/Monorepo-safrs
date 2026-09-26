# Project Context: Puskesmas PONED Balowerti Website

> Dokumen ini adalah sumber kebenaran utama untuk agent. Jika ada konflik,
ikuti bagian `Agent Contract` dan `Decision Log`.

## 1. Ringkasan Project
- Nama project: Puskesmas PONED Balowerti Website
- ID project: pkm-balowerti-website
- Domain: Public Healthcare Information
- Repo: abyss-monorepo (legacy) app\primary-healthcare\website
- Owner: Dr. Ferdi Iskandar (Chief)
- Status: Active
- Last updated: 2025-05-22

## 2. Tujuan Utama
- Masalah yang diselesaikan: Kebutuhan akan platform informasi publik yang modern dan aksesibel untuk warga sekitar Puskesmas Balowerti, Kota Kediri.
- Outcome yang diharapkan: Website yang informatif, cepat (static SPA), dan memudahkan pasien untuk melakukan reservasi layanan.
- Definisi sukses: Interface yang elegan, skor performa tinggi, dan kemudahan navigasi bagi masyarakat awam.
- Non-goals: Menyediakan fitur EMR atau pengelolaan data medis internal (ini dilakukan di Dashboard).

## 3. Agent Contract
### 3.1 Harus Dilakukan
- Selalu sapa user sebagai Boss atau Chief.
- Gunakan React 19, Vite 7, dan Tailwind CSS 4.
- Pertahankan performa maksimal (Lighthouse 90+) dan aksesibilitas tinggi.
- Terapkan "Drferdi Design Philosophy": Logis, fungsional, dan premium (fokus pada estetika medis yang hangat).
- Pastikan semua teks publik menggunakan Bahasa Indonesia yang baik dan benar.

### 3.2 Jangan Dilakukan
- Jangan mengubah arsitektur single-page scroll tanpa simulasi navigasi.
- Jangan menggunakan desain yang terlihat amatir atau tidak selaras dengan branding Sentra Healthcare.
- Jangan menambahkan backend logic (tetap sebagai static SPA).

### 3.3 Gaya Kerja
- Jawaban harus: Estetis, teknis, dan sangat memperhatikan detail UI/UX.
- Saat ragu, agent harus: Mengacu pada preferensi desain "The Abyss" dan bertanya pada Chief jika terkait detail layanan klinik.
- Jika ada konflik konteks, agent harus: Mengacu pada `README.md` dan `ARCHITECTURE.md`.

## 4. Konteks Bisnis
- User utama: Warga Kota Kediri (Pasien), Calon Pengunjung Puskesmas.
- Use case utama: Mencari jadwal dokter, mengetahui alur BPJS, reservasi via WhatsApp, informasi layanan USG.
- Terminologi domain: Puskesmas PONED, BPJS Kesehatan, Alur Pasien, Reservasi WhatsApp.
- Constraint bisnis: Harus ramah mobile (mobile-first) dan mudah dipahami oleh berbagai kalangan usia.

## 5. Konteks Teknis
- Stack: Vite 7, React 19, Tailwind CSS 4, Framer Motion 12, Lenis (Smooth Scroll).
- Arsitektur: Static Single-Page Application (SPA) dengan Section Reveal System.
- Service / module penting: `LuxuryChatbox` (ABBY AI), `Reservation` (WhatsApp integration), `Testimonials` (Google Reviews sync).
- Data flow ringkas: Static Data -> React Components -> UI.
- Integrasi eksternal: Google Places API (via scripts), WhatsApp Web, Railway (Deploy).

## 6. Struktur Repo
- Folder penting: `src/sections/`, `src/components/`, `public/data/`, `scripts/`.
- File entry point: `src/main.tsx`, `src/App.tsx`.
- File yang sering disentuh: `src/sections/`, `src/index.css`.
- File yang dilarang diubah sembarangan: `vite.config.ts`, `package.json`.

## 7. Workflow Kerja
### 7.1 Setup
- Install: `npm install`
- Env var: `.env.example`
- Command bootstrap: `npm run dev`

### 7.2 Development
- Run app: `npm run dev`
- Run tests: `npm test` (Vitest)
- Lint: `npm run lint`
- Sync Reviews: `npm run sync:reviews`
- Build: `npm run build`

### 7.3 Release / Deploy
- Proses deploy: Railway (Static `serve` via `npx`).
- Approval yang dibutuhkan: Chief (Dr. Ferdi).
- Checklist sebelum release: Performance audit, Mobile responsiveness check.

## 8. Keputusan Penting
- 2024-11-20 - Arsitektur single-page tanpa client-side router untuk performa instan.
- 2025-01-10 - Implementasi `IntersectionObserver` untuk animasi stagger pada setiap section.
- 2025-05-22 - Inisialisasi Project Context untuk sinkronisasi Agent.

## 9. Known Constraints
- Google Reviews bersifat statis (perlu sinkronisasi manual via script).
- Tidak ada database backend; semua data bersifat statis atau dikirim ke WhatsApp.

## 10. Known Issues / Tech Debt
- Unit test coverage masih sangat rendah.
- Beberapa aset gambar perlu optimasi lebih lanjut ke format Avif.

## 11. Open Questions
- Integrasi chat bot AI yang lebih dinamis langsung ke Dashboard?

## 12. Acceptance Criteria
- Output dianggap benar jika: Tampilan elegan sesuai desain premium, navigasi scroll mulus, dan fungsionalitas reservasi aktif.
- Test yang harus lolos: Build success & Lint clean.
- Sinyal selesai: Chief memberikan konfirmasi "Excellency".

## 13. Change Log
- 2025-05-22 - Initial creation of PROJECT_CONTEXT.md.

## 14. JSON Snapshot
```json
{
  "project": {
    "name": "Puskesmas PONED Balowerti Website",
    "id": "pkm-balowerti-website",
    "domain": "Public Healthcare Information",
    "repo": "D:\\Devops\\abyss-monorepo\\app\\primary-healthcare\\website",
    "owner": "Dr. Ferdi Iskandar (Chief)",
    "status": "active",
    "last_updated": "2025-05-22"
  },
  "objective": {
    "problem": "Need for a modern, accessible public information platform for Balowerti residents.",
    "desired_outcome": "Informative, fast static SPA with easy reservation features.",
    "success_definition": "Elegant UI, high performance scores, and intuitive navigation for general public.",
    "non_goals": ["EMR features", "Internal medical data management"]
  },
  "agent_contract": {
    "must_do": [
      "Sapa sebagai Boss/Chief",
      "React 19 / Vite 7 standards",
      "Maintain high performance (Lighthouse 90+)",
      "Drferdi Design Philosophy"
    ],
    "must_not_do": [
      "Modify single-page scroll architecture without simulation",
      "Amateur or non-aligned branding design",
      "Add backend logic"
    ],
    "working_style": {
      "response_style": "Aesthetic, Technical, Detail-oriented",
      "when_unsure": "Follow 'The Abyss' design preferences",
      "conflict_policy": "README.md + ARCHITECTURE.md"
    }
  },
  "business_context": {
    "users": ["Local Residents", "Patients"],
    "primary_use_cases": ["Check doctor schedules", "BPJS flow info", "WhatsApp Reservation"],
    "terminology": {
      "PONED": "Basic Emergency Obstetric and Newborn Care",
      "ABBY": "AI Chatbot Assistant Name"
    },
    "business_constraints": ["Mobile-first approach", "Ease of use for all ages"],
    "business_risks": ["Outdated info if static data is not synced"]
  },
  "technical_context": {
    "stack": ["Vite 7", "React 19", "Tailwind CSS 4", "Framer Motion 12", "Lenis Scroll"],
    "architecture": "Static SPA with Section Reveal System",
    "core_services": ["LuxuryChatbox", "Reservation Engine", "Testimonials Engine"],
    "data_flow": ["Static JSON -> React -> UI"],
    "external_integrations": ["Google Places API", "WhatsApp", "Railway"],
    "critical_dependencies": ["react", "vite", "framer-motion", "lucide-react"]
  },
  "repo_map": {
    "important_folders": ["src/sections", "src/components", "public/data", "scripts"],
    "entry_points": ["src/main.tsx", "src/App.tsx"],
    "frequently_changed_files": ["src/sections/", "src/index.css"],
    "protected_files": ["vite.config.ts", "package.json"]
  },
  "workflow": {
    "setup": {
      "install": ["npm install"],
      "env_vars": [".env.example"]
    },
    "development": {
      "run": ["npm run dev"],
      "test": ["npm test"],
      "lint": ["npm run lint"],
      "sync": ["npm run sync:reviews"],
      "build": ["npm run build"]
    },
    "release": {
      "deploy_process": ["Railway Deploy"],
      "required_approvals": ["Chief"],
      "pre_release_checklist": ["Performance audit", "Responsive check"]
    }
  },
  "decisions": [
    {
      "date": "2024-11-20",
      "decision": "Single-page scroll architecture for instant performance"
    },
    {
      "date": "2025-01-10",
      "decision": "IntersectionObserver for staggered section animations"
    }
  ],
  "known_constraints": ["Static Google Reviews", "No backend database"],
  "known_issues": ["Low test coverage", "Image optimization potential"],
  "change_log": [
    {
      "date": "2025-05-22",
      "summary": "Initial creation"
    }
  ]
}
```
