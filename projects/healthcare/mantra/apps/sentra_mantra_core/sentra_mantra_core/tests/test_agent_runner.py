"""Runner — idempotensi, isolasi kegagalan, jejak eksekusi (spesifikasi §5)."""

import json

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, today

from sentra_mantra_core.agents import contract, runner
from sentra_mantra_core.tests import agent_fixtures as fx

CARD_DOCTYPE = "Sentra Decision Card"


def _cards_of(agent_name):
	return frappe.get_all(CARD_DOCTYPE, filters={"agent": agent_name}, pluck="name")


class TestAgentRunner(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		fx.ensure_chamber_access()

	def tearDown(self):
		frappe.db.rollback()

	def test_smoke_agent_publishes_one_card_end_to_end(self):
		agent = fx.make_agent("RUN-SMOKE", rules=[fx.rule("UJI-SMOKE")])
		result = runner.run_agent(agent.name, trigger="Manual")
		self.assertEqual(result["status"], "Selesai")
		self.assertEqual(result["skipped"], 0)
		cards = _cards_of(agent.name)
		self.assertEqual(len(cards), 1)
		card = frappe.get_doc(CARD_DOCTYPE, cards[0])
		self.assertEqual(card.status, "Terbuka")
		self.assertEqual(card.audience_role, fx.CHIEF_ROLE)
		self.assertEqual(card.severity, "Informasi")
		self.assertTrue(card.evidence)
		self.assertTrue(card.options)
		self.assertTrue(card.card_id.startswith("DC-"))

	def test_running_twice_in_one_day_publishes_no_duplicate(self):
		agent = fx.make_agent("RUN-IDEM", rules=[fx.rule("UJI-IDEM")])
		first = runner.run_agent(agent.name, trigger="Manual")
		second = runner.run_agent(agent.name, trigger="Manual")
		self.assertEqual(first["skipped"], 0)
		self.assertEqual(second["skipped"], 1)
		self.assertEqual(len(_cards_of(agent.name)), 1)

	def test_one_failing_agent_does_not_stop_the_others(self):
		broken = fx.make_agent(
			"RUN-BROKEN", rules=[fx.rule("UJI-GAGAL", handler_path=fx.FAILING_HANDLER)]
		)
		healthy = fx.make_agent("RUN-OK", rules=[fx.rule("UJI-SEHAT")])
		results = {r["agent"]: r for r in runner.run_schedule("Bulanan", trigger="Manual")}
		self.assertEqual(results[broken.name]["status"], "Gagal")
		self.assertEqual(results[healthy.name]["status"], "Selesai")
		self.assertEqual(results[healthy.name]["skipped"], 0)
		self.assertEqual(len(_cards_of(healthy.name)), 1)

	def test_failing_rule_is_recorded_and_raises_an_information_card(self):
		agent = fx.make_agent(
			"RUN-FAIL", rules=[fx.rule("UJI-GAGAL", handler_path=fx.FAILING_HANDLER)]
		)
		result = runner.run_agent(agent.name, trigger="Manual")
		run = frappe.get_doc("Sentra Agent Run", result["run"])
		self.assertEqual(run.status, "Gagal")
		self.assertEqual(run.rules_failed, 1)
		failures = json.loads(run.failures_json)
		self.assertEqual(failures[0]["rule_code"], "UJI-GAGAL")
		self.assertEqual(failures[0]["error_class"], "RuntimeError")
		self.assertEqual(failures[0]["handler_path"], fx.FAILING_HANDLER)
		self.assertNotIn("error", failures[0])
		failure_cards = frappe.get_all(
			CARD_DOCTYPE,
			filters={"agent": agent.name, "rule_code": runner.FAILURE_RULE_CODE},
			fields=["severity", "audience_role"],
		)
		self.assertEqual(len(failure_cards), 1)
		self.assertEqual(failure_cards[0].severity, "Informasi")
		self.assertEqual(failure_cards[0].audience_role, runner.FAILURE_AUDIENCE_ROLE)

	def test_handler_path_outside_the_detector_package_is_refused(self):
		agent = fx.make_agent("RUN-PATH", rules=[fx.rule("UJI-PATH")])
		frappe.db.set_value(
			"Sentra Agent Rule", agent.rules[0].name, "handler_path", "os.system"
		)
		result = runner.run_agent(agent.name, trigger="Manual")
		self.assertEqual(result["status"], "Gagal")
		self.assertEqual(result["failed"], 1)
		rule_codes = frappe.get_all(
			CARD_DOCTYPE, filters={"agent": agent.name}, pluck="rule_code"
		)
		self.assertEqual(rule_codes, [runner.FAILURE_RULE_CODE])

	def test_agent_definition_rejects_handler_outside_the_detector_package(self):
		with self.assertRaises(frappe.ValidationError):
			fx.make_agent("RUN-BADPATH", rules=[fx.rule("UJI-BADPATH", handler_path="os.system")])

	def test_disabled_agent_is_not_picked_up_by_the_schedule(self):
		agent = fx.make_agent("RUN-OFF", rules=[fx.rule("UJI-OFF")], enabled=0)
		results = {r["agent"] for r in runner.run_schedule("Bulanan", trigger="Manual")}
		self.assertNotIn(agent.name, results)

	def test_expiry_job_is_registered_on_the_scheduler(self):
		cron = frappe.get_hooks("scheduler_events").get("cron", {})
		self.assertIn(
			"sentra_mantra_core.agents.runner.expire_overdue_cards",
			sum(cron.values(), []),
		)

	def test_max_cards_per_run_caps_one_execution(self):
		agent = fx.make_agent(
			"RUN-BUDGET",
			rules=[fx.rule("UJI-A"), fx.rule("UJI-B")],
			max_cards_per_run=1,
		)
		result = runner.run_agent(agent.name, trigger="Manual")
		self.assertEqual(result["skipped"], 0)
		self.assertEqual(len(_cards_of(agent.name)), 1)


class TestCardExpiry(FrappeTestCase):
	"""Kartu Terbuka lewat tenggat menjadi Kedaluwarsa (spesifikasi §3)."""

	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		fx.ensure_chamber_access()

	def tearDown(self):
		frappe.db.rollback()

	def _card(self, subject="kedaluwarsa", due_offset=-1):
		agent = fx.make_agent("EXP", rules=[fx.rule("UJI-EXP")])
		ctx = fx.context(agent)
		outcome = contract.emit_decision_card(
			ctx,
			agent.rules[0],
			subject=subject,
			title="Kartu uji kedaluwarsa",
			evidence=[
				{
					"label": "Temuan uji",
					"value": "1",
					"source_doctype": "Sentra Agent Rule",
					"source_name": "UJI-EXP",
				}
			],
			options=[{"label": "Tutup kartu", "handler": "close_card", "is_primary": 1}],
			due_by=add_days(today(), due_offset) if due_offset is not None else None,
		)
		return agent, ctx, outcome

	def _status(self, name):
		return frappe.db.get_value(CARD_DOCTYPE, name, "status")

	def test_open_card_past_due_becomes_expired(self):
		_agent, _ctx, outcome = self._card()
		result = runner.expire_overdue_cards()
		self.assertEqual(result["expired"], 1)
		self.assertEqual(self._status(outcome["card"]), contract.STATUS_EXPIRED)

	def test_card_due_today_is_not_expired(self):
		_agent, _ctx, outcome = self._card(subject="tenggat-hari-ini", due_offset=0)
		runner.expire_overdue_cards()
		self.assertEqual(self._status(outcome["card"]), contract.STATUS_OPEN)

	def test_card_without_due_by_is_never_expired(self):
		_agent, _ctx, outcome = self._card(subject="tanpa-tenggat", due_offset=None)
		runner.expire_overdue_cards()
		self.assertEqual(self._status(outcome["card"]), contract.STATUS_OPEN)

	def test_decided_card_past_due_is_untouched(self):
		_agent, _ctx, outcome = self._card(subject="sudah-diputuskan")
		frappe.db.set_value(CARD_DOCTYPE, outcome["card"], "status", contract.STATUS_DECIDED)
		result = runner.expire_overdue_cards()
		self.assertEqual(result["expired"], 0)
		self.assertEqual(self._status(outcome["card"]), contract.STATUS_DECIDED)

	def test_expiry_never_deletes_a_card(self):
		_agent, _ctx, outcome = self._card(subject="tidak-dihapus")
		before = frappe.db.count(CARD_DOCTYPE)
		runner.expire_overdue_cards()
		self.assertEqual(frappe.db.count(CARD_DOCTYPE), before)
		self.assertTrue(frappe.db.exists(CARD_DOCTYPE, outcome["card"]))

	def test_running_the_job_twice_changes_nothing_the_second_time(self):
		_agent, _ctx, outcome = self._card(subject="idempoten")
		first = runner.expire_overdue_cards()
		stamp = frappe.db.get_value(CARD_DOCTYPE, outcome["card"], "modified")
		second = runner.expire_overdue_cards()
		self.assertEqual(first["expired"], 1)
		self.assertEqual(first["cards"], [outcome["card"]])
		self.assertEqual(second["expired"], 0)
		self.assertEqual(second["cards"], [])
		self.assertEqual(frappe.db.get_value(CARD_DOCTYPE, outcome["card"], "modified"), stamp)
		self.assertEqual(self._status(outcome["card"]), contract.STATUS_EXPIRED)

	def test_expiry_records_its_run_in_the_audit_spine(self):
		_agent, _ctx, outcome = self._card(subject="jejak-audit")
		producer = "agents.runner.expire_overdue_cards"
		before = frappe.db.count("Audit Event", {"producer": producer})
		runner.expire_overdue_cards()
		events = frappe.get_all(
			"Audit Event",
			filters={"producer": producer},
			fields=["payload_json"],
			order_by="creation desc",
			limit=1,
		)
		self.assertEqual(frappe.db.count("Audit Event", {"producer": producer}), before + 1)
		payload = json.loads(events[0].payload_json)
		self.assertEqual(payload["expired"], 1)
		# Bukan cuma berapa, tetapi yang mana.
		self.assertEqual(payload["cards"], [outcome["card"]])

	def test_expired_card_stops_suppressing_a_fresh_card(self):
		agent, ctx, first = self._card(subject="kondisi-berlanjut")
		self.assertTrue(frappe.db.exists(CARD_DOCTYPE, first["card"]))
		blocked = contract.emit_decision_card(
			ctx,
			agent.rules[0],
			subject="kondisi-berlanjut",
			title="Kartu uji kedaluwarsa",
			evidence=[
				{
					"label": "Temuan uji",
					"value": "1",
					"source_doctype": "Sentra Agent Rule",
					"source_name": "UJI-EXP",
				}
			],
			options=[{"label": "Tutup kartu", "handler": "close_card", "is_primary": 1}],
		)
		self.assertTrue(blocked["skipped"])

		runner.expire_overdue_cards()

		fresh = contract.emit_decision_card(
			ctx,
			agent.rules[0],
			subject="kondisi-berlanjut",
			title="Kartu uji kedaluwarsa",
			evidence=[
				{
					"label": "Temuan uji",
					"value": "1",
					"source_doctype": "Sentra Agent Rule",
					"source_name": "UJI-EXP",
				}
			],
			options=[{"label": "Tutup kartu", "handler": "close_card", "is_primary": 1}],
		)
		self.assertFalse(fresh["skipped"])
		self.assertNotEqual(fresh["card"], first["card"])
		self.assertEqual(self._status(first["card"]), contract.STATUS_EXPIRED)


class TestSeverityOrdering(FrappeTestCase):
	"""Slot kartu harian direbut berdasar tingkat, bukan urutan tabel/agen
	(perbaikan pasca-Tahap C, temuan 9.9 laporan attack surface)."""

	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		fx.ensure_chamber_access()

	def tearDown(self):
		frappe.db.rollback()

	def _remaining_today(self):
		remaining = contract.MAX_CARDS_PER_DAY - contract.published_today()
		self.assertGreater(remaining, 0, "butuh sisa slot harian untuk menguji batas")
		return remaining

	def test_severity_ordering_within_a_single_agent_run(self):
		remaining = self._remaining_today()
		# `remaining` aturan Perlu Keputusan mengisi TEPAT seluruh sisa slot,
		# dengan SATU aturan Mendesak sengaja ditaruh paling akhir di tabel —
		# urutan tabel lama akan memprosesnya paling belakangan dan karenanya
		# tergeser olehnya.
		routine = [fx.rule(f"UJI-ORD-R{i}", severity="Perlu Keputusan") for i in range(remaining)]
		urgent = fx.rule("UJI-ORD-URGENT", severity="Mendesak")
		agent = fx.make_agent(
			"ORD-SINGLE", rules=[*routine, urgent], max_cards_per_run=remaining + 1
		)
		result = runner.run_agent(agent.name, trigger="Manual")
		self.assertEqual(result["published"], remaining)
		self.assertEqual(result["queued"], 1)

		cards = frappe.get_all(
			CARD_DOCTYPE, filters={"agent": agent.name}, fields=["rule_code", "queued_for_summary"]
		)
		urgent_card = next(c for c in cards if c.rule_code == "UJI-ORD-URGENT")
		self.assertEqual(urgent_card.queued_for_summary, 0)
		queued_rule_codes = {c.rule_code for c in cards if c.queued_for_summary}
		self.assertEqual(len(queued_rule_codes), 1)
		self.assertNotIn("UJI-ORD-URGENT", queued_rule_codes)

		run = frappe.get_doc("Sentra Agent Run", result["run"])
		displaced = json.loads(run.displaced_json)
		self.assertEqual(len(displaced), 1)
		self.assertEqual(displaced[0]["severity"], "Perlu Keputusan")

	def test_severity_ordering_holds_across_agents_in_one_schedule(self):
		remaining = self._remaining_today()
		routine_rules = [
			fx.rule(f"UJI-XAG-R{i}", severity="Perlu Keputusan") for i in range(remaining + 2)
		]
		routine_agent = fx.make_agent(
			"AAA-ROUTINE", rules=routine_rules, schedule="Bulanan", max_cards_per_run=remaining + 2
		)
		urgent_agent = fx.make_agent(
			"ZZZ-URGENT",
			rules=[fx.rule("UJI-XAG-URGENT", severity="Mendesak")],
			schedule="Bulanan",
			max_cards_per_run=5,
		)
		# Alfabet menjamin AAA-ROUTINE diproses SEBELUM ZZZ-URGENT oleh
		# run_schedule (order_by agent_code asc) — pembuktian bahwa agen yang
		# lebih dulu diproses tidak lagi menghabiskan slot lebih dulu.
		self.assertLess(routine_agent.name, urgent_agent.name)

		results = {r["agent"]: r for r in runner.run_schedule("Bulanan", trigger="Manual")}
		self.assertEqual(results[urgent_agent.name]["published"], 1)
		self.assertEqual(results[urgent_agent.name]["queued"], 0)

		urgent_card = frappe.get_all(
			CARD_DOCTYPE, filters={"agent": urgent_agent.name}, fields=["queued_for_summary"]
		)[0]
		self.assertEqual(urgent_card.queued_for_summary, 0)

		routine_cards = frappe.get_all(
			CARD_DOCTYPE, filters={"agent": routine_agent.name}, fields=["queued_for_summary"]
		)
		published_routine = [c for c in routine_cards if not c.queued_for_summary]
		queued_routine = [c for c in routine_cards if c.queued_for_summary]
		self.assertEqual(len(published_routine), remaining - 1)
		self.assertEqual(len(queued_routine), 3)

		run = frappe.get_doc("Sentra Agent Run", results[routine_agent.name]["run"])
		displaced = json.loads(run.displaced_json)
		self.assertEqual(len(displaced), 3)
		self.assertTrue(all(d["severity"] == "Perlu Keputusan" for d in displaced))

	def test_run_under_the_cap_is_unaffected_by_ordering(self):
		"""Ketika seluruh temuan muat di bawah batas harian, urutan tingkat
		tidak mengubah apa pun — semua tetap terbit, tak satu pun tergeser."""
		agent = fx.make_agent(
			"ORD-UNDER",
			rules=[
				fx.rule("UJI-UNDER-A", severity="Informasi"),
				fx.rule("UJI-UNDER-B", severity="Mendesak"),
				fx.rule("UJI-UNDER-C", severity="Perlu Tinjauan"),
			],
			max_cards_per_run=3,
		)
		result = runner.run_agent(agent.name, trigger="Manual")
		self.assertEqual(result["status"], "Selesai")
		self.assertEqual(result["queued"], 0)
		self.assertEqual(result["published"], 3)
		run = frappe.get_doc("Sentra Agent Run", result["run"])
		self.assertIsNone(run.displaced_json)
