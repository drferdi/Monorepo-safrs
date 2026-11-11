<!-- codieverse+'s vision, brought to life. -->
# SIDELAB Installer Build Guide

Panduan ini untuk membangun `SIDELAB-SETUP.exe`.

## Tujuan

Installer final harus:
- membundel SideLab runtime
- membundel Python embedded
- memakai `sidelab.ico` untuk installer dan shortcut desktop
- tetap membawa `sounds/notif.mp3`
- menyiapkan DeepSeek sebagai backend default runtime
- tetap menyediakan opsi Local/Ollama sebagai fallback

## Asset yang Wajib Ada

Tempatkan file berikut:

- `installer/assets/codieverse.png`
- `installer/assets/sidelab.ico`

Catatan:
- `codieverse.png` dipakai sebagai sumber branding utama
- `sidelab.ico` dipakai oleh Inno Setup dan shortcut Windows

## Runtime yang Wajib Ada

### 1. Python embedded

Tempatkan:

- `installer/python-embed/python-embed.zip`
- `installer/python-embed/get-pip.py`

Rekomendasi:
- ambil Python embeddable package Windows x64 dari Python.org
- rename zip menjadi `python-embed.zip` agar build script stabil

Atau fetch otomatis:

```powershell
powershell -ExecutionPolicy Bypass -File installer/fetch-runtime-assets.ps1
```

### 2. Wheelhouse

Folder:

- `installer/wheelhouse/`

Diisi dengan dependency offline dari:

```powershell
py -3 -m pip download -r requirements.txt -d installer/wheelhouse
```

Dependency ini dipakai oleh `post_install.ps1` dan runtime DeepSeek/Local.

### 3. Ollama installer

Opsional tapi direkomendasikan:

- `installer/vendor/OllamaSetup.exe`

Kalau file ini tidak ada:
- installer tetap bisa dibangun
- tetapi post-install akan meminta Ollama diinstall manual bila belum ada di PC target

## Tools Build

- Inno Setup 6
- Python 3 untuk menjalankan `build-installer.ps1`

`ISCC.exe` harus tersedia di PATH atau di lokasi standar Inno Setup.

## Command Build

```powershell
powershell -ExecutionPolicy Bypass -File installer/build-installer.ps1
```

Jika hanya ingin menyiapkan scaffold tanpa compile:

```powershell
powershell -ExecutionPolicy Bypass -File installer/build-installer.ps1 -SkipCompile
```

## Output

File akhir:

- `dist/SIDELAB-SETUP.exe`

## Flow Installer

1. Copy payload SideLab
2. Extract Python embedded
3. Bootstrap pip
4. Install dependency dari wheelhouse
5. Copy `.env.example` menjadi `.env`
6. Smoke test DeepSeek jika `DEEPSEEK_API_KEY` tersedia
7. Cek / install Ollama hanya bila Local dibutuhkan
8. Buat shortcut desktop:
   - `SIDELAB`
   - `SIDELAB Diagnose`

## Catatan Penting

- `sounds/notif.mp3` ikut terbawa karena diambil dari payload app
- shortcut utama tetap menuju `SIDELAB.bat`
- installer dirancang untuk Windows user biasa, jadi default install memakai:
  - `{localappdata}\SIDELAB`
- build ini masih bergantung pada asset/icon final dari Anda
