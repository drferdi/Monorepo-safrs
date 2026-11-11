// SmartHealth Link (Instalasi Modul SATUSEHAT): open the patient's national
// medical record viewer from the Patient form. The button only appears when
// the patient already has an IHS; every other precondition (linked
// practitioner, practitioner IHS, API availability) fails closed server-side
// with a clear message. The returned link is opened, never stored or logged.
frappe.ui.form.on("Patient", {
	refresh(frm) {
		if (frm.is_new() || !frm.doc.satusehat_ihs) return;
		frm.add_custom_button(__("SATUSEHAT Integration"), () => {
			frappe.call({
				method: "sentra_mantra_integrations.satusehat.smarthealth.get_link",
				args: { patient: frm.doc.name },
				freeze: true,
				freeze_message: __("Meminta SmartHealth Link dari SATUSEHAT..."),
				callback(r) {
					if (r.message && r.message.link) {
						window.open(r.message.link, "_blank", "noopener");
					}
				},
			});
		});
	},
});
