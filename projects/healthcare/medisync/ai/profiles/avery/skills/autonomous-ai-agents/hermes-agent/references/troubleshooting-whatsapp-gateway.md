### Troubleshooting Hermes Agent WhatsApp Gateway Setup on Windows

This document outlines the steps to troubleshoot and reconfigure the WhatsApp gateway for Hermes Agent, specifically focusing on challenges encountered on a Windows host using a bash terminal.

**Problem Encountered:**

1.  `hermes` command not found in `PATH`.
2.  Difficulty locating the `hermes` executable (which turned out to be `hermes.cmd`).
3.  Interactive `hermes gateway setup` process required `pty=True` and explicit `process(action='submit')` for each prompt.

**Working Solution Steps:**

1.  **Locate the `hermes.cmd` executable:**
    *   Instead of `which hermes` or `find hermes.exe`, use `find <HERMES_DESKTOP_RUNTIME_PATH> -name hermes.cmd`.
    *   For this session, the path was: `C:/Users/drfer/.hermes-web-ui/desktop-runtime/hermes/0.20.4/win-x64/python/venv/Scripts/hermes.cmd`.
    *   *Note:* The `hermes` command on Windows via bash is often a `.cmd` script located within the `python/venv/Scripts` directory of the Hermes desktop runtime.

2.  **Start `hermes gateway setup` in PTY background mode:**
    *   Execute the command using the full path to `hermes.cmd` with `background=True` and `pty=True` to handle interactive prompts.
    *   Example:
        ```python
        print(default_api.terminal(background=True, command="C:/Users/drfer/.hermes-web-ui/desktop-runtime/hermes/0.20.4/win-x64/python/venv/Scripts/hermes.cmd gateway setup", pty=True))
        ```
    *   Capture the `session_id` from the response.

3.  **Interact with the `gateway setup` prompts:**
    *   Use `default_api.process(action="submit", data="<YOUR_INPUT>", session_id="<SESSION_ID>")` for each interactive prompt.
    *   **To select WhatsApp:**
        *   Look for `💬 WhatsApp (configured)` in the output preview.
        *   Submit the corresponding number (e.g., `27`).
    *   **To reconfigure/enable WhatsApp:**
        *   Respond `y` to `Reconfigure WhatsApp? (y/N):`
        *   Respond `Y` to `Enable WhatsApp? (Y/n):`
    *   **For Allowed User IDs:**
        *   Leave blank (just press Enter) if no specific allowlist is needed for internal testing: `''` or `\n`.

4.  **Monitor progress and final output:**
    *   Use `default_api.process(action="poll", session_id="<SESSION_ID>")` to regularly check the output and identify the next prompt.

**Pitfall: `hermes config edit` dan Interaksi GUI**

Perintah `hermes config edit` akan membuka file `config.yaml` di editor teks default pengguna (misalnya, Notepad di Windows). **Hermes Agent tidak dapat berinteraksi dengan jendela GUI ini, dan proses `hermes config edit` akan terblokir tanpa batas waktu hingga pengguna menutup editor secara manual.**

**Praktik Terbaik Agent untuk Perubahan Konfigurasi:**
Untuk perubahan programatik pada `config.yaml` (terutama untuk pengaturan sensitif keamanan seperti mengaktifkan/menonaktifkan platform), gunakan `hermes config set` alih-alih `hermes config edit`. Ini menghindari interaksi GUI dan lebih tangguh untuk operasi agent.

**Penonaktifan WhatsApp Programatik (misalnya, untuk reset bersih):**

Untuk memastikan reset bersih konfigurasi WhatsApp (misalnya, sebelum *pairing* ulang), penting untuk menonaktifkannya secara programatik dan, jika ada, menghapus file `creds.json`.

1.  **Nonaktifkan WhatsApp di `config.yaml`:**
    ```bash
    C:/Users/drfer/.hermes-web-ui/desktop-runtime/hermes/0.20.4/win-x64/python/venv/Scripts/hermes.cmd config set gateway.platforms.whatsapp.enabled false
    ```
    (Catatan: Ganti path lengkap ke `hermes.cmd` sesuai kebutuhan untuk lingkungan saat ini). Ini secara langsung memodifikasi `config.yaml` tanpa memerlukan interaksi GUI.

2.  **Hapus `creds.json` (jika ada):**
    ```bash
    rm /c/Users/drfer/.hermes/profiles/avery/platforms/whatsapp/session/creds.json
    ```
    (Catatan: Perintah ini akan mengembalikan kesalahan jika file tidak ada, yang dapat diterima karena mengkonfirmasi tidak ada kredensial lama yang tersisa.)

**Outcome:** This process allows for programmatic control over the interactive `hermes gateway setup` to reconfigure WhatsApp, including effectively 'logging out' old sessions and initiating the QR pairing process.

**Perhatian Penting: QR Code ASCII Tidak Dapat Dipindai**

Perintah `hermes whatsapp` CLI, baik dijalankan langsung maupun melalui `hermes gateway setup`, seringkali menampilkan QR code sebagai **teks ASCII**. Representasi ASCII ini **tidak dapat dipindai langsung oleh kamera ponsel**.

**Rekomendasi untuk Mendapatkan QR Code yang Dapat Dipindai (Praktik Terbaik 2026):**

Untuk *pairing* WhatsApp yang andal dengan QR code gambar yang dapat dipindai, gunakan Hermes Dashboard. Dashboard ini menyediakan antarmuka berbasis web yang menampilkan QR code sebagai gambar, yang dapat dengan mudah dipindai oleh ponsel *Chief*.

**Langkah-langkah untuk *Pairing* WhatsApp melalui Hermes Dashboard:**

1.  **Pastikan Hermes Gateway berjalan:** Jika belum berjalan, mulai dengan:
    ```bash
    C:/Users/drfer/.hermes-web-ui/desktop-runtime/hermes/0.20.4/win-x64/python/venv/Scripts/hermes.cmd gateway start
    ```
    (Catatan: Ini akan memulainya di *background*).

2.  **Mulai Hermes Dashboard:**
    ```python
    print(default_api.terminal(background=True, command="C:/Users/drfer/.hermes-web-ui/desktop-runtime/hermes/0.20.4/win-x64/python/venv/Scripts/hermes.cmd dashboard", notify_on_complete=False, pty=True))
    ```
    Ambil `session_id` dan *poll* hingga URL muncul.

3.  **Akses Dashboard:** Setelah dashboard dimulai, akan muncul URL (misalnya, `http://127.0.0.1:9119`). Buka URL ini di *web browser* *Chief*.

4.  **Navigasi ke *Pairing* WhatsApp:** Di antarmuka web Hermes Dashboard, navigasikan ke bagian integrasi WhatsApp atau pengaturan *gateway*. Di sana, *Chief* akan menemukan QR code gambar yang dapat dipindai.

5.  **Pindai QR Code:** Gunakan aplikasi WhatsApp di ponsel *Chief* (`Settings` → `Linked Devices` → `Link a Device`) untuk memindai QR code yang ditampilkan di dashboard.