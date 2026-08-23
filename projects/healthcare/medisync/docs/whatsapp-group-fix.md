# Perbaikan grup WhatsApp — profil `avery`

> Dokumen ini memuat JID grup dan nomor telepon sungguhan milik Chief. Isinya
> data operasional, bukan kredensial, dan repositori ini privat. Jangan salin
> nilainya ke `config.example.yaml` atau berkas contoh mana pun.

**2026-08-23 · Selesai dan terbukti.** Avery membalas di kedua grup WhatsApp sejak pukul 03:31.

---

## Masalah

Avery tidak pernah membalas di grup. Penyebabnya satu baris konfigurasi yang masih placeholder template:

```yaml
group_policy: none
group_allow_from: REPLACE_WITH_FOUNDER_CORE_GROUP_JID@g.us
```

`_is_group_allowed()` hanya mengenal `disabled` / `allowlist` / `pairing` / `open`. Nilai `none` jatuh ke `return False`, dan pesan dibuang tanpa log sama sekali — karena itu tidak ada jejak apa pun di `gateway.log`.

Bridge Baileys tidak bersalah; pesan grup lolos di sana karena `WHATSAPP_DM_POLICY=pairing`.

## Grup yang terlibat

| JID | Nama |
|---|---|
| `120363428439876112@g.us` | Founders Core |
| `120363410191104704@g.us` | Decisions |
| `120363428714713249@g.us` | Business Growth |
| `120363429027122055@g.us` | Coding & Build |

Anggota keempatnya sama: `21466380808233@lid` (Chief, telepon `6281330018882`) dan `90886625054917@lid` (bot Avery, telepon `6282339708330`).

### Aturan grup

`group_policy: "allowlist"` — setiap grup harus terdaftar di `group_allow_from`. Grup yang belum terdaftar diam total, tanpa satu baris log pun.

Kelima grup di tabel di atas juga terdaftar di `free_response_chats`, jadi di sana percakapan mengalir tanpa perlu menyebut nama. Di grup yang belum terdaftar, tidak ada cara memanggil Avery sama sekali — bahkan bagi Chief.

Kebijakan ini sempat disetel `open` pada 04:09 agar grup baru tidak perlu didaftarkan, lalu dibatalkan pada 10:39 setelah `hermes update`: versi baru menolak start bila `group_policy` bernilai `open` tanpa `WHATSAPP_ALLOW_ALL_USERS`, dan flag itu mengotorisasi siapa pun di grup maupun DM. Rinciannya di bagian "Kejutan dari update" di bawah.

Karena grup baru harus didaftarkan manual, titik butanya ditutup dengan alat:

```powershell
pwsh -File scripts/check-unregistered-groups.ps1
```

Skrip menyebut grup yang dikenal sesi WhatsApp tetapi belum ada di `config.yaml`, lengkap dengan namanya. Jalankan setiap kali Avery tampak diam di suatu grup. Mendaftarkan grup berarti menambah JID-nya ke **tiga** daftar: `group_allow_from`, `group_allowed_chats`, dan `free_response_chats`.

---

## Konfigurasi final

`C:\Users\drfer\.hermes\profiles\avery\config.yaml`

```yaml
model:
  default: "google/gemini-2.5-flash"
  provider: "openrouter"

whatsapp:
  unauthorized_dm_behavior: "ignore"
  gateway_restart_notification: false
  require_mention: true
  mention_patterns:
    - '(?i)\bavery\b'
    - '(?i)\bave\s*!'
  group_policy: "allowlist"
  group_allow_from:
    - "120363428439876112@g.us"
    - "120363410191104704@g.us"
    - "120363428714713249@g.us"
    - "120363429027122055@g.us"
  send_read_receipts: false

auxiliary:
  free_only: true

gateway:
  platforms:
    whatsapp:
      enabled: true
      extra:
        group_allowed_chats:
          - "120363428439876112@g.us"
          - "120363410191104704@g.us"
          - "120363428714713249@g.us"
          - "120363429027122055@g.us"
        free_response_chats:
          - "120363428439876112@g.us"
          - "120363410191104704@g.us"
          - "120363428714713249@g.us"
          - "120363429027122055@g.us"
        text_batch_delay_seconds: 5
        text_batch_split_delay_seconds: 10
```

Peran tiap kunci:

| Kunci | Lapisan | Fungsi |
|---|---|---|
| `group_policy` + `group_allow_from` | intake adapter | menentukan grup mana yang diproses |
| `group_allowed_chats` | otorisasi gateway | mengotorisasi semua anggota grup terdaftar |
| `free_response_chats` | gerbang mention | membolehkan percakapan lanjutan tanpa menyebut nama |
| `require_mention` + `mention_patterns` | gerbang mention | berlaku untuk grup di luar daftar `free_response_chats` |

