# CDSS FKTP — Electron Desktop App

Aplikasi CDSS (Clinical Decision Support System) berbasis Sidelab untuk
FKTP/Puskesmas, dikemas sebagai aplikasi desktop lintas platform.

---

## Prasyarat

Sebelum build atau menjalankan app, pastikan sudah terinstall:

| Kebutuhan | Versi Minimum | Cara Install |
|---|---|---|
| **Node.js** | 18+ | https://nodejs.org |
| **Python 3** | 3.10+ | https://python.org |
| **pnpm** | 8+ | `npm i -g pnpm` |
| **Sidelab deps** | — | lihat bagian di bawah |

### Install Python dependencies

```bash
cd sidelab-engine
pip install -r requirements.txt
```

### Tambahkan API key

Buat file `.env` di root proyek atau set environment variable:

```bash
# Wajib untuk OpenAI backend
export OPENAI_API_KEY="sk-..."

# Opsional untuk OpenRouter
export OPENROUTER_API_KEY="sk-or-..."
```

---

## Build

```bash
# Dari direktori electron-app/
npm run build      # build UI + API saja
npm run dist       # build + package untuk platform saat ini
npm run dist:win   # Windows NSIS installer (.exe)
npm run dist:mac   # macOS DMG (.dmg)
npm run dist:linux # Linux AppImage (.AppImage)
```

Output installer ada di `electron-app/dist-electron/`.

---

## Jalankan tanpa install (development)

```bash
# 1. Build dulu (wajib dilakukan sekali)
cd electron-app && npm run build

# 2. Jalankan electron langsung dari source
npm start
```

---

## Cara kerja

Saat aplikasi dibuka, Electron secara otomatis:

1. Menampilkan **splash screen** saat backend disiapkan
2. Menjalankan **Python FastAPI** (CDSS engine) di port 5001
3. Menjalankan **Express API server** di port 3001
4. Membuka **BrowserWindow** yang memuat UI dari Express (`http://127.0.0.1:3001`)

Saat ditutup, semua backend process dihentikan otomatis.

---

## Struktur setelah di-package

```
app/
  Resources/
    engine/      ← sidelab-engine Python (dari extraResources)
    api/         ← Express server bundle
    ui/          ← React build (static files)
  main.js
  preload.js
```

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| "Gagal Memulai — Port not ready" | Pastikan Python 3 ada di PATH, dan `pip install -r requirements.txt` sudah dijalankan |
| "python3: command not found" | Di Windows, `python` digunakan; di Mac/Linux, `python3`. Pastikan ada di PATH |
| OpenAI error 401 | Set `OPENAI_API_KEY` yang valid di environment variables |
| Port sudah terpakai | Tutup instance lain; atau ubah `PYTHON_PORT`/`API_PORT` di `main.js` |
