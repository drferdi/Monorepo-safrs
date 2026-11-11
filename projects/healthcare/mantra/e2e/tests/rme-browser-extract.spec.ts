/**
 * Unit-level failure-path tests for scripts/rme_browser_extract.mjs (task X4).
 * Stub Playwright page objects only — NEVER launches a real browser.
 */
import { expect, test } from "@playwright/test";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

// Dynamic import: Playwright's transpiler mengubah import statis .mjs menjadi
// CJS dan mematahkan `import.meta` di script; native import() tidak.
let findPatientCount: (text: string, diagnostics?: object) => number;
let parseCount: (value: string) => number | null;
let waitForPatientPage: (page: unknown) => Promise<void>;

test.beforeAll(async () => {
  const mod = await import(
    pathToFileURL(
      path.resolve(__dirname, "../../scripts/rme_browser_extract.mjs"),
    ).href
  );
  ({ findPatientCount, parseCount, waitForPatientPage } = mod);
});

function stubPage(passwordFieldCount: number) {
  return {
    locator(selector: string) {
      if (selector.includes('input[type="password"]')) {
        return { count: async () => passwordFieldCount };
      }
      return {
        first: () => ({
          waitFor: async () => undefined,
        }),
      };
    },
  };
}

test.describe("waitForPatientPage", () => {
  test("throws while the login form is still visible", async () => {
    await expect(waitForPatientPage(stubPage(1))).rejects.toThrow(
      /RME login is still required/,
    );
  });

  test("passes once no password field remains", async () => {
    await expect(waitForPatientPage(stubPage(0))).resolves.toBeUndefined();
  });
});

test.describe("findPatientCount", () => {
  test("throws when count candidates are ambiguous (>1 unique match)", () => {
    const text = "Total pasien: 2.180 — showing 1 to 25 of 2.500";
    expect(() => findPatientCount(text, { url: "stub" })).toThrow(
      /unambiguous patient count \(2 candidates\)/,
    );
  });

  test("throws when no candidate is found (0 matches)", () => {
    expect(() => findPatientCount("Selamat datang", {})).toThrow(
      /\(0 candidates\)/,
    );
  });

  test("returns the single unambiguous count", () => {
    expect(findPatientCount("Total pasien: 2.180")).toBe(2180);
  });
});

test.describe("parseCount", () => {
  test("handles Indonesian thousand separators", () => {
    expect(parseCount("2.180")).toBe(2180);
  });

  test("rejects garbage", () => {
    expect(parseCount("abc")).toBeNull();
  });
});