---

## Tiga jebakan yang ditemukan

**1. Blok root `whatsapp:` menang atas `gateway.platforms.whatsapp.extra`.** `gateway/config.py:1713` menjalankan `extra.update(bridged)` — nilai di root menimpa `extra` untuk semua kunci bridgeable. Menaruh nilai di `extra` sementara root memuat kunci yang sama menghasilkan kegagalan senyap.

Dua pengecualian: `group_allowed_chats` hanya di-bridge untuk Telegram, dan `free_response_chats` bukan kunci bridgeable sama sekali. Karena itu keduanya harus ditulis di `extra`, sisanya di root.

**2. Regex rusak di YAML kutip ganda.** Penulis mesin menyimpan `(?i)\bavery\b` sebagai empat backslash harfiah, yang jadi regex mencari backslash literal. Pola itu tidak pernah cocok. Tulis regex dalam YAML **kutip tunggal**.

**3. Ada penulis konkuren pada `config.yaml`.** Hipotesis: Avery sendiri, disuruh Chief memperbaiki konfigurasinya sendiri lewat DM. Nilainya khas tebakan agen — `free_response_chats` sempat diisi nomor DM, padahal kunci itu untuk JID grup. Periksa ulang konfigurasi tepat sebelum setiap restart, dan jangan minta Avery memperbaiki konfigurasi WhatsApp-nya sendiri.

---

## Kronologi

| Waktu | Kejadian |
|---|---|
| 03:14 | Gateway dijalankan dengan konfigurasi grup baru. `Loaded 2 mention pattern(s)` |
| 03:18 | Uji agen gagal — semua SKU `:free` kena 429. Model diganti ke `google/gemini-2.5-flash` atas keputusan Chief |
| 03:21 | Restart. `hermes -z` menjawab normal |
| 03:31 | **Founders Core dibalas.** 5.1s, 706 chars |
| 03:32 | **Decisions dibalas.** 14.4s, 380 chars |
| 03:33 | Avery diam — pesan lanjutan tanpa "Avery" dibuang gerbang mention |
| 03:35 | `free_response_chats` ditambahkan, restart. `Channel directory built: 3 target(s)` |

Soal model: `z-ai/glm-5.2:free` kena 429 dari shared pool OpenRouter, dan seluruh rantai gratis ikut gagal (`gemma-4-31b-it:free` 429, `inkling:free` 403). Uji pembanding dengan model berbayar berhasil — kunci API sehat, yang bermasalah khusus SKU `:free`.

---

## Yang perlu diperhatikan

- **Avery membalas setiap pesan** di kedua grup itu. Untuk grup berisi Chief dan Avery saja itu memang yang diinginkan. Bila nanti ada anggota lain, cabut JID grupnya dari `free_response_chats`.
- **Bila menambah grup baru,** isi **kedua** daftar: `group_allow_from` (intake) dan `group_allowed_chats` (otorisasi). Mengisi salah satu saja membuat pesan grup lolos di satu lapisan lalu dibuang di lapisan berikutnya.
- **Balasan grup tertunda sekitar 5 detik** karena `text_batch_delay_seconds: 5` — batching untuk menghindari pemanggilan agen terpisah tiap pesan. Bukan kegagalan.
- **`auxiliary.free_only: true`** membatasi fallback tugas auxiliary ke model gratis yang semuanya 429. Model utama aman karena berbayar, tetapi ringkasan dan judul sesi bisa gagal diam-diam. Setel `false` bila mengganggu.
- **Bila ingin kembali ke model gratis:** isi `fallback_providers` di `config.yaml` (top-level, format `[{provider, model}]`) dengan model berbayar sebagai cadangan. Rantai fallback saat ini kosong.

## Siapa yang bisa memanggil Avery

Diverifikasi 04:12 dengan menjalankan gerbang intake dan otorisasi berurutan untuk beberapa identitas pengirim.

| Lokasi | Chief | Anggota lain |
|---|---|---|
| Lima grup terdaftar | semua pesan dibalas | **semua pesan dibalas** — tidak perlu memanggil |
| Grup yang belum terdaftar | **tidak dibalas** — dibuang di gerbang intake | tidak dibalas |
| DM | dibalas | diabaikan (`unauthorized_dm_behavior: ignore`) |

