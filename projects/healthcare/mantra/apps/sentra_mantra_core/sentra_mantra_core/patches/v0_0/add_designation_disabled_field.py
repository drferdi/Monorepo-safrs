import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	"""Add a `disabled` flag to Designation (Chief GO 2026-07-15).

	Upstream Designation has no `disabled` field, so generic setup-wizard
	fixtures cannot be deactivated. Fields named exactly `disabled` are
	auto-excluded from Link field search results by Frappe.
	Schema only — flagging the generic fixture records themselves is site
	data, done operationally (fixtures may not exist yet when this patch
	runs on a fresh site).
	"""
	create_custom_fields(
		{
			"Designation": [
				dict(
					fieldname="disabled",
					label="Disabled",
					fieldtype="Check",
					default="0",
					insert_after="description",
				)
			]
		}
	)
