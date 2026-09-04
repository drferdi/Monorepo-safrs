# SentraBot Free — Batas v1

**Status: TERKUNCI** · Keputusan Chief, 1 September 2026
Dokumen ini adalah sumber kebenaran tunggal untuk batas paket Free. Halaman harga, Ketentuan
Layanan, dan penegakan di backend harus mengacu ke sini.

---

## Tangga bot aktif per workspace

**TERKUNCI** · satuan yang sama di seluruh paket, agar tangganya terbaca naik.

| Paket | Bot aktif |
|---|---|
| Free | **3** |
| Plus | **10** |
| Pro | **30** |
| Business | **100** |

Bot di atas batas **tidak dihapus** — hanya dijeda sampai paket dinaikkan kembali.

---

## Batas Free selengkapnya

| Item | Batas v1 |
|---|---|
| Harga | Rp0 |
| Bot aktif | **3** |
| Managed AI | Termasuk, *fair-use* |
| Target COGS AI internal | ≤ Rp4.000 / active user / bulan |
| Pencarian web | 10 / hari |
| Unggah berkas | 5 / hari |
| Penyimpanan aktif | 250 MB |
| Jendela memori aktif | 30 hari |
| Tugas terjadwal | **3** aktif |
| Aksi agen | 20 / bulan |
| Integrasi tersambung | **1** |
| Suara | 15 menit / bulan |
| Sesi computer-agent | **3** / bulan |
| Desktop Runtime | Ya |
| Sinkronisasi multi-perangkat E2EE | Ya |
| Cloud Runtime 24/7 | Tidak |
| BYOK | Ya, Advanced |

Sesi computer-agent dikunci di **3**, bukan rentang 3–5, agar kontraknya tegas.

---

## Aturan komunikasi ke pelanggan

**Jangan pernah menjanjikan jumlah token.** Halaman pelanggan tidak boleh menulis "2 juta
token" atau angka token apa pun.

Yang boleh ditulis:

> Managed AI termasuk — pemakaian bulanan terbatas

Kendali biaya berada di backend: routing model dan guardrail menjaga COGS di sekitar
Rp4.000 per active Free user per bulan. Bila premium compute habis, **chat standar tidak
langsung mati** — sistem turun ke model dan kapabilitas yang lebih ekonomis.

---

## Perilaku saat turun dari Plus/Pro ke Free

Prinsip: **entitlement yang berubah, bukan data.** Tidak ada yang dihapus.

| Kondisi sebelum | Sesudah turun ke Free |
|---|---|
| 30 bot (Pro) | 3 aktif · 27 **dijeda** |
| 10 jadwal | 3 aktif · 7 **dijeda** |
| 4 integrasi | 1 aktif · 3 **dijeda** |
| Penyimpanan 2 GB | Data lama **tetap utuh**; unggahan baru ditutup sampai kembali di bawah kuota atau upgrade |
| Memori lama | **Diarsipkan**, bukan dihapus |

Upgrade kembali → seluruh entitlement dibuka lagi, bot dan konfigurasi lama dapat diaktifkan.

---

## Masa tenggang pembayaran gagal

**7 hari kalender.** Terkunci.

```
Perpanjangan gagal
        ↓
status = PAST_DUE
        ↓
Masa tenggang 7 hari kalender
        ↓
percobaan ulang pembayaran + pengingat
        ↓
berhasil → ACTIVE
gagal sampai hari ke-7 → FREE
```

Selama 7 hari itu, **entitlement paket lama tetap aktif penuh**. Setelah berakhir, akun turun
ke Free tanpa penghapusan data.

Alasan memilih 7 hari, bukan 3: untuk langganan Rp79.000–Rp199.000, tambahan biaya AI selama
beberapa hari jauh lebih kecil daripada risiko kehilangan pelanggan hanya karena saldo
e-wallet atau kartu sedang kosong.

---

## Pajak

Harga ke konsumen ditampilkan **sudah termasuk pajak yang berlaku** (*tax-inclusive*), bukan
"belum termasuk PPN". Ini sejalan dengan posisi produk yang plug-and-play: pelanggan melihat
satu angka final dan membayar angka itu.

Bila entitas penjual sudah wajib memungut PPN, komponen pajak dihitung **di dalam** harga,
bukan ditambahkan mendadak saat checkout.

Ilustrasi bila tarif efektif 11% dan harga final Rp79.000:

| | |
|---|---|
| DPP | ± Rp71.171 |
| PPN | ± Rp7.829 |
| Dibayar pelanggan | **Rp79.000** |

**Catatan Chief:** per September 2026 ketentuan DJP menyatakan tarif formal PPN 12%, namun
untuk barang/jasa selain kategori mewah digunakan DPP nilai lain 11/12 sehingga tarif
efektifnya tetap 11%.

> **Jangan memungut PPN hanya karena angkanya ditulis di halaman harga.** Apakah badan usaha
> Sentra wajib memungut PPN saat peluncuran tetap harus dikonfirmasi berdasarkan status PKP
> dan struktur penjualan yang sebenarnya.

---

## Riwayat perbaikan konsistensi

**Selesai 1 September 2026.** Sebelumnya halaman harga memakai dua satuan berbeda yang membuat
tangga terbaca terbalik: Free "3 bot aktif", Plus "2 agen berjalan bersamaan", Pro "agen tanpa
batas" — pembaca akan menyimpulkan Plus lebih sedikit daripada Free. Kini seluruh paket memakai
satuan yang sama, **bot aktif per workspace**: 3 · 10 · 30 · 100.

Ikut diperbaiki: satu butir FAQ masih menyebut nama paket lama ("Dua agen di paket Profesional,
dan tanpa batas di paket Tanpa batas") padahal paket sudah berganti ke Free/Plus/Pro/Business.
