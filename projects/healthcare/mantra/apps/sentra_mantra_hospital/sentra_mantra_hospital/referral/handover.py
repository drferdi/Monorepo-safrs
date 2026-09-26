"""Referral handover capture with tariff snapshot and duplicate protection."""

from hashlib import sha256

import frappe
from frappe.utils import getdate, get_datetime

from sentra_mantra_hospital.referral.tariff import match_tariff

INTAKE_ROLES = {"Nursing User"}


def _require_intake_employee(accepted_by_employee: str) -> None:
	roles = set(frappe.get_roles())
	if not roles & INTAKE_ROLES:
		frappe.throw("An authorized clinical intake role is required.", frappe.PermissionError)

	linked_employee = frappe.db.get_value(
		"Employee",
		{"user_id": frappe.session.user, "status": "Active"},
		"name",
	)
	if not linked_employee or linked_employee != accepted_by_employee:
		frappe.throw(
			"Accepted By Employee must be the active Employee linked to the current user.",
			frappe.PermissionError,
		)


def _partner(referral_partner: str):
	rows = frappe.get_list(
		"Referral Partner",
		filters={"name": referral_partner},
		fields=[
			"name",
			"company",
			"active",
			"effective_from",
			"effective_to",
			"agreement_reference",
		],
		limit=1,
	)
	if not rows:
		frappe.throw("Referral Partner is unavailable or not permitted.")
	return rows[0]


def _deduplication_key(
	*, company: str, patient: str, service_date: str, service_line: str
) -> str:
	value = f"{company}|{patient}|{service_date}|{service_line}"
	return sha256(value.encode()).hexdigest()


def _audit_handover(handover) -> None:
	try:
		frappe.get_attr("sentra_mantra_core.audit_registry.record_event")(
			source_app="sentra_mantra_hospital",
			producer="referral.handover.record_handover",
			event_type="Record Change",
			target_doctype="Referral Handover",
			target_name=handover.name,
			payload={
				"eligibility_status": handover.eligibility_status,
				"tariff_rule": handover.tariff_rule,
				"amount": handover.eligible_amount,
			},
		)
	except Exception:
		try:
			frappe.log_error(
				message="Referral handover Audit Event write failed.",
				title="Referral Audit Event",
			)
		except Exception:
			pass


def record_handover(
	*,
	patient: str,
	arrival_at: str,
	accepted_by_employee: str,
	referral_partner: str,
	payer_category: str,
	service_line: str,
	inpatient_class: str | None = None,
	source_reference: str | None = None,
) -> str:
	"""Create one referral handover using a frozen tariff snapshot."""
	if not all(
		(
			patient,
			arrival_at,
			accepted_by_employee,
			referral_partner,
			payer_category,
			service_line,
		)
	):
		frappe.throw("All required referral handover fields must be provided.")
	_require_intake_employee(accepted_by_employee)
	if not frappe.has_permission("Patient", ptype="read", doc=patient):
		frappe.throw("Patient access is not permitted.", frappe.PermissionError)

	arrival = get_datetime(arrival_at)
	service_date = str(getdate(arrival))
	partner = _partner(referral_partner)
	dedupe_key = _deduplication_key(
		company=partner.company,
		patient=patient,
		service_date=service_date,
		service_line=service_line,
	)
	if frappe.db.exists("Referral Handover", {"deduplication_key": dedupe_key}):
		frappe.throw("A referral handover already exists for this service event.")

	exception_reason = None
	tariff = None
	partner_is_effective = (
		partner.active
		and partner.agreement_reference
		and getdate(partner.effective_from) <= getdate(service_date)
		and (
			not partner.effective_to
			or getdate(partner.effective_to) >= getdate(service_date)
		)
	)
	if not partner_is_effective:
		exception_reason = "Referral partner agreement is not effective for the service date."
	else:
		try:
			tariff = match_tariff(
				company=partner.company,
				payer_category=payer_category,
				service_line=service_line,
				inpatient_class=inpatient_class,
				service_date=service_date,
			)
		except frappe.ValidationError:
			exception_reason = "No unique approved tariff matches the handover."

	eligibility_status = "Eligible" if tariff else "Exception"
	handover = frappe.get_doc(
		{
			"doctype": "Referral Handover",
			"patient": patient,
			"arrival_at": arrival,
			"arrival_service_date": service_date,
			"accepted_by_employee": accepted_by_employee,
			"referral_partner": referral_partner,
			"payer_category": payer_category,
			"service_line": service_line,
			"inpatient_class": inpatient_class,
			"tariff_rule": tariff["rule"] if tariff else None,
			"eligible_amount": tariff["amount"] if tariff else 0,
			"eligibility_status": eligibility_status,
			"exception_reason": exception_reason,
			"company": partner.company,
			"source_reference": source_reference,
			"workflow_state": eligibility_status,
			"deduplication_key": dedupe_key,
		}
	).insert()
	_audit_handover(handover)
	return handover.name
