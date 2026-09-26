"""Blok Chamber — visibilitas per audience_role dan eksekusi opsi oleh manusia."""

import json

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, today

from sentra_mantra_core import chamber_desk
from sentra_mantra_core.agents import contract, runner
from sentra_mantra_core.tests import agent_fixtures as fx

CARD_DOCTYPE = "Sentra Decision Card"


class TestChamberDesk(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		# Kedua fixture ini melakukan commit; keduanya HARUS dipanggil dari
		# setUpClass, tempat belum ada apa pun milik tes yang menggantung.
		# Memanggilnya dari badan tes akan ikut mem-commit kartu yang dibuat
		# setUp, dan kartu yang lolos rollback itu menabrak batas 7 per hari.
		fx.ensure_chamber_access()
		fx.ensure_probe_role()

	def setUp(self):
		self.agent = fx.make_agent("CHAMBER", rules=[fx.rule("UJI-CHAMBER")])
		self.card = runner.run_agent(self.agent.name, trigger="Manual")
		self.card_name = frappe.get_all(
			CARD_DOCTYPE, filters={"agent": self.agent.name}, pluck="name"
		)[0]

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	def _titles(self):
		return [c["code"] for c in chamber_desk.my_chamber()["cards"]]

	# -- visibilitas --------------------------------------------------------

	def test_non_desk_user_is_rejected(self):
		email = fx.make_user("chamber-web@example.com")
		frappe.db.set_value("User", email, "user_type", "Website User")
		frappe.set_user(email)
		with self.assertRaises(frappe.PermissionError):
			chamber_desk.my_chamber()

	def test_audience_role_holder_sees_the_card_in_the_chamber(self):
		frappe.set_user(fx.make_user("chamber-chief3@example.com", fx.CHIEF_ROLE))
		self.assertIn(self.card_name, self._titles())

	def test_other_role_sees_an_empty_chamber(self):
		frappe.set_user(fx.make_user("chamber-outsider3@example.com", "System Manager"))
		self.assertNotIn(self.card_name, self._titles())

	def test_queued_card_is_not_shown_but_is_counted(self):
		frappe.db.set_value(CARD_DOCTYPE, self.card_name, "queued_for_summary", 1)
		frappe.set_user(fx.make_user("chamber-chief4@example.com", fx.CHIEF_ROLE))
		chamber = chamber_desk.my_chamber()
		self.assertNotIn(self.card_name, [c["code"] for c in chamber["cards"]])
		self.assertGreaterEqual(chamber["queued"], 1)

	def test_chamber_card_carries_its_options_and_severity(self):
		frappe.set_user(fx.make_user("chamber-chief5@example.com", fx.CHIEF_ROLE))
		card = next(c for c in chamber_desk.my_chamber()["cards"] if c["code"] == self.card_name)
		self.assertEqual(card["severity"], "Informasi")
		self.assertEqual([o.label for o in card["options"]][0], "Tutup kartu")

	# -- eksekusi opsi ------------------------------------------------------

	def test_option_handler_runs_as_the_human_who_pressed_it(self):
		chief = fx.make_user("chamber-chief6@example.com", fx.CHIEF_ROLE)
		frappe.set_user(chief)
		chamber_desk.decide(self.card_name, "Tutup kartu")
		card = frappe.get_doc(CARD_DOCTYPE, self.card_name)
		self.assertEqual(card.status, contract.STATUS_DECIDED)
		self.assertEqual(card.decided_by, chief)
		self.assertIsNotNone(card.decided_at)

	def test_user_outside_the_audience_role_cannot_decide(self):
		frappe.set_user(fx.make_user("chamber-outsider4@example.com", "System Manager"))
		with self.assertRaises(frappe.PermissionError):
			chamber_desk.decide(self.card_name, "Tutup kartu")
		self.assertEqual(
			frappe.db.get_value(CARD_DOCTYPE, self.card_name, "status"), "Terbuka"
		)

	def test_option_requiring_a_note_refuses_an_empty_note(self):
		frappe.set_user(fx.make_user("chamber-chief7@example.com", fx.CHIEF_ROLE))
		with self.assertRaises(frappe.ValidationError):
			chamber_desk.decide(self.card_name, "Tunda dan minta klarifikasi")

	def test_option_requiring_a_note_extends_the_deadline_with_one(self):
		frappe.set_user(fx.make_user("chamber-chief8@example.com", fx.CHIEF_ROLE))
		chamber_desk.decide(
			self.card_name, "Tunda dan minta klarifikasi", note="Menunggu data farmasi"
		)
		card = frappe.get_doc(CARD_DOCTYPE, self.card_name)
		self.assertEqual(card.status, "Terbuka")
		self.assertEqual(card.decision_note, "Menunggu data farmasi")
		self.assertIsNotNone(card.due_by)

	def test_unknown_option_is_refused(self):
		frappe.set_user(fx.make_user("chamber-chief9@example.com", fx.CHIEF_ROLE))
		with self.assertRaises(frappe.ValidationError):
			chamber_desk.decide(self.card_name, "Setujui pembayaran")

	def test_decided_card_leaves_the_open_chamber_list(self):
		frappe.set_user(fx.make_user("chamber-chief10@example.com", fx.CHIEF_ROLE))
		self.assertIn(self.card_name, self._titles())
		chamber_desk.decide(self.card_name, "Tutup kartu")
		self.assertNotIn(self.card_name, self._titles())

	def test_deciding_an_already_decided_card_is_rejected(self):
		frappe.set_user(fx.make_user("chamber-chief11@example.com", fx.CHIEF_ROLE))
		chamber_desk.decide(self.card_name, "Tutup kartu")
		first_decision = frappe.db.get_value(
			CARD_DOCTYPE, self.card_name, ["decided_by", "decided_at"], as_dict=True
		)
		with self.assertRaises(frappe.ValidationError):
			chamber_desk.decide(self.card_name, "Tutup kartu")
		self.assertEqual(
			frappe.db.get_value(
				CARD_DOCTYPE, self.card_name, ["decided_by", "decided_at"], as_dict=True
			),
			first_decision,
		)

	def test_expired_card_cannot_be_decided(self):
		frappe.db.set_value(CARD_DOCTYPE, self.card_name, "status", contract.STATUS_EXPIRED)
		frappe.set_user(fx.make_user("chamber-chief12@example.com", fx.CHIEF_ROLE))
		with self.assertRaises(frappe.ValidationError):
			chamber_desk.decide(self.card_name, "Tutup kartu")

	def test_handler_name_sent_by_the_client_is_never_honoured(self):
		"""Klien hanya mengirim label opsi; handler diambil dari kartu."""
		frappe.set_user(fx.make_user("chamber-chief13@example.com", fx.CHIEF_ROLE))
		with self.assertRaises(frappe.ValidationError):
			chamber_desk.decide(self.card_name, "close_card")
		self.assertEqual(
			frappe.db.get_value(CARD_DOCTYPE, self.card_name, "status"), contract.STATUS_OPEN
		)

	def test_unregistered_handler_stored_on_the_card_is_rejected(self):
		option = frappe.get_doc(CARD_DOCTYPE, self.card_name).options[0]
		frappe.db.set_value("Sentra Decision Option", option.name, "handler", "erpnext.approve_po")
		frappe.set_user(fx.make_user("chamber-chief14@example.com", fx.CHIEF_ROLE))
		with self.assertRaises(frappe.ValidationError):
			chamber_desk.decide(self.card_name, "Tutup kartu")
		self.assertEqual(
			frappe.db.get_value(CARD_DOCTYPE, self.card_name, "status"), contract.STATUS_OPEN
		)

	def test_option_payload_carries_the_flags_the_buttons_need(self):
		frappe.set_user(fx.make_user("chamber-chief15@example.com", fx.CHIEF_ROLE))
		card = next(c for c in chamber_desk.my_chamber()["cards"] if c["code"] == self.card_name)
		defer = next(o for o in card["options"] if o.label == "Tunda dan minta klarifikasi")
		self.assertEqual(defer.requires_note, 1)
		self.assertEqual(defer.is_destructive, 0)
		self.assertEqual(
			next(o for o in card["options"] if o.label == "Tutup kartu").is_primary, 1
		)

	def test_expired_card_leaves_the_chamber(self):
		frappe.db.set_value(CARD_DOCTYPE, self.card_name, "status", contract.STATUS_EXPIRED)
		frappe.set_user(fx.make_user("chamber-chief16@example.com", fx.CHIEF_ROLE))
		self.assertNotIn(self.card_name, self._titles())

	# -- penghitung kartu kedaluwarsa di kepala blok ------------------------

	def _probe_card(self):
		"""Kartu beraudiens peran uji — angka di kepala Chamber jadi murni milik tes ini."""
		agent = fx.make_agent(
			"CHAMBER-EXP", rules=[fx.rule("UJI-EXP-KEPALA")], audience_role=fx.PROBE_ROLE
		)
		runner.run_agent(agent.name, trigger="Manual")
		return frappe.get_all(CARD_DOCTYPE, filters={"agent": agent.name}, pluck="name")[0]

	def test_expired_counter_shows_zero_cleanly_when_nothing_expired(self):
		frappe.set_user(fx.make_user("chamber-probe1@example.com", fx.PROBE_ROLE))
		recent = chamber_desk.my_chamber()["expired_recent"]
		self.assertEqual(recent["count"], 0)
		self.assertEqual(recent["days"], chamber_desk.EXPIRED_WINDOW_DAYS)
		self.assertIn("sentra-decision-card", recent["href"])

	def test_expired_counter_counts_recent_cards_and_links_to_them(self):
		name = self._probe_card()
		frappe.db.set_value(CARD_DOCTYPE, name, "due_by", add_days(today(), -1))
		runner.expire_overdue_cards()
		frappe.set_user(fx.make_user("chamber-probe2@example.com", fx.PROBE_ROLE))
		recent = chamber_desk.my_chamber()["expired_recent"]
		self.assertEqual(recent["count"], 1)
		self.assertIn("sentra-decision-card", recent["href"])
		self.assertIn(contract.STATUS_EXPIRED, recent["href"])

	def test_expired_counter_respects_the_audience_role_gate(self):
		frappe.db.set_value(CARD_DOCTYPE, self.card_name, "due_by", add_days(today(), -1))
		runner.expire_overdue_cards()
		frappe.set_user(fx.make_user("chamber-outsider5@example.com", "System Manager"))
		self.assertEqual(chamber_desk.my_chamber()["expired_recent"]["count"], 0)

	def test_queued_count_respects_the_audience_role_gate(self):
		frappe.db.set_value(CARD_DOCTYPE, self.card_name, "queued_for_summary", 1)
		frappe.set_user(fx.make_user("chamber-outsider6@example.com", "System Manager"))
		self.assertEqual(chamber_desk.my_chamber()["queued"], 0)
		frappe.set_user("Administrator")
		frappe.set_user(fx.make_user("chamber-chief19@example.com", fx.CHIEF_ROLE))
		self.assertGreaterEqual(chamber_desk.my_chamber()["queued"], 1)


class TestChamberBlockPlacement(FrappeTestCase):
	"""Blok Chamber di dasar workspace Home, tanpa mengusik blok app lain."""

	def tearDown(self):
		frappe.db.rollback()

	def _content(self):
		return json.loads(
			frappe.db.get_value("Workspace", chamber_desk.WORKSPACE, "content") or "[]"
		)

	def _other_blocks(self, content):
		return [b for b in content if not chamber_desk._is_chamber_block(b)]

	def test_block_is_appended_after_all_existing_blocks(self):
		before = self._other_blocks(self._content())
		chamber_desk.install_block()
		after = self._content()
		self.assertTrue(chamber_desk._is_chamber_block(after[-1]))
		self.assertEqual(self._other_blocks(after), before)

	def test_existing_blocks_are_never_reordered_or_removed(self):
		before = self._other_blocks(self._content())
		self.assertTrue(before, "workspace Home harus punya blok lain untuk diuji")
		chamber_desk.install_block()
		self.assertEqual(self._other_blocks(self._content()), before)

	def test_installing_twice_does_not_duplicate_or_move_the_block(self):
		chamber_desk.install_block()
		first = self._content()
		chamber_desk.install_block()
		second = self._content()
		self.assertEqual(first, second)
		self.assertEqual(sum(1 for b in second if chamber_desk._is_chamber_block(b)), 1)
		self.assertTrue(chamber_desk._is_chamber_block(second[-1]))
