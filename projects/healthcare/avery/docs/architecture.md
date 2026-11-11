# Arsitektur

## Bentuk sistem

Avery tidak menjalankan kodenya sendiri. Ia mengonfigurasi **Hermes Studio**, yang terdiri atas tiga proses terpisah.

```
                        ┌─────────────────────────┐
   WhatsApp  ──────────▶│  whatsapp-bridge        │  Node, port 3000
                        │  (Baileys, tidak resmi) │
                        └───────────┬─────────────┘
                                    │
                        ┌───────────▼─────────────┐
                        │  gateway                │  Python
                        │  routing, sesi, memori, │
                        │  cron, skills, MCP      │
                        └───────────┬─────────────┘
                                    │
              ┌─────────────────────┴───────────────────┐
              │                                         │
   ┌──────────▼──────────┐                  ┌───────────▼──────────┐
   │ dashboard (Python)  │                  │ web UI (Node)        │
   │ port 9119           │                  │ Hermes Studio        │
   │ tanpa auth di       │                  │ selalu minta login   │
   │ loopback            │                  │                      │
   └─────────────────────┘                  └──────────────────────┘
```

## Dua antarmuka, dua aturan auth

Perbedaan ini kerap membingungkan, jadi dicatat di sini.

**Dashboard Python** membebaskan auth di loopback. Dari `hermes_cli/web_server.py`:

```python
def should_require_auth(host, allow_public=False) -> bool:
    return host not in _LOOPBACK_HOST_VALUES
```

Alamat 127.0.0.1, localhost, dan ::1 dianggap tepercaya. Alamat RFC1918 sengaja diperlakukan sebagai publik — perangkat asing di LAN yang sama justru model ancaman yang ditangani gerbang ini. Flag `--insecure` masih diterima tetapi diabaikan sejak kampanye `hermes-0day` Juni 2026.

**Web UI Node** punya tabel `users` dan JWT sendiri, tanpa pengecualian loopback dan tanpa variabel lingkungan untuk mematikannya. Ini yang memunculkan formulir login. Akun tersimpan di `~/.hermes-web-ui/hermes-web-ui.db`; percobaan gagal dicatat di `.login-lock.json` dengan batas sepuluh kali sebelum terkunci.

## Direktori Hermes

Satu direktori menampung seluruh keadaan runtime:

```
<HERMES_HOME>/
├── active_profile              berisi nama profil aktif
└── profiles/avery/
    ├── SOUL.md                 persona          → repositori
    ├── config.yaml             konfigurasi      → repositori (contohnya)
    ├── .env                    rahasia          → tidak pernah
    ├── auth.json               kredensial       → tidak pernah
    ├── memories/               catatan pribadi  → tidak pernah
    ├── skills/                 kemampuan        → repositori
    ├── platforms/whatsapp/session/   sesi       → tidak pernah
    └── state.db, kanban.db     basis data       → tidak pernah
```

Di Windows `%LOCALAPPDATA%\hermes` adalah junction ke `%USERPROFILE%\.hermes`; keduanya menunjuk data yang sama.

## Batas memori

Memori agen dibatasi jumlah karakter, dipaksakan saat penulisan:

- `memory_char_limit` — memori umum, bawaan 2200.
- `user_char_limit` — profil pengguna, bawaan 1375, dinaikkan ke 2200 untuk Avery.

Operasi `replace` mencocokkan entri lewat substring persis. Bila teks acuan sudah berubah sejak usulan dibuat, penulisan gagal seluruhnya dengan galat "No entry matched". Ini bukan kerusakan, melainkan usulan yang basi.

## Rencana penempatan

Saat ini seluruhnya berjalan di laptop Windows. Sasarannya VPS KVM — bukan shared hosting, karena Hermes butuh proses yang hidup terus, port sendiri, dan penyimpanan persisten. Berkas `deploy/docker-compose.yml` sudah menyediakan dua layanan, `gateway` dan `dashboard`, keduanya memasang `~/.hermes` sebagai volume.
