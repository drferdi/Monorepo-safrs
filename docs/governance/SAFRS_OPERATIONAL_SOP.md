---
title: SAFRS Operational Standard Operating Procedure (SOP)
status: CANONICAL
subject: operational-sop
authority: operational-governance
version: 1.0.0
---

# SAFRS Operational Standard Operating Procedure (SOP)

**Sentra Artificial Intelligence**  
*Human-Governed · Agent-Executed · Machine-Enforced*

---

## 1. Purpose & Scope

Standard Operating Procedure (SOP) ini menetapkan tata cara operasional resmi dalam mengelola repositori **Monorepo SAFRS v1.1**, meliputi:
1. Sinkronisasi otomatis dan pemeliharaan GitHub Wiki 81-halaman via agent (Droid/Factory).
2. Karantina dokumen internal agent (*agent-internal plans, memory, workflows*) dari repositori publik.
3. Pemulihan integritas objek Git (*tree/blob healing* dan *packed-refs sanitation*).
4. Penegakan **SAFRS Capsule Gate** untuk publikasi terfilter (*sovereign filtered publish*) ke remote GitHub.
5. Pemeliharaan bedah (*surgical maintenance*) dokumen publik `README.md` dengan mempertahankan sistem visual dan estetika.

Seluruh agent otonom (Gaffer, Antigravity, Codex, Claude, Droid) wajib mematuhi SOP ini.

---

## 2. SOP-01: GitHub Wiki Deployment & Automated Sync

### 2.1. Invarian & Prasyarat
- Fitur GitHub Wiki harus berstatus aktif (`has_wiki: true` pada repository settings).
- Halaman `Home.md` harus diinisialisasi minimal satu kali pada antarmuka web GitHub agar bare remote endpoint `git@github.com:drferdi/Monorepo-safrs.wiki.git` aktif.
- Dokumen Wiki publik bersumber dari ekosistem Factory/Droid atau direktori dokumentasi kanonikal.

### 2.2. Konfigurasi Identitas Git Global
Untuk mencegah kegagalan `Author identity unknown` saat clone/push otomatis pada temp directory:
```bash
git config --global user.name "drferdi"
git config --global user.email "drferdiiskandar@sentrahai.com"
```

### 2.3. Git SSH Bridge untuk Non-Interactive Push
Agen latar belakang (background workers seperti Droid) tidak memiliki antarmuka interaktif untuk prompt kredensial HTTPS (Git Credential Manager). Wajib dipasang URL translation bridge ke SSH:
```bash
git config --global url."git@github.com:".insteadOf "https://github.com/"
```
*Verifikasi*:
```bash
ssh -T git@github.com
# Hasil yang valid: Hi drferdi! You've successfully authenticated...
```

### 2.4. Alur Sinkronisasi Wiki
1. Droid/Agent meng-clone `Monorepo-safrs.wiki.git` ke folder sementara.
2. Sinkronkan seluruh 81 halaman materi arsitektur, spesifikasi SAFRS, panduan kapsul, dan metadata `_Sidebar.md`.
3. Lakukan commit dengan identitas `drferdi <drferdiiskandar@sentrahai.com>`.
4. Eksekusi `git push origin master` via SSH bridge secara mulus tanpa intervensi manual.

---

## 3. SOP-02: Internal Agent Docs Quarantine & Exclusion

### 3.1. Invarian Kerahasiaan & Kerapian Repositori
Dokumen yang bersifat operasional internal AI, *scratchpad planning*, prompt kustom, maupun catatan sesi agen **DILARANG** dipublikasikan ke remote publik.

### 3.2. Daftar Jalur Wajib Karantina (`.gitignore`)
Pastikan entri berikut selalu ada dan ditegakkan di `.gitignore`:
```gitignore
# Internal Agent Planning & Scratchpads
docs/plans/
docs/superpowers/
docs/gaffer_note/
docs/workflow/
**/docs/superpowers/

# Agent Memory & Session States
projects/**/.claude/
**/.claude/agent-memory/
projects/**/.cursor/hooks/state/

# Confidential Corporate & Heavy Media Assets
docs/library/01_Incorporation/
docs/library/02_Agreements_Under_Review/
docs/library/03_FINANCE_STRATEGY/
docs/library/**/*.mp4
docs/library/**/*.zip
```

### 3.3. Prosedur Pelepasan Tracking (Untracking)
Jika folder internal sempat terindeks oleh Git, lepaskan index tanpa menghapus file lokal:
```bash
git rm --cached -r docs/plans/ docs/superpowers/ docs/gaffer_note/ docs/workflow/
git commit -m "chore(governance): quarantine internal agent artifacts from public tracking"
```

---

## 4. SOP-03: Git Repository Healing & Object Integrity

### 4.1. Pemulihan Missing Tree / Object Blobs
Jika muncul galat `fatal: unable to read tree <hash>` atau `missing blob`:
1. Normalisasikan status indeks:
   ```bash
   git add --renormalize .
   ```
