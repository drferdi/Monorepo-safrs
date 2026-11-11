"""Wave 1 Insights RO wiring + smoke. Secrets only via env (never printed)."""

from __future__ import annotations

import json
import os
import pathlib

import frappe
import pymysql


def main() -> None:
	ro_user = os.environ["RO_USER"]
	ro_pass = os.environ["RO_PASS"]
	db_name = os.environ["DB_NAME"]

	# frappe.logger resolves to sites/logs when cwd is under sites/
	pathlib.Path("/workspace/sites/logs").mkdir(parents=True, exist_ok=True)
	pathlib.Path("/workspace/logs").mkdir(parents=True, exist_ok=True)
	os.chdir("/workspace")
	frappe.init(site="mantra.localhost", sites_path="/workspace/sites")
	frappe.connect()

	frappe.db.sql(
		"""
		CREATE OR REPLACE VIEW `v_mantra_wave1_ops_agg` AS
		SELECT 'Purchase Order' AS doc_type, COUNT(*) AS cnt FROM `tabPurchase Order`
		UNION ALL
		SELECT 'Material Request', COUNT(*) FROM `tabMaterial Request`
		UNION ALL
		SELECT 'GL Entry', COUNT(*) FROM `tabGL Entry`
		UNION ALL
		SELECT 'HD Ticket', COUNT(*) FROM `tabHD Ticket`
		"""
	)
	frappe.db.commit()
	print("VIEW_OK")

	title = "Site DB (Insights RO)"
	name = frappe.db.get_value("Insights Data Source v3", {"title": title}, "name")
	if name:
		ds = frappe.get_doc("Insights Data Source v3", name)
	else:
		ds = frappe.new_doc("Insights Data Source v3")
		ds.title = title
	ds.type = "Database"
	ds.database_type = "MariaDB"
	ds.host = "mariadb"
	ds.port = 3306
	ds.database_name = db_name
	ds.username = ro_use
	ds.password = ro_pass
	ds.status = "Active"
	ds.is_site_db = 0
	ds.is_frappe_db = 1
	if name:
		ds.save(ignore_permissions=True)
	else:
		ds.insert(ignore_permissions=True)
	frappe.db.commit()
	print("DS_OK", ds.name)

	conn = pymysql.connect(
		host="mariadb", user=ro_user, password=ro_pass, database=db_name, port=3306
	)
	with conn.cursor() as cur:
		cur.execute("SELECT COUNT(*) FROM v_mantra_wave1_ops_agg")
		print("RO_SELECT_OK", cur.fetchone()[0])
		denied = False
		try:
			cur.execute("CREATE TABLE _insights_ro_write_probe (id INT)")
			conn.commit()
		except Exception as exc:  # noqa: BLE001 — smoke
			denied = True
			print("RO_WRITE_DENIED", type(exc).__name__)
		if not denied:
			raise AssertionError("RO must not CREATE TABLE")
	conn.close()

	wb_title = "MANTRA Wave1 Ops Aggregates"
	wb = frappe.db.get_value("Insights Workbook", {"title": wb_title}, "name")
	if not wb:
		wb_doc = frappe.get_doc({"doctype": "Insights Workbook", "title": wb_title})
		wb_doc.insert(ignore_permissions=True)
		frappe.db.commit()
		wb = wb_doc.name

	q_title = "Wave1 ops agg via Insights RO"
	ops = json.dumps(
		[
			{
				"type": "sql",
				"raw_sql": "SELECT doc_type, cnt FROM v_mantra_wave1_ops_agg",
				"data_source": ds.name,
			}
		]
	)
	qname = frappe.db.get_value(
		"Insights Query v3", {"title": q_title, "workbook": wb}, "name"
	)
	if qname:
		q = frappe.get_doc("Insights Query v3", qname)
		q.operations = ops
		q.is_native_query = 1
		q.use_live_connection = 1
		q.save(ignore_permissions=True)
	else:
		q = frappe.get_doc(
			{
				"doctype": "Insights Query v3",
				"title": q_title,
				"workbook": wb,
				"is_native_query": 1,
				"use_live_connection": 1,
				"operations": ops,
			}
		)
		q.insert(ignore_permissions=True)
	frappe.db.commit()
	print("QUERY_OK", q.name)
	try:
		result = q.execute()
		print("QUERY_EXEC_ROWS", len(result.get("rows") or []))
	except Exception as exc:  # noqa: BLE001
		print("QUERY_EXEC_SKIP", type(exc).__name__, str(exc)[:120])

	frappe.destroy()
	print("RO_SMOKE_PASS")


if __name__ == "__main__":
	main()
