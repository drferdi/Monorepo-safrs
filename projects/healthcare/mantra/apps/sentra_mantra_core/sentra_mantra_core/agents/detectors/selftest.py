"""Detektor uji-diri — dipakai suite penerimaan Tahap A, bukan oleh agen mana pun.

Dua pagar keselamatan hanya bisa dibuktikan dari dalam jalur runner yang
sesungguhnya: penolakan kueri di luar `read_scope` yang tercatat pada
`Sentra Agent Run`, dan isolasi kegagalan antar agen. Keduanya menuntut
detektor yang memang melanggar dan memang gagal. Karena `handler_path` wajib
berada di bawah paket ini, detektor tersebut tidak bisa hidup di direktori
tests tanpa melemahkan pagarnya sendiri.

Tidak ada `Sentra Agent Definition` yang dikirim bersama app ini merujuk ke
modul ini.
"""

from __future__ import annotations


def out_of_scope_probe(ctx, rule) -> list[dict]:
	"""Membaca DocType yang tidak pernah masuk read_scope agen mana pun."""
	ctx.get_all("Employee", limit=1)
	return []


def always_fails(ctx, rule) -> list[dict]:
	raise RuntimeError("detektor uji sengaja gagal")


# Bentuk eksepsi yang akan lazim terjadi mulai Tahap C: pesan galat yang
# terlempar di tengah pembacaan dokumen ikut membawa isi dokumen itu.
LEAK_PROBE_EMPLOYEE = "Sintetis Bocoran Namakaryawan"
LEAK_PROBE_SUPPLIER = "PT Pemasok Sintetis Bocoran"
LEAK_PROBE_AMOUNT = "12.345.678"


def fails_with_document_data(ctx, rule) -> list[dict]:
	raise ValueError(
		f"gagal membaca faktur dari {LEAK_PROBE_SUPPLIER} senilai "
		f"Rp {LEAK_PROBE_AMOUNT} atas nama {LEAK_PROBE_EMPLOYEE}"
	)
