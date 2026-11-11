# Vital Sign Executive Brief

Tanggal: 2026-04-06

## Tujuan

Dokumen 1 halaman ini menjelaskan dalam bahasa non-engineer apa yang sebenarnya dikerjakan halaman `VITAL SIGN` Med Assist saat ini.

## Apa Yang Aktif Sekarang

Halaman `VITAL SIGN` saat ini melakukan tiga fungsi utama:

1. membaca input tanda vital dan memberi alert cepat berbasis ambang klinis
2. mengubah input gejala singkat menjadi draft anamnesa yang lebih rapi melalui `AutoComplete+`
3. menyiapkan data pasien untuk diteruskan ke flow analisis lanjutan atau `Forward to Doctor`

## Apa Bentuk Algoritmenya

Mesin yang aktif sekarang adalah `deterministic rule-based screening`, bukan AI penuh dan bukan skor `NEWS2` penuh.

Artinya:

- sistem memakai aturan ambang yang jelas
- hasil dapat dilacak ke rule tertentu
- sistem tidak mengarang fakta baru
- sistem cocok untuk intake cepat di side panel

## Rule Klinis Yang Sudah Aktif

Alert cepat yang aktif saat ini mencakup:

- perfusi rendah / hipotensi
- krisis hipertensi
- hipoglikemia
- hiperglikemia berat
- hipoksia
- takipnea
- takikardia
- demam tinggi

## Apa Yang Belum Aktif Sebagai Mesin Utama

Walau codebase sudah punya modul yang lebih besar, halaman ini saat ini belum memakai:

- `NEWS2` penuh
- occult shock inline sebagai gate utama
- auto-inference vital sign penuh dari keluhan
- full red flag engine sebagai sumber alert lokal pertama

## Apa Yang Jalan Setelah User Lanjut

Setelah user lanjut dari halaman `VITAL SIGN`, barulah sistem bisa menjalankan:

- analisis trajectory 3-5 kunjungan terakhir
- differential insight
- CDSS engine yang lebih lengkap

## Kenapa Ini Penting

Poin ini penting agar tim tidak salah menyebut fitur.

Pernyataan yang benar:

- halaman `VITAL SIGN` sekarang adalah `custom deterministic gate-based screening`
- halaman ini belum menjadi `NEWS2` screen penuh
- layer analitik lanjut berada di flow berikutnya, bukan di intake awal

## Risiko Salah Paham Yang Perlu Dihindari

- menyebut halaman ini sebagai AI triage penuh
- menyebut halaman ini sudah memakai `NEWS2`
- menganggap modul yang ada di repo otomatis sudah aktif di layar utama

## Rekomendasi Komunikasi Ke Tim

Kalimat yang aman dipakai:

- "Halaman `VITAL SIGN` saat ini fokus pada screening cepat berbasis threshold rule dan drafting anamnesa."
- "Analisis longitudinal dan CDSS lengkap baru aktif setelah user masuk ke trajectory atau differential."
- "Beberapa engine lanjutan sudah ada di repo, tetapi belum wired sebagai mesin utama layar inti."
