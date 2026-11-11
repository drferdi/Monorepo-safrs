# ADR-0003: Penempatan Lapisan Desk-Experience (melengkapi ADR-0001)

## Status

**Proposed — 2026-07-19** (menunggu ratifikasi Chief).
Melengkapi, tidak menggantikan, ADR-0001. Tidak mengubah aturan arah dependensi
maupun `public_api` di ADR-0001 §2.

## Context

ADR-0001 §1 memetakan kepemilikan lima custom app, tetapi **tidak pernah
menetapkan rumah** untuk satu lapisan yang ternyata tumbuh besar di Tahap 1:
**lapisan desk-experience** — UX persona Beranda, blok konten workspace per-user,
kehadiran/check-in, jobdesk, profil karyawan, dan setup HR ringan.

Baseline 2026-07-19 (`ABYSS_CURRENT_STATUS_REPORT.md`) menemukan lapisan ini
hampir seluruhnya berada di `sentra_mantra_indonesia`, padahal ADR-0001 §1
mencharter app itu untuk **BPJS / PPh 21 / THR / KFA / UU PDP / CoA Indonesia** —
bukan UX desk. Modul terkait di `indonesia`: `home_today`, `home_profile`,
`insights`, `ws_common`, `ws_klinik`, `ws_sdm`, `ws_keuangan`, `checkin_easy`,
`presence_icons`, `jobdesk`, `profil_karyawan`, `hr_setup`, `praktik_dokter`,
`avatar`, `www/me`.

### Bukti yang menyempitkan masalah (penting)

1. **Seam framework↔konten sudah bersih dan disengaja.** `core/workspace_nav.py`
   membangun kerangka 5 workspace dan secara eksplisit **mempertahankan blok
   `custom_block`** yang dipasang app lain (komentarnya menyebut "… Hari Ini RSIA
   dari sentra_mantra_indonesia"). `indonesia` menyuntik blok konten persona
   lewat mekanisme Workspace `custom_block` — **data, bukan import Python**.
2. **Nol cross-app import di seluruh repo** (grep + boundary check). Tidak ada
   kopling impor antar app sama sekali.
3. **Konsekuensi:** memindahkan modul mana pun antar app kelak = **operasi
   mekanis murah** (perbarui path `@frappe.whitelist` + registrasi blok
   workspace). Tidak ada refactor kopling yang harus diurai.

Jadi ini **gap ADR (lapisan tak ber-rumah), bukan pelanggaran boundary** —
cek boundary yang di-enforce (arah import + `public_api`) tetap lolos.

## Decision (usulan)

### 1. Lapisan desk-experience = milik `sentra_mantra_core` (going forward)

Desk-experience (UX persona/Beranda, blok konten workspace lintas-app, kehadiran/
check-in, jobdesk, profil, setup HR ringan) bersifat **cross-cutting** dan sesuai
charter `core` ADR-0001 §1 ("Cross-cutting mixins/utilities"). **Rumah kanoniknya
adalah `core`.**

### 2. Aturan forward (berlaku segera bila diratifikasi)

- **Kode desk-experience cross-cutting BARU → tulis di `core`**, bukan `indonesia`.
- `sentra_mantra_indonesia` kembali disediakan untuk scope ADR-0001-nya
  (BPJS/pajak/KFA/PDP/CoA) untuk kode baru.

### 3. Modul eksisting di `indonesia` = JANGAN dipindah sekarang

Alasan: seam sudah bersih (nol kopling), app ini paling aktif (12 file test),
dan kita dalam **kejar tayang go-live**. Karena pemindahan sama murahnya kapan
pun dilakukan (§Context.3), tidak ada untungnya melakukannya saat rush live.
**Revisit di Tahap 8** (saat `sentra_mantra_portal` mulai — momen alami menata
ulang lapisan frontend/desk-experience), atau lebih awal bila Chief mau.

### 4. Instance paling tajam: `praktik_dokter → sentra_mantra_hospital`

Dari semua modul, **`praktik_dokter`** (jadwal praktik dokter) adalah satu-satunya
yang menyerempet garis larangan eksplisit ADR-0001: `indonesia` "must NOT contain
hospital-specific clinical workflows". Ini kandidat pindah **pertama** (ke
`hospital`) saat gelombang konsolidasi §3 dibuka. Ditandai di sini, tidak
dieksekusi sekarang.

### 5. `public_api` (menutup tugas C2)

Belum ada satupun surface `public_api` dan **belum diperlukan** — nol cross-app
import. Aturan `public_api` ADR-0001 §2 tetap berlaku apa adanya:
**surface `public_api` di-scaffold saat cross-app import pertama diusulkan**,
bukan spekulatif sekarang. Tidak ada tindakan C2 yang perlu diambil hari ini.

## Consequences

- **Positif:** menutup gap "lapisan tak ber-rumah" tanpa menyentuh app paling
  aktif saat go-live; memberi aturan jelas ke mana kode desk-experience baru
  mendarat; membuka pengisian `hospital`/`integrations`/`portal` (yang
  kepemilikannya sudah jelas di ADR-0001) tanpa menunggu pemindahan apa pun.
- **Trade-off / utang tercatat:** `indonesia` untuk sementara memuat kode di luar
  charternya. Utang ini eksplisit, murah dibayar (mekanis), dan dijadwalkan
  (§3–4) — bukan disembunyikan.

## Non-blocking note

Baseline sempat menandai C1 sebagai "BLOCKING pengisian app skeleton".
**Itu diturunkan di sini:** mengisi `hospital`/`integrations`/`portal` tidak
bergantung pada tempat `checkin_easy`/`home_today` berada — ketiga app itu punya
kepemilikan jelas di ADR-0001. Satu-satunya kopling nyata adalah "ke mana kode
desk-experience BARU pergi", yang dijawab aturan forward §2.

## Alternatives Considered

- **Pindahkan modul sekarang ke `core`** — ditolak: risiko refactor di app
  paling aktif saat kejar tayang, tanpa manfaat (pemindahan sama murahnya nanti).
- **Perluas charter `indonesia` jadi "lokalisasi + desk-UX"** — ditolak:
  mengaburkan single-responsibility ADR-0001 secara permanen demi menghindari
  pemindahan mekanis yang murah.