Baris kedua berubah pada 10:39. Selama `group_policy` bernilai `open`, pesan Chief di grup mana pun masih bisa memanggil Avery. Setelah kembali ke `allowlist`, grup yang belum terdaftar tertutup untuk semua orang — itulah alasan skrip pemeriksa dibuat.

Yang perlu disadari: `group_allowed_chats` memberi akses berdasarkan **grup**, bukan orang. Begitu ada anggota baru ditambahkan ke salah satu dari empat grup itu, orang tersebut langsung punya akses penuh — tanpa pendaftaran, tanpa perlu memanggil, dan setiap pesannya memakai kuota API.

Dua cara mengencangkan bila kelak diperlukan:

1. **Cabut `group_allowed_chats`** — anggota lain di grup kerja ikut tunduk pada `WHATSAPP_ALLOWED_USERS`. Hanya Chief yang bisa memakai Avery di mana pun.
2. **Daftarkan nomor rekan ke `WHATSAPP_ALLOWED_USERS`** — kontrol per orang, berlaku di grup mana pun dan lewat DM.

## Audit 03:43

Pemeriksaan menyeluruh setelah perbaikan.

**Diperbaiki**

- **Bridge yatim.** Bridge Baileys masih hidup dengan proses induk yang sudah mati; gateway berikutnya hanya menempel padanya lewat port 3000. Akibatnya bridge tidak pernah menerima environment baru, dan bila gateway mati bridge tetap menerima pesan tanpa konsumen — pesan grup hilang tanpa jejak. Bridge dihentikan dan gateway di-restart.

  Ini gejala yang sudah dikenal dan penawarnya sudah ada di repositori: `scripts/restart-gateway.bat` (Windows) dan `scripts/restart-gateway.sh` (Linux) menghentikan gateway lebih dulu, membunuh bridge yang tersisa, baru menyalakan lagi. **Pakai skrip itu, bukan `gateway run --replace`** — `--replace` mem-SIGKILL gateway lama dan justru meninggalkan bridge yatim setiap kali. Bridge yatim yang menahan port 3000 juga membuat gateway berikutnya menyimpulkan WhatsApp belum terpasang lalu keluar dengan kode 78.

  Prasyarat skrip: `hermes-studio.cmd` harus ada di direktori yang sama dengan skrip. Di mesin Chief berkas itu ada di `C:\Users\drfer\bin\hermes-studio.cmd`, jadi jalankan skrip dari sana atau sesuaikan variabel `HERMES` di dalamnya.
- **`WHATSAPP_DEBUG` dihapus** dari `.env`. Flag itu sebenarnya tidak pernah aktif — bridge yatim sudah berjalan sebelum flag ditambahkan. Sekarang tidak diperlukan lagi.

**Terverifikasi aman**

| Yang diperiksa | Hasil |
|---|---|
| Gerbang intake, 11 kasus | Semua benar. Grup terdaftar lolos tanpa sebut nama; grup lain ditolak walau menyebut "avery"; status, newsletter, dan broadcast ditolak |
| Otorisasi, 7 kasus | Semua benar. Anggota grup terdaftar terotorisasi; DM orang asing ditolak |
| `unauthorized_dm_behavior` | Efektif `ignore` — DM orang asing tidak dibalas kode pairing |
| Struktur proses | Satu gateway, satu bridge, satu `gateway.lock` |
| Isi `config.yaml` | Utuh, tidak tertimpa penulis konkuren |

**Sisa yang diketahui, tidak diperbaiki**

- Nama grup di `channel_directory.json` masih berupa ID mentah, bukan "Founders Core" / "Decisions". Kosmetik; tidak memengaruhi perutean.
- `kanban.db` masih mode WAL dengan SQLite yang rentan (lihat bagian Ditunda).


## Migrasi runtime ke dalam repositori — 2026-08-23

Atas instruksi Chief, seluruh instalasi Hermes kini berada fisik di dalam folder proyek. Root `AGENTS.md` menempatkan instruksi manusia di urutan pertama, sehingga instruksi ini menimpa larangan lokasi di `AGENTS.md` proyek. Yang ditimpa adalah lokasi fisiknya, bukan larangan meng-commit: `runtime/` masuk `.gitignore`, dan `git status` tetap hanya menampilkan berkas konfigurasi.

### Bentuk akhir

Data pindah ke `runtime/`, lokasi lama diganti *directory junction* yang menunjuk ke sana. Konsekuensinya semua path absolut lama tetap bekerja — empat entri `mcp_servers`, resolusi `HERMES_HOME`, symlink `AppData`, dan updater NSIS. Tidak ada satu path pun yang perlu ditulis ulang.

