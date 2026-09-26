"""Penjadwal agen — isolasi kegagalan, idempotensi, jejak audit (spesifikasi §5).

Dijalankan dari `scheduler_events` di hooks.py, atau manual:

    bench --site mantra.localhost execute sentra_mantra_core.agents.runner.run_agent --args "['SMOKE']"

Tiga sifat yang dijaga di sini:

1. **Isolasi.** Setiap aturan berjalan di dalam savepoint sendiri. Aturan yang
   gagal di-rollback ke savepoint-nya dan dicatat; aturan lain dan agen lain
   tetap menyelesaikan eksekusinya.
2. **Idempotensi.** Runner tidak menyimpan penanda "sudah jalan hari ini";
   idempotensi datang dari `dedup_key` pada kontrak kartu, sehingga eksekusi
   kedua pada hari yang sama tidak menerbitkan kartu kembar.
3. **Tidak ada kegagalan diam.** Setiap eksekusi menulis `Sentra Agent Run`, dan
   aturan yang gagal menerbitkan kartu `Informasi` kepada System Manager.

Deteksi dan penerbitan sengaja dipisah dua tahap (lihat `_prepare_session` dan
`_emit_sessions`). Batas tujuh kartu per hari (`contract.MAX_CARDS_PER_DAY`)
bersifat rebutan slot: bila seluruh agen langsung menerbitkan begitu
detektornya selesai, agen yang kebetulan berjalan lebih dulu — atau aturan
yang kebetulan berada lebih atas di tabel — akan menghabiskan slot itu
duluan, sekalipun temuannya sekadar rutin. Kartu Mendesak dari agen yang
berjalan belakangan bisa kalah rebutan oleh kartu Perlu Keputusan yang
biasa-biasa saja. Karena itu seluruh agen dalam satu jadwal mendeteksi lebih
dulu; hasilnya digabung dan diurutkan berdasarkan tingkat sebelum satu pun
kartu diterbitkan.
"""

from __future__ import annotations

import json

import frappe
from frappe.utils import now_datetime, today

from sentra_mantra_core.agents import contract
from sentra_mantra_core.agents.permissions import AgentContext
from sentra_mantra_core.audit_registry import record_event

RUN_DOCTYPE = "Sentra Agent Run"
AGENT_DOCTYPE = "Sentra Agent Definition"

DETECTOR_PREFIX = "sentra_mantra_core.agents.detectors."

FAILURE_RULE_CODE = "RUNNER-FAILURE"
FAILURE_AUDIENCE_ROLE = "System Manager"

# Urutan rebutan slot kartu — bukan urutan tabel, bukan urutan agen berjalan.
# Sesuai daftar tingkat kartu (spesifikasi §3); tingkat yang tak dikenal
# ditaruh paling akhir alih-alih membuat penerbitan gagal.
SEVERITY_ORDER = ("Mendesak", "Perlu Tinjauan", "Perlu Keputusan", "Informasi")

# Pesan eksepsi TIDAK PERNAH disimpan. Mulai Tahap C detektor membaca faktur,
# surat jalan, dan catatan pemasok; eksepsi yang terlempar di tengahnya lazim
# membawa nama pemasok, nilai rupiah, atau identitas ke dalam pesannya. Tidak
# ada daftar putih yang bisa membuktikan sebuah pesan bebas data — pemindai
# de-identifikasi kami mengenali nama karyawan dan pola pasien, tetapi tidak
# mengenali nama pemasok maupun angka faktur. Karena itu yang dicatat hanyalah
# fakta struktural: aturan mana, detektor mana, dan kelas eksepsi apa. Ketiganya
# berasal dari kode, bukan dari data, dan cukup untuk menelusuri kegagalan.


def _severity_rank(severity: str) -> int:
	try:
		return SEVERITY_ORDER.index(severity)
	except ValueError:
		return len(SEVERITY_ORDER)


