"""Kontrak Kartu Keputusan — pembuatan, dedup, validasi, batas anti-banjir.

Seluruh agen menghasilkan satu bentuk keluaran yang sama (spesifikasi §3). Ini
yang mencegah Chamber menjadi tujuh sumber notifikasi yang saling berebut
perhatian, dan yang membuat satu tempat cukup untuk menegakkan tiga aturan:

* **De-identifikasi.** Kartu yang memuat nama individu dari basis data karyawan
  atau pola identitas pasien ditolak di `validate()` — berlaku untuk jalur mana
  pun, termasuk penyuntingan manual di desk.
* **Dedup.** Selama kartu dengan `dedup_key` yang sama masih `Terbuka`, kondisi
  yang sama tidak menerbitkan kartu kedua. Ini yang membuat runner idempoten.
* **Batas harian.** Maksimal tujuh kartu naik ke Chamber per hari; sisanya tetap
  tercatat namun ditandai `queued_for_summary` untuk ringkasan mingguan.

Handler opsi keputusan disimpan sebagai **kunci registry**, bukan dotted path.
Field data yang bisa dieksekusi bebas adalah jalur eskalasi hak akses; registry
menutupnya. Handler dijalankan oleh sesi manusia yang menekan tombol, dengan
izin manusia itu — agen tidak pernah memiliki jalur eksekusi.
"""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import add_days, now_datetime, today

from sentra_mantra_core.agents import narration, sanitize

CARD_DOCTYPE = "Sentra Decision Card"

MAX_CARDS_PER_DAY = 7

SEVERITIES = ("Mendesak", "Perlu Tinjauan", "Perlu Keputusan", "Informasi")

STATUS_OPEN = "Terbuka"
STATUS_DECIDED = "Diputuskan"
STATUS_EXPIRED = "Kedaluwarsa"

DEFER_DAYS = 3


# -- de-identifikasi ---------------------------------------------------------

# Implementasinya tinggal di `sanitize` supaya validasi kartu dan validasi
# narasi memakai pemindai yang sama persis. Nama ini tetap dapat dipanggil
# sebagai `contract.scan_for_identifiers` oleh pemanggil lama.
scan_for_identifiers = sanitize.scan_for_identifiers


def _card_texts(doc):
	yield doc.title
	yield doc.narrative
	yield doc.trigger_explanation
	yield doc.decision_note
	for row in doc.evidence or []:
		yield row.label
		yield row.value
		yield row.source_name
	for row in doc.options or []:
		yield row.label


def assert_deidentified(doc) -> None:
	"""Tolak kartu yang memuat identitas individu. Pesan tidak mengutip temuannya.

	Master identitas dibaca sekali per kartu, bukan sekali per teks: satu kartu
	dengan sepuluh baris fakta akan melakukan puluhan kueri kalau tidak.
	"""
	names = sanitize.protected_names()
	for text in _card_texts(doc):
		found = scan_for_identifiers(text, names)
		if found:
			frappe.throw(
				_(
					"Kartu ditolak: memuat {0}. Chamber bekerja pada tingkat agregat — "
					"sistem menutup celah, bukan menunjuk orang."
				).format(found)
			)


# -- registry handler keputusan ---------------------------------------------


def close_card(card, note: str | None = None):
	"""Tutup kartu atas keputusan manusia yang menekan tombol."""
	card.status = STATUS_DECIDED
	card.decided_by = frappe.session.user
	card.decided_at = now_datetime()
	if (note or "").strip():
		card.decision_note = note.strip()
	card.save()
	return {"card": card.name, "status": card.status, "decided_by": card.decided_by}


def defer_card(card, note: str | None = None):
	"""Kartu tetap terbuka, tenggat diperpanjang, alasan tercatat."""
	card.due_by = add_days(card.due_by or today(), DEFER_DAYS)
	if (note or "").strip():
		card.decision_note = note.strip()
	card.save()
	return {"card": card.name, "status": card.status, "due_by": str(card.due_by)}


DECISION_HANDLERS = {
	"close_card": close_card,
	"defer_card": defer_card,
}


# -- penerbitan kartu --------------------------------------------------------


def build_dedup_key(agent_code: str, rule_code: str, subject: str) -> str:
	"""Kunci kondisi, tanpa tanggal.

	Tanpa tanggal, kondisi yang sama tidak menerbitkan kartu baru setiap hari
	selama kartu sebelumnya masih Terbuka. Setelah kartu diputuskan atau
	kedaluwarsa, kondisi yang masih berlanjut boleh terbit lagi.
	"""
	return f"{agent_code}:{rule_code}:{subject}"


def published_today() -> int:
	return frappe.db.count(
		CARD_DOCTYPE, {"queued_for_summary": 0, "creation": (">=", today())}
	)


def emit_decision_card(
	ctx,
	rule,
	subject: str,
	title: str,
	evidence,
	options,
	trigger_explanation: str | None = None,
	severity: str | None = None,
	due_by=None,
	narrative: str | None = None,
) -> dict:
	"""Terbitkan satu Kartu Keputusan. Satu-satunya tindakan yang dimiliki agen."""
	severity = severity or rule.severity
	if severity not in SEVERITIES:
		frappe.throw(_("Tingkat kartu tidak dikenal: {0}").format(severity))

	dedup_key = build_dedup_key(ctx.agent_code, rule.rule_code, subject)
	existing = frappe.db.exists(CARD_DOCTYPE, {"dedup_key": dedup_key, "status": STATUS_OPEN})
	if existing:
		return {
			"published": False,
			"queued": False,
			"skipped": True,
			"card": existing,
			"reason": "dedup",
			"narration_ok": True,
		}

	narration_ok = True
	try:
		# Narasi yang dipasok pemanggil pun lewat validasi yang sama — tidak ada
		# jalur yang menyimpan teks tak tervalidasi lalu menandainya sebagai LLM.
		narrative, narrative_source = narration.narrate(
			title, trigger_explanation, evidence, candidate=narrative
		)
	except Exception:
		# Keselamatan rumah sakit tidak pernah bergantung pada lapis narasi:
		# kartu tetap terbit walau penarasi gagal (spesifikasi §1).
		narrative, narrative_source = title, narration.NARRATIVE_SOURCE_TEMPLATE
		narration_ok = False

	queued = published_today() >= MAX_CARDS_PER_DAY

	doc = frappe.new_doc(CARD_DOCTYPE)
	doc.agent = ctx.agent_code
	doc.rule_code = rule.rule_code
	doc.severity = severity
	doc.title = title
	doc.narrative = narrative
	doc.narrative_source = narrative_source
	doc.trigger_explanation = trigger_explanation
	doc.audience_role = ctx.audience_role
	doc.due_by = due_by
	doc.status = STATUS_OPEN
	doc.queued_for_summary = 1 if queued else 0
	doc.dedup_key = dedup_key
	for row in evidence or []:
		doc.append("evidence", row)
	for row in options or []:
		doc.append("options", row)
	doc.insert(ignore_permissions=True)

	return {
		"published": not queued,
		"queued": queued,
		"skipped": False,
		"card": doc.name,
		"reason": "queued" if queued else "published",
		"narration_ok": narration_ok,
	}
