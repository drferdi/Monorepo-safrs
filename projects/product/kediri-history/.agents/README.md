# `.agents/` — Memori Proyek Kediri

Folder ini adalah **memori capsule**: apa yang harus diketahui sesi berikutnya sebelum
menyentuh kode, dan mengapa keadaannya seperti sekarang. Ia mengikuti bentuk
`D:\DEV\Monorepo\.agents` di root, tetapi cakupannya **hanya** Kediri.

Dibuat 2026-08-26 atas perintah Chief.

## Baca dalam urutan ini

| Berkas | Isi | Ritme perubahan |
| --- | --- | --- |
| `HANDOFF.md` | Keadaan sesi berjalan dan tindakan berikutnya | **Ditimpa** setiap sesi |
| `BOUNDARIES.md` | Pagar yang mengikat; keputusan Chief G01–G05 | Jarang; hanya atas perintah Chief |
| `PROGRESS.md` | Papan fase 0–22, satu-satunya klaim status yang hidup | Saat sebuah fase benar-benar berpindah |
| `CONTEXT.md` | Identitas proyek: untuk siapa, apa taruhannya | Jarang |
| `DECISIONS.md` | Keputusan durable, append-only, terbaru di atas | Ditambah, tidak pernah ditulis ulang |
| `knowledge/` | Pengetahuan yang tidak hidup di `docs/` | Saat sesuatu benar-benar dipelajari |

## Aturan

1. **Folder ini bukan dokumentasi produk.** Spesifikasi hidup di `docs/bibles/` dan
   `docs/implementation/`; arsitektur di `docs/architecture.md`. Jangan menyalin isinya ke sini —
   rujuk saja. Salinan kedua adalah salinan yang akan dilupakan.
2. **Status hanya di `PROGRESS.md`.** Root `.agents/PROGRESS.md` pernah rusak justru karena
   menduplikasi papan status; jangan ulangi kesalahannya di sini.
3. **Tidak ada skill di sini.** Standar authoring (mis. Sentra-GSAP) tetap milik root dan
   **bukan** dependensi runtime capsule. Keputusan Chief G04 melarang duplikasi skill ke dalam
   capsule. Capsule yang diekstraksi harus tetap berjalan tanpa `../../.agents/skills`.
4. **Tidak ada rahasia.** Kredensial pengembangan lokal yang cocok dengan
   `infra/docker-compose.yml` dicatat di `AGENTS.md` capsule; rahasia produksi tidak pernah
   ditulis di mana pun di repositori.
5. **Bahasa Indonesia**, sama seperti komunikasi dengan Chief.

## Hubungan dengan root

Root `.agents/` mengatur seluruh Monorepo dan lintas-sesi; folder ini tidak menggantikannya.
`.agents/BOUNDARIES.md` di root tetap berlaku penuh di sini — terutama larangan push/publish
tanpa perintah Chief pada sesi yang bersangkutan.
