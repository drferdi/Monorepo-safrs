"""SmartHealth Link — "Instalasi Modul SATUSEHAT" (portal step 2).

POST {host}/ssrme/api-dto/v1/shl/get with the patient/practitioner/organization
identity trio returns a link to the patient's national medical record viewer.

Fail-closed everywhere (clinical safety rule): missing patient IHS, no linked
practitioner, practitioner without an IHS, or any API failure raises a
user-facing error — never a fabricated identity and never a partial link. The
request body and the returned link carry personal data and are never logged.

The host defaults to the FHIR base host; MANTRA_SATUSEHAT_SHL_URL overrides it
(e.g. to point at the api-stg sandbox).
"""

from __future__ import annotations

import os
from urllib.parse import urlsplit, urlunsplit

import frappe
from frappe import _

from sentra_mantra_integrations.satusehat.client import (
	SatuSehatClientError,
	SatuSehatConfigError,
	api_post,
	is_configured,
	org_id,
)

SHL_PATH = "/ssrme/api-dto/v1/shl/get"
SHL_URL_ENV = "MANTRA_SATUSEHAT_SHL_URL"
ORG_NAME_ENV = "MANTRA_SATUSEHAT_ORG_NAME"
DEFAULT_ORG_NAME = "RSIA Melinda Kediri"

# Custom field added by sentra_mantra_hospital patch
# add_satusehat_practitioner_ihs — filled manually per doctor by the admin.
PRACTITIONER_IHS_FIELD = "satusehat_ihs"


def _shl_url() -> str:
	override = os.getenv(SHL_URL_ENV)
	if override:
		return override
	base = urlsplit(os.environ["MANTRA_SATUSEHAT_FHIR_BASE"])
	return urlunsplit((base.scheme, base.netloc, SHL_PATH, "", ""))


def _practitioner_for_user(user: str) -> dict:
	rows = frappe.get_all(
		"Healthcare Practitioner",
		filters={"user_id": user},
		fields=["name", "practitioner_name", PRACTITIONER_IHS_FIELD],
		limit=1,
	)
	if not rows:
		frappe.throw(
			_("Akun Anda belum tertaut ke Healthcare Practitioner — SmartHealth Link hanya untuk tenaga kesehatan terdaftar.")
		)
	practitioner = rows[0]
	if not practitioner.get(PRACTITIONER_IHS_FIELD):
		frappe.throw(
			_("Praktisi {0} belum memiliki IHS SATUSEHAT. Isi field 'SATUSEHAT IHS Number' pada Healthcare Practitioner.").format(
				practitioner.get("practitioner_name") or practitioner.get("name")
			)
		)
	return practitioner


@frappe.whitelist()
def get_link(patient: str) -> dict:
	"""SmartHealth link for one Patient, requested as the logged-in practitioner."""
	if not is_configured():
		frappe.throw(_("SATUSEHAT belum dikonfigurasi pada server ini."))

	doc = frappe.get_doc("Patient", patient)
	doc.check_permission("read")
	patient_ihs = doc.get("satusehat_ihs")
	if not patient_ihs:
		frappe.throw(_("Pasien ini belum memiliki IHS SATUSEHAT — SmartHealth Link tidak tersedia."))

	practitioner = _practitioner_for_user(frappe.session.user)
	body = {
		"patient_id": patient_ihs,
		"patient_name": doc.get("patient_name") or doc.name,
		"practitioner_id": practitioner[PRACTITIONER_IHS_FIELD],
		"practitioner_name": practitioner["practitioner_name"],
		"organization_id": org_id(),
		"organization_name": os.getenv(ORG_NAME_ENV) or DEFAULT_ORG_NAME,
	}
	try:
		response = api_post(_shl_url(), body)
	except (SatuSehatClientError, SatuSehatConfigError):
		frappe.throw(_("SATUSEHAT menolak permintaan SmartHealth Link. Coba lagi atau hubungi admin."))

	link = (response or {}).get("data")
	if not (response or {}).get("success") or not link:
		frappe.throw(_("SmartHealth Link tidak tersedia untuk pasien ini."))
	return {"link": link}