2. Buat objek tree segar dari indeks saat ini:
   ```bash
   git write-tree
   ```
3. Commit tree tersebut ke branch kerja yang relevan:
   ```bash
   git commit -m "fix(git): renormalize index and seal fresh tree object"
   ```

### 4.2. Sanitasi `.git/packed-refs`
Jika Git melaporkan `corrupt peeled tag` (`^...`) atau ref cabang yang hilang:
1. Periksa file `.git/packed-refs`.
2. Hapus baris hash peeled (`^<hash>`) yang tidak memiliki header tag valid atau mengarah ke commit yang telah di-prune.
3. Jalankan verifikasi integritas penuh:
   ```bash
   git fsck --no-dangling
   ```

---

## 5. SOP-04: SAFRS Capsule Gate & Sovereign Filtered Publication

### 5.1. Invarian Kedaulatan Kapsul (Capsule Sovereignty)
Berdasarkan SAFRS v1.1 dan arahan Chief (2026-08-25):
- Repositori `Monorepo-safrs.git` adalah **Public AI Control Plane**.
- Direktori `projects/**` adalah proyek berdaulat (*sovereign standalone project capsules*) yang memiliki repositori mandiri (misal `sentrabot`, `avery`, `kediri-history`, `academic-smartboard`).
- Kode aplikasi dalam `projects/**` **TIDAK BOLEH** didorong ke remote `origin` monorepo publik.

### 5.2. Prosedur Isolasi Sibling Worktree
Dilarang memodifikasi branch publikasi langsung pada root tree aktif. Gunakan sibling worktree di luar direktori kerja (`../Monorepo.worktrees/`):

1. **Buat Worktree Terisolasi**:
   ```bash
   git worktree add ../Monorepo.worktrees/publish-clean publish-no-projects
   ```
2. **Cherry-Pick / Sinkronkan Perubahan Non-Capsule**:
   ```bash
   cd ../Monorepo.worktrees/publish-clean
   git cherry-pick <commit-hash>
   ```
   *(Selesaikan konflik jika ada, pastikan hanya menyentuh root governance, tools, atau docs non-internal).*
3. **Verifikasi Ketiadaan Proyek Capsule**:
   Pastikan direktori `projects/` hanya menyisakan `README.md` dan `_template`:
   ```bash
   git status
   ```
4. **Eksekusi Push ke Remote**:
   ```bash
   git push origin publish-no-projects
   ```
5. **Pembersihan Worktree**:
   ```bash
   cd D:\DEV\Monorepo
   git worktree remove ../Monorepo.worktrees/publish-clean
   ```

---

## 6. SOP-05: Documentation Surgical Peremajaan (README Maintenance)

### 6.1. Invarian Desain Visual
Saat memperbarui `README.md` publik:
- **DILARANG** merombak struktur, menghapus JetBrains Mono typing SVG, merusak badge shields, formula KaTeX, format tabel bersubskrip, atau dedikasi footer (*Aldebaran, Aimee, Audrey, and Del*).
- Setiap pembaruan wajib bersifat **bedah (*surgical edit*)** via `replace_file_content`.

### 6.2. Checklist Sinkronisasi
1. **Wiki Link**: Pastikan link ke [Sentra SAFRS Wiki](https://github.com/drferdi/Monorepo-safrs/wiki) aktif di bagian Quick Start / Navigation.
2. **Kapsul Berdaulat**: Tabel *Current capsules* harus mencantumkan seluruh kapsul aktif:
   - `golden-path` (Internal reference flow)
   - `control-center` (Internal operator dashboard)
   - `academic-smartboard` (Academic platform & Kayyisa AI)
   - `kediri-history` (Digital heritage storytelling)
   - `sentrabot` (Robotics & autonomous agent suite)
   - `avery` (Clinical healthcare intelligence)
   - `portfolio-drnovia` (Medical specialist academic portfolio)
   - `_template` (Sovereign capsule scaffold)
3. **Command Orchestration**: Daftarkan engine autonomous `pnpm saf gaffer run <intent>`.
4. **Sanitasi Link Internal**: Jangan meninggalkan tautan ke `docs/plans/` yang telah di-ignore. Alihkan ke dokumen kanonikal `docs/architecture/` atau Wiki resmi.
5. **Kontak Resmi**: Pastikan email tertaut ke `drferdiiskandar@sentrahai.com`.

---

## 7. Operational Checklist Ringkas

Sebelum mendeklarasikan sesi selesai (*session closing*):
- [ ] Working tree bersih (`git status -s` menghasilkan zero uncommitted changes).
- [ ] Pemeriksaan dokumen valid (`python tools/safrs/check_docs.py` lolos `OK`).
- [ ] Commit menyertakan *attribution trailer* resmi (`Co-Authored-By: ...`).
- [ ] Publikasi remote selaras dengan `origin publish-no-projects` via Capsule Gate.
- [ ] `.agents/HANDOFF.md` diperbarui dengan rekam jejak terkini dan referensi SOP ini.
