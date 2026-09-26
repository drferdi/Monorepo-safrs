# Sentraverse Design Governance

## Purpose

Dokumen ini menjadi source of truth untuk ritme layout, peran tipografi, dan
override visual di homepage Sentraverse. Semua section baru harus mengikuti
token yang sudah ada sebelum menambah nilai spacing, font, atau density baru.

## Layout Rhythm

Gunakan token dari
[lib/design-governance.ts](../lib/design-governance.ts).

- `layoutGovernance.sectionX`: gutter default `px-6 md:px-12`
- `layoutGovernance.sectionY.compact`: `py-12 md:py-16`
- `layoutGovernance.sectionY.standard`: `py-16 md:py-20`
- `layoutGovernance.sectionY.spacious`: `py-20 md:py-24`
- `layoutGovernance.sectionY.hero`: `py-20 md:py-24 lg:py-28`

Rules:

- Jangan campur ritme ad hoc seperti `pt-36 pb-24`, `mt-[13vw]`, atau `py-8`
  untuk band utama.
- Pakai `container.wide`, `container.body`, atau `container.reading` untuk lebar
  konten.
- Jika sebuah section butuh pengecualian, tambahkan token baru di governance
  file, bukan inline di komponen.

## Typography Roles

Gunakan role dari `typeGovernance`:

- `eyebrow`: label kecil uppercase
- `sectionTitle`: heading utama section
- `body` dan `bodySm`: copy utama
- `editorialDisplay`: headline editorial terkontrol
- `editorialBody`: copy editorial
- `meta` dan `monoMeta`: metadata

Rules:

- Body global tetap `16px / 1.5`.
- Maksimal dua keluarga font pada satu surface: UI/body dan editorial.
- Hindari `Caveat`, inline `fontFamily`, atau hardcoded `Georgia` kecuali sudah
  dibungkus oleh role governance.
- `font-mono` hanya untuk metadata, terminal, atau status teknis.

## Density And Overrides

Override global berbasis `!important` dilarang untuk produk utama. Untuk surface
khusus seperti simulasi klinis, pakai variabel terlingkup di
[app/globals.css](../app/globals.css):

- `.sentra-sim-density-compact`
- `.sentra-sim-title`
- `.sentra-sim-kicker`
- `.sentra-sim-body`
- `.sentra-sim-card`
- `.sentra-sim-stack`

Pattern:

- definisikan variable lokal
- konsumsi variable lewat class semantic
- jangan override utility class dengan `!important`

## Component Rules

- Heavy tab panels harus di-mount secara kondisional, bukan disembunyikan dengan
  `display: none`.
- Komponen besar wajib memisahkan config statis, utilitas murni, dan subtree
  interaktif jika file mulai mencampur beberapa tanggung jawab.
- URL eksternal dari env harus lewat validasi atau allowlist.
- Surface conversion ringan seperti `mailto:` wajib memberi validasi input dan
  feedback state.

## Review Checklist

- Ritme section memakai token governance
- Heading/body memakai role typography
- Tidak ada font inline baru
- Tidak ada override `!important`
- Tidak ada panel berat yang tetap mounted saat hidden
- CTA eksternal tervalidasi
