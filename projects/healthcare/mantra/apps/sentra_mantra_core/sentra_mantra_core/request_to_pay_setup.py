"""Idempotent roles, fields, and workflows for MANTRA request-to-pay."""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

REQUEST_ROLES = (
	"MANTRA Requester",
	"MANTRA Pharmacy",
	"MANTRA Finance Head",
	"MANTRA Director",
)

REQUEST_CATEGORIES = (
	"Medicine",
	"Medical Supply",
	"Operational Supply",
	"Service",
	"Other",
)

CUSTOM_FIELDS = {
	"Material Request": [
		{
			"fieldname": "mantra_request_category",
			"label": "MANTRA Request Category",
			"fieldtype": "Select",
			"options": "\n" + "\n".join(REQUEST_CATEGORIES),
			"insert_after": "material_request_type",
		},
		{
			"fieldname": "mantra_business_reason",
			"label": "MANTRA Business Reason",
			"fieldtype": "Small Text",
			"insert_after": "mantra_request_category",
		},
		{
			"fieldname": "mantra_supporting_document",
			"label": "MANTRA Supporting Document",
			"fieldtype": "Attach",
			"insert_after": "mantra_business_reason",
		},
		{
			"fieldname": "mantra_finance_review_notes",
			"label": "MANTRA Finance Review Notes",
			"fieldtype": "Small Text",
			"insert_after": "mantra_supporting_document",
		},
		{
			"fieldname": "mantra_director_decision_notes",
			"label": "MANTRA Director Decision Notes",
			"fieldtype": "Small Text",
			"insert_after": "mantra_finance_review_notes",
		},
	],
	"Purchase Receipt": [
		{
			"fieldname": "mantra_received_by_employee",
			"label": "MANTRA Received By Employee",
			"fieldtype": "Link",
			"options": "Employee",
			"insert_after": "posting_time",
		},
		{
			"fieldname": "mantra_receipt_evidence",
			"label": "MANTRA Receipt Evidence",
			"fieldtype": "Attach",
			"insert_after": "mantra_received_by_employee",
		},
	],
	"Payment Entry": [
		{
			"fieldname": "mantra_payment_evidence",
			"label": "MANTRA Payment Evidence",
			"fieldtype": "Attach",
			"insert_after": "mode_of_payment",
		},
		{
			"fieldname": "mantra_execution_reference",
			"label": "MANTRA Execution Reference",
			"fieldtype": "Data",
			"insert_after": "mantra_payment_evidence",
		},
	],
}

WORKFLOW_STATES = (
	("Draft", "MANTRA Requester"),
	("Finance Review", "MANTRA Finance Head"),
	("Director Review", "MANTRA Director"),
	("Approved", "MANTRA Director"),
	("Rejected", "MANTRA Requester"),
)

WORKFLOW_TRANSITIONS = (
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
)

WORKFLOW_DEFINITIONS = {
	"Sentra Material Request Approval": {"document_type": "Material Request"},
	"Sentra Expense Claim Approval": {"document_type": "Expense Claim"},
	"Sentra Purchase Invoice Approval": {"document_type": "Purchase Invoice"},
}


def setup_roles() -> list[str]:
	"""Create only missing project roles."""
	for role_name in REQUEST_ROLES:
		if not frappe.db.exists("Role", role_name):
			frappe.get_doc(
				{
					"doctype": "Role",
					"role_name": role_name,
					"desk_access": 1,
				}
			).insert(ignore_permissions=True)
	return list(REQUEST_ROLES)


def setup_custom_fields() -> list[str]:
	"""Create or update the versioned MANTRA fields on native DocTypes."""
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=False, update=True)
	for doctype in CUSTOM_FIELDS:
		frappe.clear_cache(doctype=doctype)
	return [
		f"{doctype}-{field['fieldname']}"
		for doctype, fields in CUSTOM_FIELDS.items()
		for field in fields
	]


def _ensure_workflow_masters() -> None:
	for state, _role in WORKFLOW_STATES:
		if not frappe.db.exists("Workflow State", state):
			frappe.get_doc(
				{
					"doctype": "Workflow State",
					"workflow_state_name": state,
					"doc_status": "0",
				}
			).insert(ignore_permissions=True)
	for _state, action, _next_state, _role in WORKFLOW_TRANSITIONS:
		if not frappe.db.exists("Workflow Action Master", action):
			frappe.get_doc(
				{
					"doctype": "Workflow Action Master",
					"workflow_action_name": action,
				}
			).insert(ignore_permissions=True)


def setup_workflows() -> list[str]:
	"""Create or synchronize only the three MANTRA request-to-pay workflows."""
	_ensure_workflow_masters()
	for workflow_name, definition in WORKFLOW_DEFINITIONS.items():
		conflict = frappe.db.get_value(
			"Workflow",
			{
				"document_type": definition["document_type"],
				"is_active": 1,
				"name": ("!=", workflow_name),
			},
			"name",
		)
		if conflict:
			frappe.throw(
				f"Cannot activate {workflow_name}: {conflict} already controls "
				f"{definition['document_type']}."
			)

		if frappe.db.exists("Workflow", workflow_name):
			workflow = frappe.get_doc("Workflow", workflow_name)
		else:
			workflow = frappe.new_doc("Workflow")
			workflow.workflow_name = workflow_name
		workflow.__newname = workflow_name

		workflow.document_type = definition["document_type"]
		workflow.workflow_state_field = "workflow_state"
		workflow.is_active = 1
		workflow.send_email_alert = 0
		workflow.set("states", [])
		for state, edit_role in WORKFLOW_STATES:
			workflow.append(
				"states",
				{
					"state": state,
					# Tahap 2 GL gate remains closed until a separate Class C GO.
					"doc_status": "0",
					"allow_edit": edit_role,
				},
			)
		workflow.set("transitions", [])
		for state, action, next_state, allowed in WORKFLOW_TRANSITIONS:
			workflow.append(
				"transitions",
				{
					"state": state,
					"action": action,
					"next_state": next_state,
					"allowed": allowed,
				},
			)
		workflow.save(ignore_permissions=True)
	return list(WORKFLOW_DEFINITIONS)


def setup() -> dict:
	"""Apply the request-to-pay setup reproducibly."""
	result = {
		"roles": setup_roles(),
		"custom_fields": setup_custom_fields(),
		"workflows": setup_workflows(),
	}
	frappe.db.commit()
	return result
