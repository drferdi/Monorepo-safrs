"""Upload + simpan foto profil milik user login (hasil crop dari /me)."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils.file_manager import save_file

_MAX_BYTES = 5 * 1024 * 1024
_ALLOWED = ("image/jpeg", "image/png", "image/webp")


@frappe.whitelist()
def save_my_avatar():
	"""Terima file crop dari halaman Akun Saya; hanya untuk akun sendiri."""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Login diperlukan untuk mengubah foto profil."), frappe.PermissionError)

	upload = None
	if frappe.request and frappe.request.files:
		upload = frappe.request.files.get("file") or frappe.request.files.get("avatar")
	if not upload:
		frappe.throw(_("File foto wajib diunggah."))

	content_type = (upload.content_type or "").split(";")[0].strip().lower()
	if content_type not in _ALLOWED:
		frappe.throw(_("Format foto harus JPEG, PNG, atau WebP."))

	content = upload.stream.read()
	if not content:
		frappe.throw(_("File foto kosong."))
	if len(content) > _MAX_BYTES:
		frappe.throw(_("Ukuran foto maksimal 5 MB."))

	ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[content_type]
	fname = f"avatar-{frappe.scrub(user)}.{ext}"
	saved = save_file(fname, content, "User", user, is_private=0)
	url = saved.file_url
	frappe.db.set_value("User", user, "user_image", url)

	emp = frappe.db.get_value("Employee", {"user_id": user}, "name")
	if emp:
		frappe.db.set_value("Employee", emp, "image", url)

	frappe.clear_cache(user=user)
	return {"image": url}
