"""Batas agen ditegakkan izin, bukan prompt (spesifikasi §2)."""

import json

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_core.agents import contract, runner
from sentra_mantra_core.agents.permissions import (
	ACTION_SCOPE,
	AgentScopeError,
	action_registry,
	has_decision_card_permission,
)
from sentra_mantra_core.tests import agent_fixtures as fx


class TestAgentReadScope(FrappeTestCase):
	def tearDown(self):
		frappe.db.rollback()

	def test_query_inside_read_scope_is_allowed(self):
		agent = fx.make_agent("SCOPE-OK", read_scope=["Sentra Agent Definition"])
		ctx = fx.context(agent)
		ctx.get_all("Sentra Agent Definition", limit=1)
		self.assertEqual(ctx.violations, [])

	def test_query_outside_read_scope_is_rejected(self):
		agent = fx.make_agent("SCOPE-NO", read_scope=["Sentra Agent Definition"])
		ctx = fx.context(agent)
		with self.assertRaises(AgentScopeError):
			ctx.get_all("Employee", limit=1)
		self.assertEqual(len(ctx.violations), 1)
		self.assertEqual(ctx.violations[0]["kind"], "read_scope")
		self.assertEqual(ctx.violations[0]["target"], "Employee")

	def test_empty_read_scope_blocks_every_doctype(self):
		agent = fx.make_agent("SCOPE-EMPTY")
		ctx = fx.context(agent)
		with self.assertRaises(AgentScopeError):
			ctx.count("Sentra Agent Definition")

	def test_scope_violation_is_recorded_in_agent_run(self):
		agent = fx.make_agent(
			"SCOPE-RUN",
			read_scope=["Sentra Agent Definition"],
			rules=[fx.rule("UJI-OUT-OF-SCOPE", handler_path=fx.OUT_OF_SCOPE_HANDLER)],
		)
		result = runner.run_agent(agent.name, trigger="Manual")
		run = frappe.get_doc("Sentra Agent Run", result["run"])
		self.assertEqual(run.status, "Gagal")
		violations = json.loads(run.violations_json)
		self.assertEqual(len(violations), 1)
		self.assertEqual(violations[0]["kind"], "read_scope")
		self.assertEqual(violations[0]["target"], "Employee")
		self.assertEqual(violations[0]["agent"], agent.name)


class TestAgentActionScope(FrappeTestCase):
	def tearDown(self):
		frappe.db.rollback()

	def test_only_emit_decision_card_is_registered(self):
		self.assertEqual(ACTION_SCOPE, ("emit_decision_card",))
		self.assertEqual(set(action_registry()), {"emit_decision_card"})

	def test_action_outside_scope_is_rejected(self):
		agent = fx.make_agent("ACT-NO")
		ctx = fx.context(agent)
		for forbidden in ("approve_purchase_order", "post_journal_entry", "close_card"):
			with self.assertRaises(AgentScopeError):
				ctx.call_action(forbidden)
		self.assertEqual(len(ctx.violations), 3)
		self.assertTrue(all(v["kind"] == "action_scope" for v in ctx.violations))


class TestDecisionCardVisibility(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		fx.ensure_chamber_access()

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	def _card(self):
		agent = fx.make_agent("VIS", rules=[fx.rule()])
		ctx = fx.context(agent)
		outcome = contract.emit_decision_card(
			ctx,
			agent.rules[0],
			subject="visibility",
			title="Kartu uji visibilitas",
			evidence=[
				{
					"label": "Temuan",
					"value": "1",
					"source_doctype": "Sentra Agent Rule",
					"source_name": agent.rules[0].rule_code,
				}
			],
			options=[{"label": "Tutup kartu", "handler": "close_card", "is_primary": 1}],
		)
		return outcome["card"]

	def test_audience_role_holder_sees_the_card(self):
		name = self._card()
		frappe.set_user(fx.make_user("chamber-chief@example.com", fx.CHIEF_ROLE))
		visible = frappe.get_list(
			"Sentra Decision Card", filters={"name": name}, pluck="name"
		)
		self.assertEqual(visible, [name])

	def test_other_role_does_not_see_the_card(self):
		name = self._card()
		frappe.set_user(fx.make_user("chamber-outsider@example.com", "System Manager"))
		visible = frappe.get_list(
			"Sentra Decision Card", filters={"name": name}, pluck="name"
		)
		self.assertEqual(visible, [])

	def test_other_role_is_denied_on_the_document_itself(self):
		name = self._card()
		doc = frappe.get_doc("Sentra Decision Card", name)
		outsider = fx.make_user("chamber-outsider2@example.com", "System Manager")
		self.assertFalse(has_decision_card_permission(doc, "read", outsider))
		self.assertTrue(
			has_decision_card_permission(
				doc, "read", fx.make_user("chamber-chief2@example.com", fx.CHIEF_ROLE)
			)
		)
