Betul. Yang dibutuhkan adalah **plan yang bisa langsung diberikan ke coding agent untuk mengubah codebase**, bukan daftar diagnosis lagi.

Saya akan batasi ke **6 fixes**. Tidak ada fitur baru. Tidak ada MAESTRO expansion. Tidak ada redesign architecture. Prinsip proyek sendiri memang meminta incremental improvement dan menghindari refactor spekulatif.  

# Avery / Sentra Hermes — Implementation Plan

## FIX-01 — Hapus konflik konfigurasi runtime

**Problem:** kita tidak boleh mempunyai model/tool/profile yang kelihatannya aktif di config A tetapi runtime sebenarnya membaca config B.

### Implementation

1. Trace startup Hermes sampai ditemukan **actual config resolution chain**.
2. Identifikasi semua sumber:
   `global config → profile config → env → CLI → Studio/UI override`.
3. Tetapkan **Avery profile config sebagai satu source of truth** untuk model dan tool exposure.
4. Hapus hanya duplicate overrides yang memang mengalahkan Avery profile.
5. Pada startup, emit satu structured log:

```text
profile=avery
provider=...
model=...
toolset=...
config_source=...
```

6. Jangan hard-code model baru sebelum comparison test membuktikan model saat ini memang inferior.

### Acceptance

Restart Avery 3×.

Ketiganya harus menghasilkan effective config identik.

**DONE ketika:** kita bisa menunjuk satu file/config dan berkata, “inilah yang benar-benar digunakan Avery.”

---

# FIX-02 — Perbaiki WhatsApp ingress yang silent

Current MAESTRO design memang membuang pesan yang gagal mention/allowlist secara silent sebelum orchestration layer. 

Quiet-by-default tetap dipertahankan.

Yang diperbaiki adalah **developer observability**, bukan behavior WA.

### Target

```text
gateway/baileys-bridge/
core/security/
```

### Implementation

Ubah filter dari:

```js
if (!allowed) return;
```

menjadi secara konseptual:

```js
return {
  accepted: false,
  reason: "MENTION_MISMATCH"
};
```

Standard reason codes:

```text
MENTION_MISMATCH
GROUP_NOT_ALLOWED
USER_NOT_ALLOWED
INVALID_JID
INVALID_MESSAGE
PASSED
```

Pipeline menjadi:

```text
WhatsApp
  ↓
received
  ↓
identity check
  ↓
allowlist
  ↓
mention match
  ↓
Hermes dispatch
```

Setiap titik menulis local structured trace.

**Tidak ada message baru dikirim ke grup.**

### Tambahan fix

Regex mention harus di-compile saat boot.

Jika regex invalid:

```text
BOOT FAIL
```

bukan silently tidak bekerja.

Placeholder JID/config produksi juga divalidasi saat startup.

### Acceptance

Test:

```text
normal chatter               → MENTION_MISMATCH
@Avery wrong group           → GROUP_NOT_ALLOWED
@Avery allowed group         → PASSED
allowed + valid invocation   → HERMES_DISPATCHED
```

**DONE ketika:** tidak ada lagi kondisi “Avery diam dan kita tidak tahu kenapa.”

---

# FIX-03 — Hapus self-imposed permission dari Avery

Ini fix paling penting terhadap perilaku Avery.

Authority datang dari Chief. Avery tidak membuat permission layer kedua.

### Target

**Avery system instructions / profile instructions.**

Bukan Hermes core.

### Remove / rewrite

Cari instruction yang secara efektif mengatakan:

```text
ask first
be conservative before acting
seek permission
decide whether action is appropriate
```

untuk operasi yang sebenarnya sudah diotorisasi.

Jangan sentuh approval yang memang eksplisit ditetapkan Chief, seperti memory approval.

Memory Approval Gate memang merupakan current supervisory mechanism. 

### Replace dengan satu rule

```text
When the requested objective is within the authority granted by
the operator and the required tools are available, continue
execution without requesting redundant confirmation.

Ask only when:
1. required information is genuinely missing; or
2. an explicit operator-defined approval gate applies.
```

Dan:

```text
Do not invent additional permission requirements.
```

### Fix governance conflict

Current MAESTRO document masih mengatakan:

> “Autonomy is earned, not granted” dan error budget dapat menurunkan autonomy secara otomatis. 

Untuk Avery, ubah mekanismenya menjadi:

```text
error budget exhausted
        ↓
alert / circuit breaker / stop failed loop
```

bukan:

```text
error budget exhausted
        ↓
agent silently loses previously granted authority
```

Authority hanya berubah karena **Chief policy**, bukan keputusan adaptive agent.

### Acceptance

Prompt:

> “Cari file X, analisis masalahnya dan perbaiki.”

FAIL:

> “Apakah saya boleh membaca file?”

PASS:

```text
search
→ inspect
→ edit
→ verify
→ report
```

---

# FIX-04 — Pastikan Hermes instruments benar-benar reachable

Jangan menambah skill.

Kita hanya memastikan instrumen yang **sudah ada** sampai ke Avery.

Current architecture sudah memiliki skill modules, knowledge, browser-use, orchestration, security dan memory. 

### Implementation

