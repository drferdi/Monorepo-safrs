import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("../e2e/node_modules/@playwright/test");

const RME_BASE_URL = process.env.MANTRA_RME_WEB_URL || "https://simrs.melinda.co.id";
const RME_PATIENT_PATH = process.env.MANTRA_RME_PATIENT_PATH || "/pasien";
const MANTRA_COMPOSE_FILE = ".devcontainer/docker-compose.yml";
const MANTRA_SITE = "mantra.localhost";
const USER_DATA_DIR =
	process.env.MANTRA_RME_BROWSER_PROFILE ||
	path.join(os.homedir(), "AppData", "Local", "SentraMANTRA", "rme-browser-profile");

export function parseCount(value) {
	const normalized = value.replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(/,(?=\d{3}(?:\D|$))/g, "");
	const count = Number.parseInt(normalized, 10);
	return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function findPatientCount(text, diagnostics = {}) {
	const patterns = [
		/\b(?:total|jumlah)\s*(?:pasien|patient)?\s*[:\-]?\s*([\d.,]+)/gi,
		/\bshowing\s+\d+\s+to\s+\d+\s+of\s+([\d.,]+)/gi,
		/\b([\d.,]+)\s+(?:pasien|patients)\b/gi,
	];
	const candidates = [];
	for (const pattern of patterns) {
		for (const match of text.matchAll(pattern)) {
			const count = parseCount(match[1]);
			if (count !== null) candidates.push(count);
		}
	}
	const unique = [...new Set(candidates)];
	if (unique.length !== 1) {
		throw new Error(
			`Could not determine one unambiguous patient count (${unique.length} candidates): ${JSON.stringify(diagnostics)}`,
		);
	}
	return unique[0];
}

async function visibleTableRowCount(page) {
	return page.locator("table tbody tr:visible").count();
}

export async function waitForPatientPage(page) {
	const loginFields = await page.locator('input[type="password"]').count();
	if (loginFields) {
		throw new Error("RME login is still required; no snapshot was written.");
	}
	await page.locator("table tbody tr").first().waitFor({ state: "visible", timeout: 30_000 });
}

async function findPatientCountFromPagination(page) {
	const numericPages = await page.locator(".pagination .page-link").evaluateAll((links) => {
		const values = links
			.map((link) => Number.parseInt((link.textContent || "").trim(), 10))
			.filter((value) => Number.isSafeInteger(value) && value > 0);
		return [...new Set(values)].sort((a, b) => a - b);
	});
	if (!numericPages.length) {
		return null;
	}

	let total = 0;
	const rowsByPage = [];
	for (const pageNumber of numericPages) {
		const link = page.locator(".pagination .page-link", { hasText: String(pageNumber) }).first();
		if (await link.count()) {
			await link.click();
			await page.waitForLoadState("networkidle").catch(() => {});
			await page.waitForTimeout(400);
		}
		const rows = await visibleTableRowCount(page);
		rowsByPage.push({ page: pageNumber, rows });
		total += rows;
	}
	if (total <= 0) {
		throw new Error(`Pagination was present but no visible patient rows were counted: ${JSON.stringify(rowsByPage)}`);
	}
	return { total, rowsByPage };
}

function writeSnapshot(total) {
	const kwargs = JSON.stringify({
		source_kind: "browser_ui",
		entity: "patient",
		total_records: total,
		connection_label: `${RME_BASE_URL}${RME_PATIENT_PATH}`,
		notes: "Browser-assisted read-only RME count snapshot",
	});
	const result = execFileSync(
		"docker",
		[
			"compose",
			"-f",
			MANTRA_COMPOSE_FILE,
			"exec",
			"-T",
			"frappe",
			"bench",
			"--site",
			MANTRA_SITE,
			"execute",
			"sentra_mantra_integrations.rme_bridge.staging.record_aggregate_snapshot",
			"--kwargs",
			kwargs,
		],
		{ encoding: "utf8" },
	);
	return result.trim();
}

async function main() {
	const chromePath = process.env.MANTRA_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const browser = await chromium.launchPersistentContext(USER_DATA_DIR, { headless: false, executablePath: chromePath });
	try {
		const page = browser.pages()[0] || (await browser.newPage());
		await page.goto(`${RME_BASE_URL}/settings/account`, { waitUntil: "domcontentloaded" });
		await page.waitForFunction(
			() => !document.querySelector('form[action$="/login"] input[type="password"]'),
			undefined,
			{ timeout: 300_000 },
		);
		await page.goto(`${RME_BASE_URL}${RME_PATIENT_PATH}`, { waitUntil: "networkidle" });
		await waitForPatientPage(page);
		const bodyText = await page.locator("body").innerText();
		let total;
		let evidence;
		let textCountError;
		try {
			total = findPatientCount(bodyText, {
				url: page.url(),
				title: await page.title(),
				table_rows: await visibleTableRowCount(page),
			});
			evidence = { mode: "text_total" };
		} catch (error) {
			textCountError = error;
			const pagination = await findPatientCountFromPagination(page);
			if (!pagination) throw textCountError;
			total = pagination.total;
			evidence = { mode: "pagination_rows", rows_by_page: pagination.rowsByPage };
		}
		const batchOutput = writeSnapshot(total);
		console.log(JSON.stringify({ total, source: "browser_ui", evidence, batch: batchOutput }));
	} finally {
		await browser.close();
	}
}

// Guard: hanya jalan saat dieksekusi langsung (node scripts/rme_browser_extract.mjs),
// supaya test bisa import fungsi di atas tanpa membuka browser (task X4).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
