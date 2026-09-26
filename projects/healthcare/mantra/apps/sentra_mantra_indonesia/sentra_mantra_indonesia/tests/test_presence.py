"""Profil Publik data-driven: my_today() mengembalikan link milik user sendiri
dari child table User.sentra_profil_links (dipasang sentra_mantra_core.profil_links),
bukan hardcode di HTML."""

import frappe
from frappe.tests.utils import FrappeTestCase

from sentra_mantra_indonesia.home_today import my_today


class TestPresenceLinks(FrappeTestCase):
	def setUp(self):
		frappe.set_user("Administrator")
		self._clear_links("Administrator")

	def tearDown(self):
		self._clear_links("Administrator")
		frappe.set_user("Administrator")
		super().tearDown()

	def _clear_links(self, user):
		frappe.db.delete("Sentra Profil Link", {"parent": user, "parenttype": "User"})
		frappe.clear_document_cache("User", user)

	def _set_links(self, user, rows):
		doc = frappe.get_doc("User", user)
		doc.set("sentra_profil_links", [])
		for r in rows:
			doc.append("sentra_profil_links", r)
		doc.save(ignore_permissions=True)
		frappe.clear_document_cache("User", user)

	def test_my_today_returns_own_links_in_order(self):
		self._set_links(
			"Administrator",
			[
				{"platform": "Website", "label": "contoh.id", "url": "https://contoh.id"},
				{"platform": "LinkedIn", "label": "Admin", "url": "https://linkedin.com/in/admin"},
			],
		)
		out = my_today()
		self.assertIn("presence", out)
		self.assertEqual([p["platform"] for p in out["presence"]], ["Website", "LinkedIn"])
		self.assertEqual(out["presence"][0]["url"], "https://contoh.id")
		self.assertEqual(out["presence"][0]["label"], "contoh.id")

	def test_presence_empty_without_links(self):
		out = my_today()
		self.assertEqual(out["presence"], [])

	def test_presence_drops_non_http_urls(self):
		# baris tampered/legacy langsung ke tabel — melewati validasi form URL;
		# endpoint tetap wajib menyaring skema berbahaya (javascript:)
		frappe.get_doc(
			{
				"doctype": "Sentra Profil Link",
				"parent": "Administrator",
				"parenttype": "User",
				"parentfield": "sentra_profil_links",
				"platform": "Website",
				"url": "javascript:alert(1)",
				"idx": 1,
			}
		).db_insert()
		frappe.get_doc(
			{
				"doctype": "Sentra Profil Link",
				"parent": "Administrator",
				"parenttype": "User",
				"parentfield": "sentra_profil_links",
				"platform": "Medium",
				"url": "https://medium.com/@a",
				"idx": 2,
			}
		).db_insert()
		frappe.clear_document_cache("User", "Administrator")
		out = my_today()
		self.assertEqual([p["platform"] for p in out["presence"]], ["Medium"])
