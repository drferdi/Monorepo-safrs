"""RME Bridge — jalur tarik data dari RME lama ke MANTRA tanpa API.

Keputusan Chief (direktur): prioritas jalur masuk = read-only DB / scheduled
export folder dari RME lama, BUKAN nunggu API resmi. Pola outbox/retry ADR-0001:
`integrations` tidak pernah jadi system of record — data mentah diparkir di
staging dulu, transaksi internal MANTRA tetap utuh walau tarikan gagal.

Tulang punggung (channel-agnostic, di dalam MANTRA):

    sumber → staging → dedup → validasi → DocType → audit

Jalur masuk (`sources/`) adalah colokan yang bisa ditukar tanpa mengubah inti:
folder export, read-only DB, HL7, RPA. Colokan pertama = FolderSource (paling
universal — hampir semua RME bisa dump CSV/XLSX ke folder/SFTP).

Seam RME-specific (mapping field RME → DocType MANTRA) sengaja belum diisi:
bentuknya bergantung format RME Melinda yang belum dikonfirmasi. Frame-nya siap;
begitu format diketahui, isi `mapping`, sisanya jalan.
"""
