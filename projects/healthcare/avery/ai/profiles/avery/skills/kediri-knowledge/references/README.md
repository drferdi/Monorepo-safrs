# Avery Kediri Knowledge Pack v0.1

Tujuan: memberi Avery world-model lokal Kediri Raya yang dapat dipakai untuk retrieval, reasoning, conversation, dan pembaruan berkala.

## Prinsip
1. Pisahkan Kota Kediri, Kabupaten Kediri, dan Kediri Raya.
2. Bedakan Deep Memory, Living Registry, dan Pulse.
3. Fakta berubah harus memiliki sumber dan waktu verifikasi.
4. Jangan mengubah legenda, cerita warga, atau interpretasi sejarah menjadi fakta tanpa label.
5. Simpan alias/nama populer untuk membangun mental map lokal.
6. Untuk nomor telepon rumah sakit, pejabat, jadwal, dan layanan: verifikasi ulang sebelum tindakan penting.

## File
- `kediri_core.jsonl` — seed knowledge records siap ingest.
- `schema.json` — schema minimal.
- `source_registry.csv` — daftar sumber authoritative.
- `refresh_policy.md` — aturan pembaruan.
- `ingestion_notes.md` — panduan integrasi.
- `lived_experience_template.jsonl` — template corpus kehidupan lokal.

## Status
Ini adalah foundation v0.1, bukan klaim dataset Kediri yang sudah exhaustive.
Tahap selanjutnya: bulk ingestion BPS, Satu Data, JDIH, cultural registry, hospital registry, POI, education, transport, disaster, sports, food, oral history, dan daily news pulse.
