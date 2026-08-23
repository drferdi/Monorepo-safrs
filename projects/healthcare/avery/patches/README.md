# Patch Hermes vendored

Kenapa patch ini ada: Hermes 0.20.4 vendored (`<HERMES>`) mencatat drop ingress
WhatsApp lewat `print()` tanpa reason code dan menelan pola mention regex
invalid dengan `logger.warning` saja (boot tetap lanjut dengan pola rusak).
Patch `hermes-0.20.5/0001-whatsapp-ingress-reason-codes.patch` menambah
`logger.info` beralasan (dengan JID diredact) untuk tiap drop/accept ingress
dan menggagalkan boot (`ValueError: BOOT FAIL: ...`) bila pola mention gagal
compile.

Patch ini **hilang saat Hermes di-update/reinstall**, karena pohon vendored
bukan repo git milik kita — setiap upgrade menimpa berkas asli. Jalankan
ulang `apply-hermes-patches.ps1` setelah update untuk memasangnya kembali
(script menolak apply bila SHA tidak cocok `sha256_before`/`sha256_after`
di `manifest.json`, artinya versi Hermes berbeda).

## Cara pakai

```powershell
# Terapkan (idempoten; aman dijalankan berulang)
pwsh -File scripts/apply-hermes-patches.ps1

# Pratinjau tanpa mutasi
pwsh -File scripts/apply-hermes-patches.ps1 -WhatIf

# Batalkan (kembali ke berkas asli)
pwsh -File scripts/apply-hermes-patches.ps1 -Revert

# Root Hermes non-default
pwsh -File scripts/apply-hermes-patches.ps1 -HermesRoot "D:\path\ke\hermes\python"
```