def run_daily_agents():
	"""scheduler_events cron 05.30 — kartu siap sebelum 06.00."""
	return run_schedule("Harian")


def run_weekly_agents():
	return run_schedule("Mingguan")


def expire_overdue_cards() -> dict:
	"""Kartu Terbuka yang melewati due_by menjadi Kedaluwarsa (spesifikasi §3).

	Chamber yang menumpuk kartu basi adalah Chamber yang diabaikan. Kartu tidak
	pernah dihapus — statusnya berpindah, jejaknya utuh, dan ia keluar dari
	Chamber menuju ringkasan.

	Idempoten: hanya kartu berstatus Terbuka yang disentuh, sehingga eksekusi
	kedua tidak menemukan apa pun. Kartu Diputuskan dan Didelegasikan tidak
	pernah ikut, sekalipun tenggatnya lewat.

	Status diubah lewat `db.set_value`, bukan `doc.save()`: menyimpan ulang
	kartu lama akan menjalankan kembali validasi de-identifikasi terhadap master
	karyawan hari ini, sehingga perubahan master bisa menggagalkan kedaluwarsa
	kartu yang sah. Jejak eksekusinya masuk ke audit spine.
	"""
	overdue = frappe.get_all(
		contract.CARD_DOCTYPE,
		filters=[
			["status", "=", contract.STATUS_OPEN],
			["due_by", "is", "set"],
			["due_by", "<", today()],
		],
		pluck="name",
	)
	for name in overdue:
		frappe.db.set_value(
			contract.CARD_DOCTYPE, name, "status", contract.STATUS_EXPIRED, update_modified=True
		)
	record_event(
		source_app="sentra_mantra_core",
		producer="agents.runner.expire_overdue_cards",
		event_type="Record Change",
		target_doctype=contract.CARD_DOCTYPE,
		# Nama kartu ikut dicatat: tanpa itu, lima kartu kedaluwarsa hanya
		# menyisakan angka lima dan tidak ada tempat lain yang menyimpan yang
		# mana. Nama kartu adalah pengenal internal, bukan data pasien.
		payload={"expired": len(overdue), "cutoff": today(), "cards": overdue},
		notes="Kartu Terbuka melewati tenggat dipindahkan ke Kedaluwarsa.",
	)
	return {"expired": len(overdue), "cutoff": today(), "cards": overdue}


def run_schedule(schedule: str, trigger: str = "Terjadwal") -> list[dict]:
	"""Jalankan seluruh agen aktif berjadwal `schedule`.

	Seluruh agen mendeteksi lebih dulu (Tahap 1); satu pun kartu belum
	terbit di titik ini. Temuan seluruh agen lalu digabung dan diterbitkan
	bersama, diurutkan berdasarkan tingkat (Tahap 2) — sehingga agen yang
	diproses belakangan tidak pernah kalah rebutan slot harian hanya karena
	urutan proses.
	"""
	codes = frappe.get_all(
		AGENT_DOCTYPE,
		filters={"enabled": 1, "schedule": schedule},
		pluck="name",
		order_by="agent_code asc",
	)
	sessions = []
	loaded = []
	for code in codes:
		try:
			session = _prepare_session(code, trigger)
		except Exception as exc:
			# Agen yang gagal sebelum jejak eksekusinya sempat dibuat tidak boleh
			# menghentikan agen berikutnya.
			sessions.append({"agent": code, "status": "Gagal", **_failure_record(exc, agent_code=code)})
		else:
			loaded.append(session)
	_emit_sessions(loaded)
	sessions.extend(session["result"] for session in loaded)
	return sessions


def run_agent(agent_code: str, trigger: str = "Terjadwal") -> dict:
	session = _prepare_session(agent_code, trigger)
	_emit_sessions([session])
	return session["result"]


