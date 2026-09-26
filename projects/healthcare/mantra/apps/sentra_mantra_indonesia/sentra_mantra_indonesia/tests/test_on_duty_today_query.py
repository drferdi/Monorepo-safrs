"""Query contract for the Praktisi Bertugas workspace panel."""

from unittest import TestCase
from unittest.mock import patch

import frappe

from sentra_mantra_indonesia.ws_klinik import data
from sentra_mantra_indonesia.ws_klinik import on_duty_today


class TestOnDutyTodayQuery(TestCase):
	def test_query_failure_is_not_reported_as_an_empty_schedule(self):
		with (
			patch("sentra_mantra_indonesia.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_common.weekday_name", return_value="Monday"),
			patch(
				"sentra_mantra_indonesia.ws_klinik.frappe.db.sql",
				side_effect=RuntimeError("database unavailable"),
			),
		):
			self.assertIsNone(on_duty_today())

	def test_failed_schedule_source_omits_practitioner_panel(self):
		with (
			patch("sentra_mantra_indonesia.ws_klinik.on_duty_today", return_value=None),
			patch("sentra_mantra_indonesia.ws_klinik._appointments", return_value=[]),
			patch("sentra_mantra_indonesia.ws_klinik._cards", return_value=[]),
		):
			payload = data()

		self.assertEqual(
			[panel["title"] for panel in payload["panels"]],
			# Judul panel mengikuti ws_klinik.data() saat ini ("Agenda Appointment",
			# wave 2.1); intinya panel Praktisi Bertugas hilang saat sumber gagal.
			["Agenda Appointment"],
		)

	def test_employee_route_uses_employee_selected_by_roster_query(self):
		row = frappe._dict(
			{
				"practitioner": "PRACT-001",
				"title": "Dokter Uji",
				"employee": "HR-EMP-0001",
				"service_unit": "Poli Uji - MEL",
				"mulai": "08:00:00",
				"selesai": "12:00:00",
			}
		)
		with (
			patch("sentra_mantra_indonesia.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_common.weekday_name", return_value="Monday"),
			patch("sentra_mantra_indonesia.ws_klinik.frappe.db.sql", return_value=[row]),
			patch(
				"sentra_mantra_indonesia.ws_klinik.frappe.db.get_value",
				side_effect=AssertionError("per-practitioner lookup must not run"),
			),
		):
			self.assertEqual(
				on_duty_today(),
				[
					{
						"title": "Dokter Uji",
						"sub": "Poli Uji",
						"right": "08:00–12:00",
						"route": "/app/profil-karyawan?emp=HR-EMP-0001",
					}
				],
			)
