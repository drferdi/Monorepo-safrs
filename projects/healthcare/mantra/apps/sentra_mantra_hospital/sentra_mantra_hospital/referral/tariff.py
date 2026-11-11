"""Permission-aware, deterministic referral tariff matching."""

import frappe
from frappe.utils import flt, getdate


def match_tariff(
	*,
	company: str,
	payer_category: str,
	service_line: str,
	inpatient_class: str | None,
	service_date: str,
) -> dict:
	"""Return the one effective highest-priority tariff or fail closed."""
	if not all((company, payer_category, service_line, service_date)):
		frappe.throw("Company, payer category, service line, and service date are required.")

	match_date = getdate(service_date)
	rows = frappe.get_list(
		"Referral Tariff Rule",
		filters={
			"company": company,
			"payer_category": payer_category,
			"service_line": service_line,
			"active": 1,
			"effective_from": ("<=", match_date),
		},
		fields=[
			"name",
			"amount",
			"effective_from",
			"effective_to",
			"priority",
			"inpatient_class",
		],
		order_by="priority desc, effective_from desc, name asc",
	)

	matches = []
	for row in rows:
		if row.effective_to and getdate(row.effective_to) < match_date:
			continue
		rule_class = (row.inpatient_class or "").strip()
		if service_line == "Inpatient":
			if inpatient_class:
				if rule_class and rule_class != inpatient_class:
					continue
			elif rule_class:
				continue
		elif rule_class:
			continue
		matches.append(row)

	if not matches:
		frappe.throw("No approved referral tariff matches the handover.")

	top_priority = matches[0].priority or 0
	top_matches = [row for row in matches if (row.priority or 0) == top_priority]
	if len(top_matches) != 1:
		frappe.throw("Referral tariff match is ambiguous at the highest priority.")

	selected = top_matches[0]
	return {
		"rule": selected.name,
		"amount": flt(selected.amount),
		"status": "Eligible",
	}