def _prepare_session(agent_code: str, trigger: str) -> dict:
	"""Tahap 1: jalankan seluruh detektor agen; kumpulkan temuan, jangan terbitkan.

	Isolasi kegagalan tidak berubah: setiap aturan tetap berjalan di dalam
	savepoint sendiri, dan aturan yang gagal tetap menghasilkan kartu
	kegagalan — hanya penerbitannya yang ditunda ke Tahap 2, supaya kartu
	`Informasi` yang selalu bertingkat terendah tidak menyerobot slot di
	depan temuan yang masih menunggu diproses.
	"""
	agent = frappe.get_doc(AGENT_DOCTYPE, agent_code)
	run = frappe.new_doc(RUN_DOCTYPE)
	run.agent = agent.name
	run.run_date = today()
	run.trigger = trigger
	run.status = "Berjalan"
	run.started_at = now_datetime()
	run.insert(ignore_permissions=True)

	ctx = AgentContext(
		agent.name,
		[row.source_doctype for row in agent.read_scope or []],
		agent.audience_role,
	)

	jobs: list[dict] = []
	rules_executed = 0
	rules_failed = 0
	failures: list[dict] = []

	for index, rule in enumerate(agent.rules or []):
		if not rule.enabled:
			continue
		rules_executed += 1
		save_point = f"sentra_agent_rule_{index}"
		frappe.db.savepoint(save_point)
		try:
			for finding in _call_detector(ctx, rule):
				severity = finding.get("severity") or rule.severity
				jobs.append({"ctx": ctx, "rule": rule, "finding": finding, "severity": severity})
		except Exception as exc:
			frappe.db.rollback(save_point=save_point)
			rules_failed += 1
			failures.append(_failure_record(exc, rule=rule))
			jobs.append(_failure_job(agent, rule, exc))
		else:
			frappe.db.release_savepoint(save_point)

	return {
		"agent": agent,
		"run": run,
		"ctx": ctx,
		"jobs": jobs,
		"rules_executed": rules_executed,
		"rules_failed": rules_failed,
		"failures": failures,
		"budget": agent.max_cards_per_run or 0,
		"emitted": 0,
		"tally": {"published": 0, "queued": 0, "skipped": 0},
		"displaced": [],
		"narration_ok": True,
	}


def _emit_sessions(sessions: list[dict]) -> None:
	"""Tahap 2: gabungkan temuan seluruh sesi, urutkan berdasarkan tingkat, terbitkan.

	`max_cards_per_run` tetap berlaku sebagai anggaran per agen; batas harian
	Chamber tetap ditegakkan di `contract.emit_decision_card`. Yang berubah
	hanyalah urutan: temuan diproses Mendesak dulu, baru Perlu Tinjauan, Perlu
	Keputusan, dan Informasi paling akhir — lintas seluruh sesi yang dikirim
	bersama, bukan per agen.
	"""
	jobs = [
		{**job, "_session": session} for session in sessions for job in session["jobs"]
	]
	jobs.sort(key=lambda job: _severity_rank(job["severity"]))

	for job in jobs:
		session = job["_session"]
		budget = session["budget"]
		if budget and session["emitted"] >= budget:
			continue
		save_point = f"sentra_emit_{id(job)}"
		frappe.db.savepoint(save_point)
		try:
			outcome = job["ctx"].call_action("emit_decision_card", rule=job["rule"], **job["finding"])
		except Exception as exc:
			frappe.db.rollback(save_point=save_point)
			session["rules_failed"] += 1
			session["failures"].append(_failure_record(exc, rule=job["rule"]))
			continue
		frappe.db.release_savepoint(save_point)
		session["narration_ok"] = session["narration_ok"] and outcome["narration_ok"]
		if outcome["skipped"]:
			session["tally"]["skipped"] += 1
			continue
		session["emitted"] += 1
		if outcome["queued"]:
			session["tally"]["queued"] += 1
			# Kartu kedelapan-dan-seterusnya hari itu tidak boleh menghilang
			# diam-diam; tingkat aslinya tercatat di sini supaya Boss bisa
			# melihat apakah yang tergeser justru sesuatu yang penting.
			session["displaced"].append(
				{"rule_code": job["rule"].rule_code, "severity": job["severity"]}
			)
		else:
			session["tally"]["published"] += 1

	for session in sessions:
		_finalize_session(session)


