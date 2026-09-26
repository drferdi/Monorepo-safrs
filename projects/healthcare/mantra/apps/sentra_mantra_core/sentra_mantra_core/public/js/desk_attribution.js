/**
 * Desk footer attribution (Chief 2026-07-17).
 * HTML from boot when available (includes profile / Sentra links).
 */
(() => {
	const FALLBACK =
		'Architected & Built by ' +
		'<a href="https://ferdiiskandar.com" target="_blank" rel="noopener noreferrer">dr Ferdi Iskandar</a> ' +
		'<a href="https://sentrahai.com" target="_blank" rel="noopener noreferrer">Sentra Artificial Intelligence</a>' +
		" - Didukung oleh ERPNext";

	const HTML = (frappe.boot && frappe.boot.sentra_attribution) || FALLBACK;

	function mount() {
		if (document.querySelector(".sentra-attribution")) return;
		const el = document.createElement("div");
		el.className = "sentra-attribution";
		el.setAttribute("role", "contentinfo");
		el.innerHTML = HTML;
		document.body.appendChild(el);
		document.body.classList.add("has-sentra-attribution");
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", mount);
	} else {
		mount();
	}
})();
