# Struktur Organisasi RSIA Melinda Kediri (dari bagan Chief, 17 Jul 2026)

Transkripsi bagan resmi "Bagan Struktur Organisasi RSIA Melinda Kediri".
Sumber untuk: Designation (`sentra_mantra_core/org_positions.py`), pohon
Department, dan mapping pejabat. Posisi kosong ditandai `(kosong)`.

## Pimpinan

- **Direktur RS** — dr. Ferdi A., SH.MKN
  - ⚠️ Di site sudah ada Designation "Direktur Utama" (confirmed 15 Jul,
    rename dari CEO). Bagan memakai istilah "Direktur RS" — perlu keputusan
    Chief: pertahankan "Direktur Utama" atau rename mengikuti bagan.

## Komite & Panitia (lapor langsung Direktur)

| Organ | Ketua |
|---|---|
| Komite Medis | dr. Dibya A., Sp.OG |
| Komite Keperawatan | (kosong) |
| KMKP–RS | (kosong) |
| KPPI–RS | dr. Lily Diah F., Sp.A |
| Komite Etik dan Hukum RS | dr. Hanifa, Sp.An |
| Panitia Obat dan Farmasi | dr. Dewanti K. |
| Panitia Rekam Medis | dr. Maya Kusumawati |
| Panitia K3–RS | Heri Cahyono |
| Case Manager | (kosong) |

## Kabag Administrasi Umum & Keuangan — Widya Putri Melinda, S.Psi., M.M.

- **Kasubag Administrasi** — Oriza Rahmawati
  - Kanit SDM & Diklat — Oriza Rahmawati, Amd.Keb.
  - Kanit Humas & Pemasaran — Oriza Rahmawati
  - Kanit TU/Sekretariat — (kosong)
- **Kasubag Keuangan** — Rahayu Wahyuni
  - Kanit Kasir — Mafsiah Sri Lestari
  - Kanit Akuntansi & Pajak — Rahayu Wahyuni
  - Kanit Asuransi — (kosong)
- **Kasubag Umum** — Heri Cahyono
  - Kanit Rumah Tangga — Rahayu W.
    - Logistik — Rahayu W.
    - UPSRS — Heri C.
    - Binroh — Sholeh
    - Satuan Keamanan — Sukemi
  - Kanit Sanitasi Lingkungan — Nina Dwi Krisnawati
    - Laundry — Heri Suprapto
    - Unit Kamar Steril — Ilmi

## Kabid Pelayanan Medis — dr. Dedi Wahyu Indrawijaya

- **Kasie Penunjang Medis** — dr. Lismardiana
  - Karu RMIK — Jamilatul, Amd.Kes
  - Kanit Laboratorium — Ahmad Sholeh, Amd
  - Kanit Farmasi — (kosong)
  - Kanit Gizi — Nurmaya Ningsih
- **Kasie Pelayanan Medis** — dr. Dewanti Kurnisari
  - Kanit Rawat Jalan — dr. Maya Kusumawati
  - Kanit Gawat Darurat — dr. Lismardiana
  - Kanit Bedah Sentral — dr. Dibya Arfianda, Sp.OG
- **Kasie Keperawatan** — (kosong)
  - Kanit VK — Lila Muji Suryanti, Amd.
  - Kanit URNA Anak Isolasi — Yasta Vida O., Amd.Keb.
  - Kanit URNA Bayi — (kosong)
  - Kanit URNA Dewasa — Novi Wakhidatul, Amd.Keb.

## Tambahan Chief di luar bagan (17 Jul 2026)

- **Manager Operasional** — designation aktif (posisi tidak tergambar di
  bagan; ditambahkan atas permintaan Chief).
- **Asisten Direktur / Sekretaris** — designation aktif, satu gelar gabungan
  sesuai penyebutan Chief; mudah di-split/rename via
  `org_positions.rename_position` bila kelak dipisah.

## Catatan pemodelan (perlu keputusan sebelum seeding)

1. **Rangkap jabatan nyata**: Oriza Rahmawati (3 posisi), Rahayu Wahyuni
   (±4), Heri Cahyono (2 + Panitia K3), dr. Lismardiana (2), dr. Maya
   Kusumawati (2 + Panitia RM), dr. Dibya (2 + Komite Medis). Field
   `Employee.designation` hanya satu — usulan: designation = jabatan
   struktural TERTINGGI orang tsb.; jabatan rangkap dicatat sebagai
   penugasan (bukan designation kedua).
2. **Designation struktural**: usulan pakai gelar level generik —
   "Kepala Bagian", "Kepala Bidang", "Kepala Sub Bagian", "Kepala Seksi",
   "Kepala Unit", "Kepala Ruang", "Case Manager" — unit spesifiknya
   dibedakan oleh Department, bukan nama designation (hindari ledakan
   ±20 designation "Kanit X").
3. **Komite/Panitia**: bukan struktur lini — usulan JANGAN jadi Department;
   cukup designation "Ketua Komite Medik" (sudah ada) dsb. bila perlu, atau
   catatan penugasan.
4. **Diskrepansi dengan Designation confirmed 15 Jul**: bagan tidak memuat
   "WADIR Keuangan" / "WADIR Pengembangan" / "Kepala Bagian Keuangan";
   bagan memakai "Kabag Administrasi Umum & Keuangan" dan "Kabid Pelayanan
   Medis". Perlu konfirmasi Chief mana yang berlaku (bagan lebih baru?).
5. **Pohon Department (ERPNext)** yang tersirat: Administrasi Umum &
   Keuangan (Administrasi / Keuangan / Umum + sub-unitnya) dan Pelayanan
   Medis (Penunjang Medis: RMIK, Laboratorium, Farmasi, Gizi; Pelayanan
   Medis: Rawat Jalan, IGD, Bedah Sentral; Keperawatan: VK, URNA Anak
   Isolasi, URNA Bayi, URNA Dewasa). VK/URNA juga akan jadi Healthcare
   Service Unit saat data bed masuk — dua konsep berbeda, jangan dicampur.
