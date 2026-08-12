# Data root korpus medis (`/database`)

Data kerja `projects/corpus-engine`. Seluruh direktori ini **gitignored**
(`/database/` di `.gitignore`) — tidak ada satu byte pun yang boleh masuk git.
Dokumen governance (inventory, protokol pustakawan) di-track di `docs/corpus/`.

| Path | Isi |
| --- | --- |
| `inbox\` | Zona lempar PDF apa pun — TIDAK dibaca pipeline. Kurasi dulu (dedup sha256, penamaan) sebelum pindah ke `sources\`. |
| `sources\` | PDF sumber terkurasi per spesialisasi (`int\`, `car\`, `ped\`, …). Immutable — tidak pernah diedit atau dihapus. |
| `canonical\` | Satu DoclingDocument JSON lossless per PDF + `manifest.jsonl`. Bisa dibangun ulang dari `sources\`. |
| `state\cocoindex\` | State inkremental CocoIndex (LMDB). Boleh dihapus: memaksa recompute dari canonical, bukan re-parse PDF. |
| `artifacts\` | Dump DB dan laporan sensus, bertanggal (`artifacts\2026-08-12\…`). |
| `logs\` | Log pipeline dan prewarm. |
| `corpus.lock` | Kunci single-writer. Pipeline membuatnya eksklusif saat mulai, menghapus saat selesai; penulis kedua wajib menolak start. |

## Aturan

- **`git clean -xdf` di root repo menghapus direktori ini.** Data ignored di
  dalam working tree; jangan pernah `clean -x` dari root.
- **Satu penulis.** Dua sesi pipeline pernah balapan di `canonical\`
  (2026-08-12) dan merusak `manifest.jsonl`. Hormati `corpus.lock`.
- Semua worktree membaca lewat path absolut checkout utama
  (`CORPUS_RAW_DIR`, `CORPUS_CANONICAL_DIR`, `COCOINDEX_DB`) — file ignored
  tidak dibagikan antar worktree.
- Backup direktori ini di luar git. Git tidak melindunginya.
