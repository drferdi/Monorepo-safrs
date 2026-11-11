"""Pembersihan teks eksternal dan pemindaian identitas (spesifikasi §6 lapis 2 dan 4).

Konteksnya nyata: mulai Tahap C detektor membaca faktur, surat jalan, catatan
pemasok, dan deskripsi barang. Seluruhnya berasal dari luar rumah sakit dan
seluruhnya dapat disisipi kalimat perintah. Modul ini adalah pintu tempat teks
semacam itu berhenti menjadi kalimat dan berubah menjadi nilai data.

Dua tugas, keduanya deterministik:

* `clean_text` / `as_fact_value` — buang karakter kendali dan penanda peran,
  ratakan spasi, potong panjang, lalu bungkus sebagai nilai terkutip. Nilai
  terkutip dibaca model sebagai data, bukan sebagai instruksi.
* `scan_for_identifiers` — deteksi nama individu dari basis data karyawan dan
  pola identitas pasien. Dipakai validasi kartu maupun validasi narasi.

Modul ini tidak mengimpor modul agen lain: `contract` dan `narration` sama-sama
bergantung padanya, jadi ia harus berada di dasar rantai impor.
"""

from __future__ import annotations

import re

import frappe

MAX_VALUE_LENGTH = 120
ELLIPSIS = "…"

# Nama karyawan lebih pendek dari ini tidak dipakai sebagai pola pencocokan:
# satu entri master berisi inisial akan mencocoki hampir semua kalimat dan
# memblokir seluruh penerbitan kartu.
MIN_NAME_LENGTH = 4

# Pola identitas pasien. NIK 16 digit dan nomor rekam medis RM-######
# (naming series Patient ditetapkan di sentra_mantra_indonesia).
_IDENTIFIER_PATTERNS = (
	(re.compile(r"\d{16}"), "pola NIK 16 digit"),
	(re.compile(r"\bRM-\d{4,}\b", re.IGNORECASE), "pola nomor rekam medis"),
)

# Karakter kendali C0/C1 dan pembalik arah teks. Yang terakhir dipakai untuk
# menyembunyikan kalimat perintah di belakang teks yang terlihat wajar.
_CONTROL_CHARS = re.compile(
	"[\\x00-\\x1f\\x7f-\\x9f\\u200b-\\u200f\\u202a-\\u202e\\u2066-\\u2069\\ufeff]"
)

# Penanda peran dan pembatas percakapan yang dipakai teks eksternal untuk
# menyamar sebagai giliran sistem. Daftar ini menutup bentuk yang lazim; ia
# bukan pertahanan utama — pertahanan utamanya model tanpa alat (§6 lapis 3).
_ROLE_MARKERS = (
	re.compile(r"<\|[^|>]{0,60}\|>"),
	re.compile(r"\[/?INST\]", re.IGNORECASE),
	re.compile(r"<{1,2}/?SYS>{1,2}", re.IGNORECASE),
	re.compile(r"</?s>", re.IGNORECASE),
	re.compile(r"```+"),
	re.compile(r"(?im)^\s*#{1,6}\s*"),
	re.compile(
		r"(?im)(?:^|[\s\"'(\[])(system|assistant|user|human|developer|tool|function)\s*:"
	),
)


def clean_text(value, max_length: int = MAX_VALUE_LENGTH) -> str:
	"""Teks eksternal -> satu baris pendek tanpa karakter kendali dan penanda peran."""
	text = "" if value is None else str(value)
	text = _CONTROL_CHARS.sub(" ", text)
	for marker in _ROLE_MARKERS:
		text = marker.sub(" ", text)
	text = re.sub(r"\s+", " ", text).strip()
	if len(text) > max_length:
		text = text[:max_length].rstrip() + ELLIPSIS
	return text


def as_fact_value(value, max_length: int = MAX_VALUE_LENGTH) -> str:
	"""Nilai terkutip. Model membaca hasilnya sebagai data, bukan sebagai kalimat."""
	text = clean_text(value, max_length).replace('"', "'")
	return f'"{text}"'


# Setiap sumber nama orang atau badan yang tidak boleh muncul di kartu.
# Dokter tamu dan pemasok sama terlarangnya dengan karyawan: spesifikasi §2
# melarang menyebut individu, dan agen Farmasi membaca justru dari dokumen yang
# penuh nama pemasok.
_NAME_SOURCES = (
	("Employee", "employee_name", "nama individu dari basis data karyawan"),
	("Healthcare Practitioner", "practitioner_name", "nama tenaga kesehatan"),
	("User", "full_name", "nama pengguna sistem"),
	("Supplier", "supplier_name", "nama pemasok"),
)


def protected_names() -> list[tuple[re.Pattern, str]]:
	"""Satu pola per sumber identitas, dicocokkan pada batas kata.

	Pencocokan substring akan berbahaya ke arah sebaliknya: pemasok bernama
	"Sehat" membuat setiap kartu yang menyebut "kesehatan" ditolak, dan siapa
	pun yang boleh membuat Supplier dapat melumpuhkan penerbitan kartu dengan
	satu nama pendek. Batas kata menutup jalur itu.
	"""
	patterns = []
	for doctype, field, label in _NAME_SOURCES:
		names = {
			value.strip()
			for value in frappe.get_all(doctype, pluck=field)
			if value and len(value.strip()) >= MIN_NAME_LENGTH
		}
		if not names:
			continue
		alternation = "|".join(
			re.escape(name) for name in sorted(names, key=len, reverse=True)
		)
		patterns.append(
			(re.compile(rf"(?<!\w)(?:{alternation})(?!\w)", re.IGNORECASE), label)
		)
	return patterns


def scan_for_identifiers(
	text: str | None, names: list[tuple[re.Pattern, str]] | None = None
) -> str | None:
	"""Kembalikan label pola yang ditemukan, atau None.

	Nilai temuannya sengaja tidak dikembalikan: pemanggil memakai hasil ini di
	pesan error dan di jejak audit, dan tidak satu pun dari keduanya boleh
	menjadi tempat identitas ikut tersalin.

	`names` boleh dipasok pemanggil yang memeriksa banyak teks sekaligus,
	supaya master identitas dibaca sekali per dokumen, bukan sekali per teks.
	"""
	if not (text or "").strip():
		return None
	for pattern, label in _IDENTIFIER_PATTERNS:
		if pattern.search(text):
			return label
	for pattern, label in protected_names() if names is None else names:
		if pattern.search(text):
			return label
	return None
