import frappe

# Exact docnames of the 31 generic ERPNext setup-wizard fixture Designations
# (Chief GO 2026-07-15). Real RSIA Melinda designations are never in this list.
GENERIC_DESIGNATIONS = [
	"Accountant",
	"Administrative Assistant",
	"Administrative Officer",
	"Analyst",
	"Associate",
	"Business Analyst",
	"Business Development Manager",
	"Consultant",
	"Chief Executive Officer",
	"Chief Financial Officer",
	"Chief Operating Officer",
	"Chief Technology Officer",
	"Customer Service Representative",
	"Designer",
	"Engineer",
	"Executive Assistant",
	"Finance Manager",
	"HR Manager",
	"Head of Marketing and Sales",
	"Manager",
	"Managing Director",
	"Marketing Manager",
	"Marketing Specialist",
	"President",
	"Product Manager",
	"Project Manager",
	"Researcher",
	"Sales Representative",
	"Secretary",
	"Software Developer",
	"Vice President",
]


def execute():
	"""Deactivate the generic setup-wizard Designation fixtures.

	Data-fix companion to add_designation_disabled_field (which is already
	recorded in Patch Log and therefore never re-runs). Idempotent: exact-match
	on the 31 names only, skips names that don't exist yet (a fresh site may
	not have run setup_complete()), and only writes when disabled != 1.
	"""
	if not frappe.get_meta("Designation").get_field("disabled"):
		return
	for name in GENERIC_DESIGNATIONS:
		if frappe.db.exists("Designation", name) and not frappe.db.get_value(
			"Designation", name, "disabled"
		):
			frappe.db.set_value("Designation", name, "disabled", 1)
