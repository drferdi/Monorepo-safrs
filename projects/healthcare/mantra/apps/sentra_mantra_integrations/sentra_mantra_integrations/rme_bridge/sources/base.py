"""Kontrak sumber data RME. Semua colokan (folder/DB/HL7/RPA) ikut bentuk ini."""

from __future__ import annotations

from abc import ABC, abstractmethod


class Source(ABC):
	"""Satu jalur masuk data RME lama.

	Kontraknya sempit disengaja: sumber HANYA menarik baris mentah apa adanya
	dari RME. Tidak memetakan, tidak memvalidasi, tidak menyentuh DocType —
	itu tugas pipeline inti. Ini menjaga `integrations` tak jadi system of
	record (ADR-0001) dan bikin colokan gampang ditukar.
	"""

	#: label pendek untuk audit ("folder", "readonly_db", "hl7", ...)
	kind: str = "abstract"

	@abstractmethod
	def fetch(self, entity: str) -> list[dict]:
		"""Tarik baris mentah untuk satu jenis entitas (mis. "patient").

		Kembalikan list of dict — kolom apa adanya dari RME, belum dipetakan.
		Wajib read-only terhadap sumber: JANGAN menulis balik ke RME lama.
		"""
		raise NotImplementedError

	def describe(self) -> dict:
		"""Metadata sumber untuk jejak audit (dari mana data ditarik)."""
		return {"kind": self.kind}
