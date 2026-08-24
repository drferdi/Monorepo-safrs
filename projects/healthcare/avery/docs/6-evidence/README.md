# Bukti eksekusi FIX-01…06 (2026-08-23)

Semua berkas di sini tersanitasi: tidak ada JID, nomor, kunci, atau isi pesan.

| Berkas | FIX | Isi |
|---|---|---|
| `fix01-effective-config-run{1,2,3}.txt` | 01 | Effective config setelah 3 restart berturut; SHA-256 ketiganya identik |
| `fix01-effective-config-final.txt` | 01/05/06 | Setelah config final (execution_guidance, guardrails, terminal.cwd) |
| `fix04-smoke.json` | 04 | 8 instrumen via `hermes -z`; `Cron` FAIL = artefak harness (`tools/cronjob_tools.py:1812-1831` menonaktifkan tool di luar sesi interaktif/gateway); Delegation tidak dikonfigurasi |
| `fix03-05-06-behavior.json` | 03/05/06 | 9 sesi oneshot: urutan tool, pertanyaan izin (1 dari 9, sebelum shim `hermes`), percobaan path hilang (E: 1) |

Butir yang menunggu pesan WhatsApp dari Chief (bukti nanti ditambahkan di sini): FIX-02 2.7, T1, T2, T8, T9, T10.
