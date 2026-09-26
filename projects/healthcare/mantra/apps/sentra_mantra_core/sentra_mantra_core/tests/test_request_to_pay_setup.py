"""Versioned request-to-pay roles, fields, and workflows."""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_core.request_to_pay_setup import (
	CUSTOM_FIELDS,
	REQUEST_ROLES,
	WORKFLOW_DEFINITIONS,
	setup,
)
from sentra_mantra_core.tahap2_gate import WORKFLOWS as GL_GATED_WORKFLOWS


class TestRequestToPaySetup(FrappeTestCase):
	def test_setup_is_idempotent_for_roles_and_custom_fields(self):
		"""A second setup run must not duplicate roles or Custom Fields."""
		setup()
		setup()

		for role in REQUEST_ROLES:
			self.assertEqual(frappe.db.count("Role", {"name": role}), 1)

		for doctype, fields in CUSTOM_FIELDS.items():
			for field in fields:
				custom_field_name = f"{doctype}-{field['fieldname']}"
				self.assertEqual(
					frappe.db.count("Custom Field", {"name": custom_field_name}),
					1,
				)

	def test_material_request_fields_match_the_control_contract(self):
		"""Dropping evidence, rationale, or decision fields must fail."""
		setup()
		meta = frappe.get_meta("Material Request", cached=False)

		category = meta.get_field("mantra_request_category")
		self.assertEqual(category.fieldtype, "Select")
		self.assertEqual(
			category.options,
			"\nMedicine\nMedical Supply\nOperational Supply\nService\nOther",
		)
		for fieldname, fieldtype in (
			("mantra_business_reason", "Small Text"),
			("mantra_supporting_document", "Attach"),
			("mantra_finance_review_notes", "Small Text"),
			("mantra_director_decision_notes", "Small Text"),
		):
			self.assertEqual(meta.get_field(fieldname).fieldtype, fieldtype)

	def test_receipt_and_payment_evidence_fields_use_native_links(self):
		"""Replacing native Employee or evidence links with free text must fail."""
		setup()
		receipt_meta = frappe.get_meta("Purchase Receipt", cached=False)
		payment_meta = frappe.get_meta("Payment Entry", cached=False)

		receiver = receipt_meta.get_field("mantra_received_by_employee")
		self.assertEqual(receiver.fieldtype, "Link")
		self.assertEqual(receiver.options, "Employee")
		self.assertEqual(
			receipt_meta.get_field("mantra_receipt_evidence").fieldtype,
			"Attach",
		)
		self.assertEqual(
			payment_meta.get_field("mantra_payment_evidence").fieldtype,
			"Attach",
		)
		self.assertEqual(
			payment_meta.get_field("mantra_execution_reference").fieldtype,
			"Data",
		)

	def test_workflows_have_the_exact_review_chain_and_role_ownership(self):
		"""A bypass transition or requester approval authority must fail."""
		setup()

		for workflow_name, definition in WORKFLOW_DEFINITIONS.items():
			workflow = frappe.get_doc("Workflow", workflow_name)
			self.assertEqual(workflow.document_type, definition["document_type"])
			self.assertEqual(workflow.workflow_state_field, "workflow_state")
			states = {
				row.state: (str(row.doc_status), row.allow_edit)
				for row in workflow.states
			}
			self.assertEqual(
				states,
				{
					"Draft": ("0", "MANTRA Requester"),
					"Finance Review": ("0", "MANTRA Finance Head"),
					"Director Review": ("0", "MANTRA Director"),
					"Approved": ("0", "MANTRA Director"),
					"Rejected": ("0", "MANTRA Requester"),
				},
			)
			transitions = {
				(row.state, row.action, row.next_state, row.allowed)
				for row in workflow.transitions
			}
			self.assertEqual(
				transitions,
				{
					(
						"Draft",
						"Submit for Finance Review",
						"Finance Review",
						"MANTRA Requester",
					),
					(
						"Finance Review",
						"Send to Director Review",
						"Director Review",
						"MANTRA Finance Head",
					),
					(
						"Finance Review",
						"Reject Expenditure",
						"Rejected",
						"MANTRA Finance Head",
					),
					(
						"Director Review",
						"Approve Expenditure",
						"Approved",
						"MANTRA Director",
					),
					(
						"Director Review",
						"Reject Expenditure",
						"Rejected",
						"MANTRA Director",
					),
				},
			)
			self.assertNotIn(
				"MANTRA Requester",
				{
					row.allowed
					for row in workflow.transitions
					if row.next_state == "Approved"
				},
			)

	def test_workflow_setup_is_idempotent(self):
		"""A second setup run must not create duplicate Workflow children."""
		setup()
		first_counts = {
			name: (
				frappe.db.count("Workflow Document State", {"parent": name}),
				frappe.db.count("Workflow Transition", {"parent": name}),
			)
			for name in WORKFLOW_DEFINITIONS
		}

		setup()

		self.assertEqual(
			{
				name: (
					frappe.db.count("Workflow Document State", {"parent": name}),
					frappe.db.count("Workflow Transition", {"parent": name}),
				)
				for name in WORKFLOW_DEFINITIONS
			},
			first_counts,
		)

	def test_every_new_workflow_remains_under_the_tahap2_gate(self):
		"""Leaving a posting workflow outside the Class C gate must fail."""
		self.assertTrue(set(WORKFLOW_DEFINITIONS).issubset(set(GL_GATED_WORKFLOWS)))