Pada runtime Avery lakukan capability smoke test terhadap:

| Instrument  | Test                              |
| ----------- | --------------------------------- |
| Files       | read + write temp file            |
| Terminal    | execute harmless command          |
| Browser/web | retrieve one page                 |
| Knowledge   | retrieve known document           |
| Memory      | read existing memory              |
| Skills      | invoke one known skill            |
| Cron        | inspect/list scheduler            |
| Delegation  | invoke only if already configured |

Untuk setiap FAIL:

```text
registered?
   ↓
exposed to profile?
   ↓
schema valid?
   ↓
call reaches handler?
   ↓
result returns to model?
```

Perbaiki **titik yang rusak saja**.

Contoh:

```text
tool exists + not registered
→ fix registration

registered + profile hides it
→ fix profile exposure

handler runs + response lost
→ fix return path
```

Jangan membuat replacement wrapper.

### Acceptance

Semua capability yang seharusnya tersedia:

```text
DISCOVERABLE → CALLABLE → RESULT CONSUMED
```

**DONE ketika:** tool existence sama dengan actual Avery capability.

---

# FIX-05 — Ubah Avery dari answer-loop menjadi completion-loop

Tidak perlu custom planner baru.

Kita gunakan Hermes loop yang ada, tetapi instruction-nya harus mendorong **objective completion**.

### Target

Avery execution instructions.

### Add execution invariant

```text
For actionable requests:

UNDERSTAND
→ ACT
→ OBSERVE
→ CONTINUE
→ VERIFY
→ REPORT

Do not stop at recommendation when available tools can perform
the requested work.
```

Definisi `BLOCKED` dibatasi:

```text
required capability unavailable
required data genuinely absent
explicit approval required
bounded retries exhausted
```

Bukan:

```text
uncertain
prefer asking
task is complex
```

### Example acceptance test

Chief:

> “Cari konfigurasi yang menyebabkan Avery tidak merespons lalu perbaiki.”

Expected:

```text
inspect
→ locate config
→ identify fault
→ patch
→ restart/reload
→ test
→ report
```

Tidak boleh berhenti di:

> “Kemungkinan masalahnya ada pada regex.”

---

# FIX-06 — Verification + bounded recovery

Project standards sudah menyatakan verification adalah bagian dari implementation, bukan optional step. 

CASE layer juga sudah mensyaratkan bounded feedback loop serta pencegahan retry storm. 

Jadi ini bukan fitur baru—kita membuat implementasinya benar.

### Implementation

Untuk mutation:

```text
ACTION
  ↓
OBSERVE
  ↓
VERIFY
```

Contoh:

```text
write file
→ read file

change config
→ reload config
→ inspect effective config

restart gateway
→ health check

send task
→ inspect delivery/result
```

Retry policy:

```text
attempt 1
  ↓ fail
diagnose
  ↓
attempt alternative
  ↓ fail
diagnose
  ↓
final bounded attempt
```

Default:

```text
max_attempts = 3
```

Tidak melakukan tiga kali command identik secara bodoh; setiap retry harus didahului diagnosis atau alternative action.

Jika tetap gagal:

```text
BLOCKED
cause:
attempts:
last_error:
required_next_condition:
```

### Acceptance

Agent **tidak boleh mengatakan `done`** jika verification gagal.

---

# Urutan implementasi sebenarnya

```text
FIX-01  Runtime config
   ↓
FIX-02  WhatsApp ingress trace
   ↓
FIX-03  Remove redundant permission behavior
   ↓
FIX-04  Restore actual tool access
   ↓
FIX-05  Completion-loop behavior
   ↓
FIX-06  Verification + recovery
   ↓
REGRESSION TEST
```

Tidak paralel dulu, karena FIX-01 dan FIX-02 menentukan apakah problem berikutnya sebenarnya berasal dari Hermes atau dari infrastructure.

---

## Final Regression Gate

Setelah enam fix, jalankan **task yang sama pada Avery**, bukan benchmark abstrak:

```text
T1  @Avery simple question
T2  @Avery research task
T3  locate + read file
T4  locate + modify + verify file
T5  browser research + summarize
T6  multi-step tool task
T7  deliberate tool failure → recover
T8  unauthorized/approval-gated operation
T9  allowed operation → no redundant permission
T10 WhatsApp mention failure → traceable reason
```

Release hanya jika:

| Requirement                            | Gate |
| -------------------------------------- | ---: |
| Correct mention routing                | 100% |
| No unexplained silent drop             | 100% |
| Expected tools callable                | 100% |
| Redundant permission prompts           |    0 |
| Multi-step tasks continue autonomously | PASS |
| Mutation verified before success       | 100% |
| Infinite retry                         |    0 |
| Existing memory approval unaffected    | PASS |
| Existing DLP/allowlist unaffected      | PASS |

Itulah **implementation plan fix-nya**: enam surgical changes, masing-masing menyasar failure yang sudah kita identifikasi, dengan **tidak satu pun skill baru dan tidak ada architecture rewrite**. Setelah ini baru hasil Avery dibandingkan lagi terhadap Hermes reference; hanya gap yang masih terbukti yang masuk remediation berikutnya. 
