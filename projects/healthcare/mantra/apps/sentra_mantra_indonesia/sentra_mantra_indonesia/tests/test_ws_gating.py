"""Gate endpoint desk — regresi temuan review C3 (F1/F2/F3).

Menghapus gate role/permission dari endpoint ini harus menggagalkan test di
sini, bukan lolos diam-diam (temuan C3-F6).
"""

from unittest import TestCase
from unittest.mock import patch

import frappe

from sentra_mantra_indonesia.profil_karyawan import _may_view_cuti
from sentra_mantra_indonesia.ws_klinik import _appointments
from sentra_mantra_indonesia.ws_pengaturan import _ops_checklist


class TestOpsChecklistGate(TestCase):
	def test_hidden_without_system_manager(self):
		"""Gate GL / mute_emails / SATUSEHAT state tidak bocor ke non-admin (C3-F2)."""
		with patch(
			"sentra_mantra_indonesia.ws_pengaturan.ws_common.has_role", return_value=False
		):
			self.assertEqual(_ops_checklist(), [])

	def test_visible_for_system_manager(self):
		with (
			patch(
				"sentra_mantra_indonesia.ws_pengaturan.ws_common.has_role",
				return_value=True,
			),
			patch(
				"sentra_mantra_indonesia.ws_pengaturan._mute_emails_on",
				return_value=True,
			),
			patch(
				"sentra_mantra_indonesia.ws_pengaturan._gl_gate_closed",
				return_value=True,
			),
			patch(
				"sentra_mantra_indonesia.ws_pengaturan._satusehat_configured",
				return_value=True,
			),
			patch(
				"sentra_mantra_indonesia.ws_pengaturan.frappe.db.sql",
				return_value=[(1,)],
			),
		):
			titles = [i["title"] for i in _ops_checklist()]
		self.assertIn("Gate GL Tahap 2", titles)
		self.assertIn("mute_emails", titles)


class TestAppointmentsPermissionAware(TestCase):
	def test_uses_get_list_not_get_all(self):
		"""patient_name wajib lewat query permission-aware (C3-F1)."""
		row = frappe._dict(
			name="APT-1",
			appointment_time="08:30:00",
			patient_name="X",
			practitioner_name="Y",
			status="Open",
		)
		with (
			patch("sentra_mantra_indonesia.ws_klinik.ws_common.can", return_value=True),
			patch(
				"sentra_mantra_indonesia.ws_klinik.frappe.get_list",
				return_value=[row],
			) as get_list,
		):
			items = _appointments()
		# get_list = query permission-aware; kembali ke get_all = regresi C3-F1.
		get_list.assert_called_once()
		self.assertEqual(get_list.call_args.args[0], "Patient Appointment")
		self.assertEqual(items[0]["title"], "X")

	def test_query_failure_returns_empty(self):
		with (
			patch("sentra_mantra_indonesia.ws_klinik.ws_common.can", return_value=True),
			patch(
				"sentra_mantra_indonesia.ws_klinik.frappe.get_list",
				side_effect=frappe.PermissionError,
			),
		):
			self.assertEqual(_appointments(), [])

	def test_no_permission_empty(self):
		with patch("sentra_mantra_indonesia.ws_klinik.ws_common.can", return_value=False):
			self.assertEqual(_appointments(), [])


class TestHadirStatusFilter(TestCase):
	"""Baris Absent/On Leave tidak boleh terhitung "hadir" (C3-F4)."""

	@staticmethod
	def _attendance_filters(mock):
		return [
			call.args[1]
			for call in mock.call_args_list
			if call.args and call.args[0] == "Attendance"
		]

	def test_ws_sdm_hadir_filters_status(self):
		from sentra_mantra_indonesia import ws_sdm

		with (
			patch("sentra_mantra_indonesia.ws_sdm.ws_common.can", return_value=True),
			patch("sentra_mantra_indonesia.ws_sdm.ws_common.count", return_value=0) as count,
		):
			ws_sdm._cards()
		filters = self._attendance_filters(count)
		self.assertTrue(filters)
		self.assertIn("Present", filters[0]["status"][1])
		self.assertNotIn("Absent", filters[0]["status"][1])

	def test_insights_attendance_gap_filters_status(self):
		from sentra_mantra_indonesia import insights

		with (
			patch("sentra_mantra_indonesia.insights.can", return_value=True),
			patch("sentra_mantra_indonesia.insights.gated_count", return_value=0) as count,
		):
			insights._attendance_gap()
		filters = self._attendance_filters(count)
		self.assertTrue(filters)
		self.assertIn("Present", filters[0]["status"][1])
		self.assertNotIn("Absent", filters[0]["status"][1])

	def test_home_today_tasks_hr_filters_status(self):
		from sentra_mantra_indonesia import home_today

		with (
			patch("sentra_mantra_indonesia.home_today.can", return_value=True),
			patch("sentra_mantra_indonesia.home_today.gated_count", return_value=0) as count,
		):
			home_today._tasks_hr()
		filters = self._attendance_filters(count)
		self.assertTrue(filters)
		self.assertIn("Present", filters[0]["status"][1])
		self.assertNotIn("Absent", filters[0]["status"][1])


class TestSisaCutiGate(TestCase):
	def test_self_may_view(self):
		emp = frappe._dict(user_id="a@x.id")
		with patch("sentra_mantra_indonesia.profil_karyawan.frappe") as fr:
			fr.session.user = "a@x.id"
			self.assertTrue(_may_view_cuti(emp))

	def test_other_without_hr_role_denied(self):
		"""Sisa cuti kolega tidak terlihat sembarang System User (C3-F3)."""
		emp = frappe._dict(user_id="a@x.id")
		with patch("sentra_mantra_indonesia.profil_karyawan.frappe") as fr:
			fr.session.user = "b@x.id"
			fr.get_roles.return_value = ["System User", "Employee"]
			self.assertFalse(_may_view_cuti(emp))

	def test_hr_role_allowed(self):
		emp = frappe._dict(user_id="a@x.id")
		with patch("sentra_mantra_indonesia.profil_karyawan.frappe") as fr:
			fr.session.user = "b@x.id"
			fr.get_roles.return_value = ["HR User"]
			self.assertTrue(_may_view_cuti(emp))
