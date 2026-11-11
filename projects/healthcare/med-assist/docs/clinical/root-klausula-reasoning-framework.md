# Root Klausula — Clinical Reasoning Framework

**Status:** Knowledge capture only. NOT wired into any active code, logic, or clinical rule. No part of this document authorizes a code change. Integration into any system requires separate, explicit governance approval from dr. Ferdi Iskandar, per SSOT §14 and §17.

**Source:** Extracted directly from dr. Ferdi Iskandar — 25 years of clinical practice, zero mortality track record — via a supervised session with Claude (Sentra Assist project), 2026-07-01.

**Purpose:** This document is the first entry in what is intended to become a structured capture of clinical reasoning patterns that exist in Chief's practice but have never been written down or encoded. It is raw knowledge capture, not a specification.

---

## Core principle: Root Klausula

Chief's own framing: "root klausula. Hentikan root cause maka healing process akan berjalan berantai." Multiple co-occurring complaints are not independent problems to be matched one-by-one — they are downstream manifestations of a single upstream root. Resolving the root allows the downstream cascade to resolve on its own.

## General reasoning algorithm (meta-pattern)

Observed consistently across every example Chief walked through this session:

1. **Temporal check** — Is this recurring, or the first occurrence? This determines whether to search for a chronic/structural root or an acute trigger.
2. **Precise localization** — Exactly where does the symptom manifest? Location is frequently itself a strong diagnostic discriminator (e.g. occipital vs frontal headache; epigastric vs diffuse abdominal pain).
3. **Branch:**
   - **(a) Classic/pathognomonic cluster recognition** — some symptom combinations are diagnostic on the clinical pattern alone. Lab values are confirmatory, not gatekeeping, for these patterns.
   - **(b) Root-cause chain tracing** — when no immediately classic pattern is recognized, trace a single upstream root and derive how it mechanistically produces each presenting symptom as a downstream consequence.
4. **Two-phase therapy** — (i) acute/symptomatic: eliminate each currently active complaint now; (ii) root-cause resolution: address the underlying driver, confirmed at a scheduled control visit.

**Open question (unresolved, flag for follow-up):** is the control window (e.g. 3 days) fixed across all patterns, or does it vary with the severity/nature of the root cause?

---

## Captured patterns

### Pattern 1 — Vertigo / arthralgia / insomnia cluster

Presenting complaints: pusing berputar, mual, nyeri sendi, tidak bisa tidur.

Chain:

- Insomnia (kurang tidur kronis) → penurunan imunitas → bercabang:
  - (a) Reaktivasi infeksi kronis THT → vertigo posisional (memberat saat perubahan posisi) → mual (respons fisiologis sekunder dari vertigo yang tidak ditangani)
  - (b) Predisposisi peradangan (genetik) + imunitas rendah → nyeri sendi (pola menyerupai artritis reumatoid)

Therapy:

- Acute phase (eliminasi keluhan sekarang): Dimenhidrinat (vertigo), Natrium Diclofenac (nyeri sendi), Domperidon (mual), Amitriptilin (insomnia)
- Root phase: kontrol +3 hari, eliminasi penyebab (infeksi THT / pola tidur)

### Pattern 2 — Epigastric / bloating / nausea / appetite cluster

Presenting complaints: nyeri ulu hati, kembung, mual, nafsu makan turun.

First triage question: berulang atau baru pertama kali?

Chain (recurring/chronic presentation): luka pada lambung / ulserasi → produksi asam lambung berlebihan → gas naik → nyeri ulu hati + kembung → mual (respons fisiologis normal tubuh terhadap distres lambung) → nafsu makan menurun (konsekuensi akhir)

Discriminator noted: pola nyeri terhadap makan (memberat vs mereda saat makan) membedakan subtipe ulkus — belum dielaborasi penuh oleh Chief, flag untuk sesi lanjutan.

### Pattern 3 — DM classic triad — lab-independence principle

Presenting complaints: polidipsi, poliuri, polifagi.

Chief's own words: "DM. I don't care how much/high the lab said, I deal with the patient directly, not with the stupid lab."

Principle: kombinasi trias ini diagnostik berdasarkan pola klinis semata. Nilai lab (glukosa dsb.) bersifat konfirmatori, bukan gerbang/syarat untuk bertindak.

**System design implication (flag only, not a decision):** any future Triage Input Contract or insufficient-data fallback logic must not downgrade confidence to "insufficient" for this pattern purely because a lab glucose value is absent — the symptom triad itself carries diagnostic weight independent of lab confirmation, per Chief's stated clinical judgment.

### Pattern 4 — Hypertension (I10) — location as discriminator (incomplete)

Presenting complaints: nyeri kepala, tengkuk berat, mudah marah, susah konsentrasi.

Chief's own words: "Lokasi bermain peran di sini, nyeri belakang kepala ciri khas dari I10 / hipertensi."

Principle: lokasi nyeri kepala (oksipital/tengkuk, bukan frontal/temporal) adalah tanda karakteristik I10.

**Open item:** rantai kausal penuh untuk mudah marah dan susah konsentrasi belum dielaborasi oleh Chief — apakah keduanya konsekuensi langsung dari hipertensi yang sama, atau perlu jalur kausal terpisah. Flag untuk sesi lanjutan.

---

## Non-negotiables

- Dokumen ini adalah knowledge capture, bukan spesifikasi teknis.
- Tidak ada rule klinis, alert semantics, atau payload contract yang boleh diturunkan dari dokumen ini tanpa persetujuan eksplisit terpisah dari dr. Ferdi Iskandar.
- Dokumen ini adalah entri pertama — bukan daftar lengkap — dari basis pengetahuan yang akan terus bertambah pada sesi-sesi berikutnya.