| Lokasi lama (kini junction) | Tujuan di dalam proyek |
|---|---|
| `C:\Users\drfer\.hermes` | `runtime/hermes-home` |
| `C:\Users\drfer\.hermes-web-ui` | `runtime/hermes-web-ui` |
| `D:\Devops\abyss-monorepo\...\Hermes Studio` | `runtime/hermes-studio` |
| `%APPDATA%\hermes-studio` | `runtime/appdata-roaming` |
| `%LOCALAPPDATA%\hermes-studio-updater` | `runtime/updater` |

Rantai `%LOCALAPPDATA%\hermes` → `.hermes` → `runtime/hermes-home` tetap resolve.

Total 3,8 GB. Salinan lama dipertahankan sebagai `*.old` di lokasi asal dan **belum dihapus** — itu satu-satunya jalur mundur. Hapus hanya setelah Avery terbukti stabil beberapa hari.

### Yang dikerjakan bersamaan

- **`hermes update`** — SQLite naik dari 3.50.4 ke **3.53.1**. Bug korupsi WAL hilang, `doctor` hijau, `state.db` kembali ke mode WAL dengan aman.
- **Runtime lama dihapus** — 0.19.0 dan 0.20.0, membebaskan 2,9 GB. Hanya 0.20.4 yang dirujuk konfigurasi mana pun.
- **`auxiliary.free_only` → `false`** — fallback tugas auxiliary tidak lagi terkunci ke SKU gratis yang semuanya 429.

### Kejutan dari update: `group_policy: open` tertutup

Versi baru menolak start dengan:

```
Refusing to start: whatsapp has dm_policy/group_policy set to 'open'
but neither GATEWAY_ALLOW_ALL_USERS nor WHATSAPP_ALLOW_ALL_USERS is enabled.
```

Mengaktifkan `WHATSAPP_ALLOW_ALL_USERS` bukan jalan keluar: `authz_mixin.py` mengembalikan `True` untuk **siapa pun** begitu flag itu menyala — di grup maupun DM. Itu menghapus pengaman yang justru menjadi alasan memilih `open`.

Karena itu `group_policy` dikembalikan ke `allowlist`, dan titik butanya ditutup dengan alat, bukan kebijakan: **`scripts/check-unregistered-groups.ps1`** membandingkan grup yang dikenal sesi Baileys dengan isi `config.yaml`, lalu menyebut nama grup yang belum terdaftar. Uji pertamanya langsung menemukan grup kelima yang belum terdaftar — "Humans = humans" — yang sebelumnya diam tanpa jejak log.

Jalankan skrip itu setiap kali agen tampak diam di suatu grup.


## Verifikasi Hermes Studio dan perbaikan skrip restart — 2026-08-23 10:47

Studio dibuka Chief pukul 10:47 dan menaikkan gateway sendiri dari path ber-junction. Log memuat `Bridge found at D:\DEV\Monorepo\...\medisync\runtime\hermes-web-ui\...`, dan web UI naik di port 8748. Migrasi runtime lulus dari sisi aplikasi, bukan hanya dari CLI.

Rantai proses akhir yang sehat:

```
node(bridge) <- python(gateway) <- python(wrapper) <- Hermes Studio.exe <- explorer.exe
```

### Dua temuan

**Gateway tidak memulihkan bridge yang mati.** Bridge dimatikan untuk menguji apakah gateway melahirkan yang baru — ternyata tidak. WhatsApp diam empat menit sampai gateway di-restart. Konsekuensi operasionalnya: bila bridge tumbang sendiri, agen diam tanpa peringatan apa pun, dan satu-satunya pemulihan adalah me-restart gateway.

**`scripts/restart-gateway.bat` tidak bisa dijalankan.** Skrip memanggil `hermes-studio.cmd cli --profile avery gateway stop`; wrapper Node menolaknya dengan `bad option: --profile`. Penawar bridge yatim itu sendiri rusak sejak ditulis.

Penyebabnya beda jalur CLI:

| Pemanggilan | Menerima `--profile`? |
|---|---|
| `hermes-studio.cmd cli ...` | tidak — argumen lewat wrapper Node |
| `python -m hermes_cli.main --profile <p> gateway ...` | ya, tetapi hanya **sebelum** subcommand |

Berkas `.sh` untuk Linux sudah memakai bentuk yang benar dan tidak diubah.

### Bentuk `.bat` yang sekarang

Ditulis ulang memakai jalur Python langsung, sama seperti login-item launcher `gateway-service/Hermes_Gateway_<profil>.vbs` yang dipasang Hermes di folder Startup Windows. Skrip mendeteksi sendiri runtime versi tertinggi, menghentikan gateway, membunuh bridge yang tersisa, menyalakan lewat launcher resmi, lalu menunggu `/health` mencapai `connected` sebelum melaporkan status.

