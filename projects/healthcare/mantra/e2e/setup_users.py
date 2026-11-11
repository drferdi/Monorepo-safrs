"""Idempotent E2E user + fixture seed for Beranda persona Playwright (K1).

Password ONLY from env MANTRA_E2E_PASSWORD (ADR-0002). Never print it.

    bench --site mantra.localhost run-file e2e/setup_users.py
"""

from __future__ import annotations

import os

import frappe

COMPANY = "RSIA Melinda"
PASSWORD_ENV = "MANTRA_E2E_PASSWORD"

# Presence link seeded only on e2e-umum (assert positive); others stay empty.
UMUM_PRESENCE = {
	"platform": "Website",
	"label": "E2E Umum",
	"url": "https://example.com/e2e-umum",
}

USERS = (
	{
		"email": "e2e-clinical@mantra.test",
		"first_name": "E2E",
		"last_name": "Clinical",
		"roles": ("Physician", "Employee"),
		"employee_name": "E2E Clinical",
		"need_practitioner": True,
		"presence": None,
	},
	{
		"email": "e2e-hr@mantra.test",
		"first_name": "E2E",
		"last_name": "HR",
		"roles": ("HR User", "Employee"),
		"employee_name": "E2E HR",
		"need_practitioner": False,
		"presence": None,
	},
	{
		"email": "e2e-finance@mantra.test",
		"first_name": "E2E",
		"last_name": "Finance",
		"roles": ("Accounts User", "Employee"),
		"employee_name": "E2E Finance",
		"need_practitioner": False,
		"presence": None,
	},
	{
		"email": "e2e-umum@mantra.test",
		"first_name": "E2E",
		"last_name": "Umum",
		"roles": ("Employee",),
		"employee_name": "E2E Umum",
		"need_practitioner": False,
		"presence": UMUM_PRESENCE,
	},
)


def _password() -> str:
	pw = os.environ.get(PASSWORD_ENV)
	if not pw:
		frappe.throw(
			f"{PASSWORD_ENV} is required and must not be empty (ADR-0002)."
		)
	return pw


def _ensure_user(email: str, first_name: str, last_name: str, roles: tuple[str, ...], password: str):
	if frappe.db.exists("User", email):
		user = frappe.get_doc("User", email)
	else:
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": first_name,
				"last_name": last_name,
				"send_welcome_email": 0,
				"user_type": "System User",
			}
		)
		user.insert(ignore_permissions=True)

	user.enabled = 1
	user.new_password = password
	user.save(ignore_permissions=True)
	for role in roles:
		user.add_roles(role)
	# Drop System Manager if somehow present — would force chief persona.
	if "System Manager" in frappe.get_roles(email):
		user.remove_roles("System Manager")
	frappe.clear_document_cache("User", email)
	return user.name


def _ensure_employee(full_name: str, user_id: str) -> str:
	existing = frappe.db.get_value("Employee", {"user_id": user_id}, "name")
	if existing:
		return existing
	by_name = frappe.db.get_value("Employee", {"employee_name": full_name}, "name")
	if by_name:
		frappe.db.set_value("Employee", by_name, "user_id", user_id)
		return by_name

	emp = frappe.get_doc(
		{
			"doctype": "Employee",
			"first_name": full_name,
			"gender": "Male",
			"date_of_birth": "1990-01-01",
			"date_of_joining": "2024-01-01",
			"company": COMPANY,
			"status": "Active",
			"user_id": user_id,
		}
	)
	emp.insert(ignore_permissions=True)
	return emp.name


def _ensure_practitioner(employee: str, user_id: str, full_name: str) -> str:
	existing = frappe.db.get_value("Healthcare Practitioner", {"user_id": user_id}, "name")
	if existing:
		return existing
	prac = frappe.get_doc(
		{
			"doctype": "Healthcare Practitioner",
			"first_name": full_name,
			"status": "Active",
			"user_id": user_id,
			"employee": employee,
			"practitioner_name": full_name,
		}
	)
	prac.insert(ignore_permissions=True)
	return prac.name


def _set_presence(user_id: str, row: dict | None):
	"""Replace sentra_profil_links: one Website link or empty."""
	doc = frappe.get_doc("User", user_id)
	doc.set("sentra_profil_links", [])
	if row:
		doc.append(
			"sentra_profil_links",
			{
				"platform": row["platform"],
				"label": row["label"],
				"url": row["url"],
			},
		)
	doc.save(ignore_permissions=True)
	frappe.clear_document_cache("User", user_id)


def run():
	"""Entry for run-file / manual execute."""
	password = _password()
	frappe.set_user("Administrator")
	# Ensure Profil Publik child table exists (idempotent).
	try:
		from sentra_mantra_core.profil_links import setup as profil_setup

		profil_setup()
	except Exception as exc:
		frappe.throw(f"profil_links.setup failed: {exc}")

	created = []
	for spec in USERS:
		email = spec["email"]
		_ensure_user(email, spec["first_name"], spec["last_name"], spec["roles"], password)
		emp = _ensure_employee(spec["employee_name"], email)
		if spec["need_practitioner"]:
			_ensure_practitioner(emp, email, spec["employee_name"])
		_set_presence(email, spec["presence"])
		created.append(email)

	frappe.db.commit()
	# Metadata only — never print password.
	return {
		"users": created,
		"chief": "Administrator",
		"password_env": PASSWORD_ENV,
		"presence_seeded_on": "e2e-umum@mantra.test",
	}


if __name__ == "__main__":
	# Direct: PYTHONPATH=/workspace ./env/bin/python e2e/setup_users.py (site must be set)
	print(run())