def _finalize_session(session: dict) -> None:
	run = session["run"]
	run.rules_executed = session["rules_executed"]
	run.rules_failed = session["rules_failed"]
	run.cards_published = session["tally"]["published"]
	run.cards_queued = session["tally"]["queued"]
	run.cards_skipped = session["tally"]["skipped"]
	run.narration_ok = 1 if session["narration_ok"] else 0
	run.failures_json = (
		json.dumps(session["failures"], ensure_ascii=False, indent=1) if session["failures"] else None
	)
	run.violations_json = (
		json.dumps(session["ctx"].violations, ensure_ascii=False, indent=1)
		if session["ctx"].violations
		else None
	)
	run.displaced_json = (
		json.dumps(session["displaced"], ensure_ascii=False, indent=1) if session["displaced"] else None
	)
	run.finished_at = now_datetime()
	run.status = "Gagal" if session["rules_failed"] else "Selesai"
	run.save(ignore_permissions=True)

	session["result"] = {
		"agent": session["agent"].name,
		"run": run.name,
		"status": run.status,
		"executed": session["rules_executed"],
		"failed": session["rules_failed"],
		"published": session["tally"]["published"],
		"queued": session["tally"]["queued"],
		"skipped": session["tally"]["skipped"],
	}


def _failure_record(exc: Exception, rule=None, agent_code: str | None = None) -> dict:
	"""Jejak kegagalan tanpa satu pun nilai dari dokumen. Lihat catatan di atas."""
	record = {"error_class": type(exc).__name__}
	if agent_code:
		record["agent"] = agent_code
	if rule is not None:
		record["rule_code"] = rule.rule_code
		record["handler_path"] = rule.handler_path
	return record


def _call_detector(ctx: AgentContext, rule) -> list[dict]:
	path = (rule.handler_path or "").strip()
	if not path.startswith(DETECTOR_PREFIX):
		raise ValueError(f"handler_path di luar paket detektor: {path}")
	return frappe.get_attr(path)(ctx, rule) or []


def _failure_job(agent, rule, exc: Exception) -> dict:
	"""Kartu kegagalan sebagai temuan tertunda — ikut diurutkan di Tahap 2.

	Kegagalan diam adalah kegagalan terburuk (spesifikasi §5.4), tapi
	tingkatnya (Informasi) selalu paling rendah, jadi ia tidak boleh
	diterbitkan segera: itu berarti menyerobot slot di depan temuan Mendesak
	yang belum sempat diproses. Kartu hanya memuat kode aturan dan kelas
	eksepsi — pesan lengkapnya tinggal di `Sentra Agent Run`, bukan di kartu
	yang beredar di Chamber.
	"""
	admin_ctx = AgentContext(agent.name, (), FAILURE_AUDIENCE_ROLE)
	failure_rule = frappe._dict(rule_code=FAILURE_RULE_CODE, severity="Informasi")
	finding = {
		"subject": rule.rule_code,
		"title": f"Aturan {rule.rule_code} pada agen {agent.agent_code} gagal dijalankan",
		"trigger_explanation": (
			f"Dipicu karena detektor {rule.rule_code} melempar {type(exc).__name__}. "
			"Kartu dari aturan ini tidak terbit hari ini."
		),
		"evidence": [
			{
				"label": "Kelas kegagalan",
				"value": type(exc).__name__,
				"source_doctype": AGENT_DOCTYPE,
				"source_name": agent.name,
				"tone": "Peringatan",
			}
		],
		"options": [{"label": "Tutup kartu", "handler": "close_card", "is_primary": 1}],
	}
	return {"ctx": admin_ctx, "rule": failure_rule, "finding": finding, "severity": "Informasi"}