Uji nyata: stop bersih (`drained cleanly`), satu bridge yatim dibunuh, gateway naik lewat launcher, bridge `connected` dalam 4 detik, dan rantai prosesnya kembali utuh sampai `Hermes Studio.exe`.

Pakai skrip ini untuk setiap restart. `gateway run --replace` selalu meninggalkan bridge yatim karena gateway lama di-SIGKILL sementara anaknya selamat.



## Update ke Hermes Studio 0.6.46 — 2026-08-23 11:04

Installer diunduh manual, diverifikasi, dan dipasang senyap. Endpoint unduhannya bukan penyimpan berkas statis melainkan proksi rilis; bentuk URL-nya `/v<versi>/<berkas>`, dan `https://download.ekkolearnai.com/<berkas>` menjawab `400 Missing release tag or asset name`.

SHA512 berkas cocok dengan `latest.yml` (183.079.483 byte). Installer per-user, tidak meminta hak administrator, selesai dalam 27 detik dengan kode keluar 0.

### Temuan penting: installer NSIS mengabaikan junction

Setelah instalasi, `D:\Devops\...\Hermes Studio` **bukan lagi junction** melainkan direktori nyata berisi 0.6.46, sementara `runtime/hermes-studio` menjadi **kosong**. Urutan yang dilakukan installer:

1. mengosongkan isi target lewat junction — 3.410 berkas di dalam proyek terhapus,
2. menghapus junction-nya,
3. menulis instalasi baru sebagai direktori nyata di lokasi lama.

Artinya **setiap update Hermes Studio akan mengembalikan folder aplikasi ke luar proyek**. Empat junction lainnya (`.hermes`, `.hermes-web-ui`, `appdata-roaming`, `updater`) tidak tersentuh — hanya folder aplikasi yang ditulis installer.

Pemulihannya: salin hasil instalasi kembali ke `runtime/hermes-studio`, ganti direktori nyata dengan junction. Prosedur itu kini otomatis:

```powershell
pwsh -File scripts/verify-runtime-junctions.ps1        # periksa saja
pwsh -File scripts/verify-runtime-junctions.ps1 -Fix   # pulihkan
```

Skrip menolak berjalan bila masih ada proses Hermes yang hidup, dan menyimpan direktori lama sebagai `<nama>.pre-junction-<stempel>` alih-alih menghapusnya.

**Jalankan skrip itu setiap selesai memperbarui Hermes Studio.**

### Hasil akhir

Junction pulih, `Hermes Studio.exe` terbaca versi 0.6.46 lewat junction, kelima junction sehat. Gateway dinyalakan dengan `restart-gateway.bat`: bridge `connected` dalam 6 detik, `Channel directory built: 6 target(s)`.

`config.yaml` tidak tersentuh update — MD5 identik sebelum dan sesudah, kelima grup dan seluruh kebijakan WhatsApp utuh.

Dua direktori sisa yang belum dihapus, keduanya jalur mundur:

| Direktori | Isi |
|---|---|
| `Hermes Studio.old` | 0.6.45, 641 MB — jalur mundur bila 0.6.46 bermasalah |
| `Hermes Studio.0646-installed` | salinan 0.6.46 hasil installer, 634 MB — duplikat murni dari `runtime/hermes-studio` |


## Rollback

```
copy "C:\Users\drfer\.hermes\profiles\avery\config.yaml.pre-groupfix-20260823-020526.bak" "C:\Users\drfer\.hermes\profiles\avery\config.yaml"
copy "C:\Users\drfer\.hermes\profiles\avery\.env.pre-fix-20260823.bak" "C:\Users\drfer\.hermes\profiles\avery\.env"
```

lalu restart gateway. Cadangan bertahap juga tersedia: `.pre-fase24.bak`, `.pre-fase2-20260823.bak`, `.pre-model-20260823.bak`, `.pre-freeresponse-20260823.bak`.

## Ditunda

| Item | Alasan |
|---|---|
| `hermes update` untuk SQLite 3.50.4 | `kanban.db` satu-satunya yang masih mode WAL. Butuh jendela henti dan cadangan basis data |
| Hapus runtime 0.19.0 dan 0.20.0 | Menghapus data, butuh konfirmasi |
| Alias profil yatim `juliete.bat`, `melinda.bat`, `voss.bat` | Menunjuk profil yang sudah tidak ada |
| Kerentanan npm workspace `web` (4) dan `ui-tui` (3) | Menyentuh dependensi runtime bawaan |
